import { Server, Socket } from "socket.io";
import { supabase } from "../config/supabase";
import { verifyToken } from "../config/jwt";

interface RoomMeta {
  players:   [string | null, string | null]; // socket ids [white, black]
  userIds:   [string | null, string | null];
  usernames: [string | null, string | null];
  timeControl: string;
  finished:  boolean;
}

interface QueueEntry {
  socketId: string;
  userId:   string | null;
  username: string | null;
  elo:      number;
  joinedAt: number;
}

const rooms = new Map<string, RoomMeta>();
// key = timeControl string (e.g. "5+0"), value = queue of waiting players
const queues = new Map<string, QueueEntry[]>();

function dequeue(socketId: string) {
  for (const [key, q] of queues) {
    const idx = q.findIndex(e => e.socketId === socketId);
    if (idx !== -1) { q.splice(idx, 1); if (q.length === 0) queues.delete(key); return; }
  }
}

function getRoomOrCreate(roomId: string): RoomMeta {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { players: [null, null], userIds: [null, null], usernames: [null, null], timeControl: "5+0", finished: false });
  }
  return rooms.get(roomId)!;
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    let currentRoom: string | null = null;
    let seatIndex: 0 | 1 | null   = null;

    // Authenticate optional JWT
    const token = socket.handshake.auth?.token as string | undefined;
    let userId:   string | null = null;
    let username: string | null = null;
    if (token) {
      try {
        const payload = verifyToken(token);
        userId   = payload.sub;
        username = payload.username;
      } catch { /* guest */ }
    }

    /* ── join_queue: matchmaking ── */
    socket.on("join_queue", ({ timeControl, elo }: { timeControl: string; elo?: number }) => {
      dequeue(socket.id); // remove from any previous queue
      const entry: QueueEntry = { socketId: socket.id, userId, username, elo: elo ?? 1200, joinedAt: Date.now() };
      const q = queues.get(timeControl) ?? [];
      queues.set(timeControl, q);

      // Find best opponent: closest ELO, or first in queue if guest
      const opponentIdx = q.reduce((best, e, i) => {
        if (best === -1) return i;
        return Math.abs(e.elo - entry.elo) < Math.abs(q[best].elo - entry.elo) ? i : best;
      }, -1);

      if (opponentIdx !== -1) {
        const opponent = q.splice(opponentIdx, 1)[0];
        if (q.length === 0) queues.delete(timeControl);

        const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
        // Randomly assign colors
        const [white, black] = Math.random() < 0.5
          ? [opponent, entry]
          : [entry, opponent];

        rooms.set(roomId, {
          players:     [white.socketId, black.socketId],
          userIds:     [white.userId,   black.userId],
          usernames:   [white.username, black.username],
          timeControl,
          finished:    false,
        });

        // Tell both players which room and seat they got
        io.to(white.socketId).emit("match_found", { roomId, seat: "white", timeControl });
        io.to(black.socketId).emit("match_found", { roomId, seat: "black", timeControl });
      } else {
        q.push(entry);
        socket.emit("queue_joined", { timeControl });
      }
    });

    socket.on("leave_queue", () => {
      dequeue(socket.id);
      socket.emit("queue_left");
    });

    /* ── join_room ── */
    socket.on("join_room", (roomId: string) => {
      const existingRoom = rooms.get(roomId);

      // Matchmaking pre-created room: find which seat this socket was assigned
      if (existingRoom) {
        const preassigned = existingRoom.players.indexOf(socket.id) as 0 | 1 | -1;
        if (preassigned !== -1) {
          // Socket was pre-assigned by matchmaking
          seatIndex   = preassigned as 0 | 1;
          currentRoom = roomId;
          socket.join(roomId);
          socket.emit("seat_assigned", { seat: seatIndex === 0 ? "white" : "black", roomId });
          // Count how many pre-assigned players have now joined
          const joined = (existingRoom as any)._joined = ((existingRoom as any)._joined ?? 0) + 1;
          if (joined >= 2) {
            io.to(roomId).emit("game_start", { roomId, usernames: existingRoom.usernames });
          }
          return;
        }
      }

      // Manual room (friend invite) — create if needed
      const room = getRoomOrCreate(roomId);

      if (!room.players[0]) {
        room.players[0]   = socket.id;
        room.userIds[0]   = userId;
        room.usernames[0] = username;
        seatIndex = 0;
      } else if (!room.players[1] && room.players[0] !== socket.id) {
        room.players[1]   = socket.id;
        room.userIds[1]   = userId;
        room.usernames[1] = username;
        seatIndex = 1;
      } else {
        socket.join(roomId);
        socket.emit("joined_as_spectator", { roomId });
        return;
      }

      currentRoom = roomId;
      socket.join(roomId);
      socket.emit("seat_assigned", { seat: seatIndex === 0 ? "white" : "black", roomId });

      if (room.players[0] && room.players[1]) {
        io.to(roomId).emit("game_start", { roomId, usernames: room.usernames });
      } else {
        socket.emit("waiting_for_opponent");
      }
    });

    /* ── move: relay full move object to opponent ── */
    socket.on("move", (payload: { roomId: string; move: unknown }) => {
      socket.to(payload.roomId).emit("opponent_move", { move: payload.move });
    });

    /* ── game_over from client (automatic win/draw detection) ── */
    socket.on("game_over", async (payload: { roomId: string; result: "win" | "draw"; winner?: "white" | "black"; drawReason?: string }) => {
      const room = rooms.get(payload.roomId);
      if (!room) return;
      // Only the first game_over per room triggers save + broadcast (prevent double-save)
      if (room.finished) return;
      room.finished = true;
      io.to(payload.roomId).emit("game_over", payload);
      const winnerIdx = payload.winner === "white" ? 0 : payload.winner === "black" ? 1 : null;
      await saveResult(payload.roomId, winnerIdx, room, payload.drawReason ?? null);
    });

    /* ── draw_offer ── */
    socket.on("draw_offer", (roomId: string) => {
      socket.to(roomId).emit("draw_offered");
    });

    socket.on("draw_accept", async (roomId: string) => {
      io.to(roomId).emit("game_over", { result: "draw" });
      await saveResult(roomId, null, rooms.get(roomId), "Empate acordado");
    });

    socket.on("draw_decline", (roomId: string) => {
      socket.to(roomId).emit("draw_declined");
    });

    /* ── resign ── */
    socket.on("resign", async (roomId: string) => {
      const room = rooms.get(roomId);
      if (!room || room.finished) return;
      room.finished = true;
      const winnerIdx = room.players[0] === socket.id ? 1 : 0;
      io.to(roomId).emit("game_over", { result: "resign", winner: winnerIdx === 0 ? "white" : "black" });
      await saveResult(roomId, winnerIdx, room, null);
    });

    /* ── disconnect ── */
    socket.on("disconnect", () => {
      dequeue(socket.id); // remove from matchmaking queue if waiting
      if (!currentRoom || seatIndex === null) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      room.players[seatIndex]   = null;
      room.userIds[seatIndex]   = null;
      room.usernames[seatIndex] = null;
      socket.to(currentRoom).emit("opponent_disconnected");
      if (!room.players[0] && !room.players[1]) rooms.delete(currentRoom);
    });
  });
}

/* ── Persist result to Supabase ── */
async function saveResult(
  roomId: string,
  winnerIdx: number | null,
  room: RoomMeta | undefined,
  drawReason: string | null
): Promise<void> {
  if (!room) return;
  try {
    await supabase.from("games").insert({
      white_id:     room.userIds[0],
      black_id:     room.userIds[1],
      winner_id:    winnerIdx !== null ? room.userIds[winnerIdx] : null,
      draw_reason:  drawReason,
      time_control: room.timeControl,
      ended_at:     new Date().toISOString(),
    });

    for (const [i, uid] of room.userIds.entries()) {
      if (!uid) continue;
      const isWinner = winnerIdx === i;
      const isDraw   = winnerIdx === null;
      await supabase.rpc("update_player_stats", {
        p_user_id: uid,
        p_win:     isWinner,
        p_loss:    !isWinner && !isDraw,
        p_draw:    isDraw,
      });
    }
  } catch (err) {
    console.error("saveResult error:", err);
  }
}
