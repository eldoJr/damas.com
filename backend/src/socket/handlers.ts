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

const rooms = new Map<string, RoomMeta>();

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

    /* ── join_room ── */
    socket.on("join_room", (roomId: string) => {
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
        io.to(roomId).emit("game_start", {
          roomId,
          usernames: room.usernames,   // [white_username, black_username]
        });
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
