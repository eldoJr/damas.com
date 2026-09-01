import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "./gameStore";
import type { Move } from "./gameStore";
import type { PieceColor } from "../../../shared/types";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:4000";

/** Convert time-control label (e.g. "5 min", "10 min", "1 min", "Sem lim.") to seconds. */
function parseTimeLabel(label: string): number {
  if (!label || label === "Sem lim." || label === "∞") return 0;
  const m = label.match(/(\d+)/);
  return m ? parseInt(m[1], 10) * 60 : 0;
}

export type SocketPhase = "idle" | "waiting" | "matchmaking" | "playing" | "draw-offered" | "finished";

interface SocketState {
  socket:       Socket | null;
  roomId:       string | null;
  seat:         "white" | "black" | null;
  phase:        SocketPhase;
  opponentName: string | null;
  timeSeconds:  number;   // 0 = unlimited
  connect:         (roomId: string, token: string | null) => void;
  disconnect:      () => void;
  sendMove:        (move: Move) => void;
  sendResign:      () => void;
  sendDrawOffer:   () => void;
  sendDrawAccept:  () => void;
  sendDrawDecline: () => void;
  joinQueue:       (timeControl: string, elo?: number) => void;
  leaveQueue:      () => void;
  ensureSocket:    (token: string | null) => Socket;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket:       null,
  roomId:       null,
  seat:         null,
  phase:        "idle",
  opponentName: null,
  timeSeconds:  0,

  ensureSocket(token) {
    const existing = get().socket;
    if (existing?.connected) return existing;
    const prev = existing;
    if (prev) prev.disconnect();
    const socket = io(SOCKET_URL, {
      auth: token ? { token } : {},
      transports: ["websocket"],
    });
    set({ socket });
    return socket;
  },

  joinQueue(timeControl, elo) {
    const token = localStorage.getItem("token");
    const socket = get().ensureSocket(token);
    set({ phase: "matchmaking", roomId: null, seat: null });

    const doJoin = () => socket.emit("join_queue", { timeControl, elo });
    if (socket.connected) doJoin();
    else socket.once("connect", doJoin);

    socket.off("queue_joined");
    socket.off("match_found");

    socket.on("queue_joined", () => set({ phase: "matchmaking" }));

    socket.on("match_found", ({ roomId, seat, timeControl }: { roomId: string; seat: "white" | "black"; timeControl: string }) => {
      // Parse seconds from timeControl label (e.g. "5 min" → 300, "10 min" → 600, "Sem lim." → 0)
      const parsed = parseTimeLabel(timeControl);
      set({ roomId, seat, phase: "waiting", timeSeconds: parsed });
      socket.emit("join_room", roomId);
    });
  },

  leaveQueue() {
    const { socket } = get();
    if (socket) {
      socket.emit("leave_queue");
      socket.off("queue_joined");
      socket.off("match_found");
    }
    set({ phase: "idle" });
  },

  connect(roomId, token) {
    const { socket: existing, roomId: existingRoom, seat: existingSeat } = get();

    // Coming from matchmaking: socket already connected and seat already assigned
    if (existing?.connected && existingRoom === roomId && existingSeat) {
      // Re-register all game event listeners on the existing socket
      const socket = existing;
      set({ roomId });

      socket.on("seat_assigned", ({ seat }: { seat: "white" | "black" }) => set({ seat }));
      socket.on("waiting_for_opponent", () => set({ phase: "waiting" }));

      socket.on("game_start", ({ usernames }: { usernames: [string | null, string | null] }) => {
        const { seat } = get();
        const opponentName = seat === "white" ? (usernames[1] ?? "Visitante") : (usernames[0] ?? "Visitante");
        set({ phase: "playing", opponentName });
        useGameStore.getState().init();
      });

      socket.on("opponent_move", ({ move }: { move: Move }) => {
        useGameStore.getState().applyMove(move);
      });

      socket.on("draw_offered",  () => set({ phase: "draw-offered" }));
      socket.on("draw_declined", () => set({ phase: "playing" }));

      socket.on("game_over", ({ result, winner }: { result: string; winner?: string }) => {
        set({ phase: "finished" });
        const store = useGameStore.getState();
        if (store.status === "finished") return;
        if (result === "draw") { store.offerDraw(); }
        else { const loserColor: PieceColor = winner === "white" ? "dark" : "light"; store.resign(loserColor); }
      });

      socket.on("opponent_disconnected", () => {
        set({ phase: "finished" });
        const { seat } = get();
        const opponentColor: PieceColor = seat === "white" ? "dark" : "light";
        useGameStore.getState().resign(opponentColor);
      });

      return;
    }

    // Fresh connection (friend room or direct URL)
    const prev = existing;
    if (prev) prev.disconnect();

    set({ roomId });

    const socket = io(SOCKET_URL, {
      auth: token ? { token } : {},
      transports: ["websocket"],
    });

    set({ socket });

    socket.on("connect", () => {
      socket.emit("join_room", roomId);
    });

    socket.on("connect_error", (err) => {
      console.error("[socket] connect_error", err.message);
    });

    socket.on("seat_assigned", ({ seat }: { seat: "white" | "black" }) => {
      set({ seat });
    });

    socket.on("waiting_for_opponent", () => {
      set({ phase: "waiting" });
    });

    socket.on("game_start", ({ usernames }: { usernames: [string | null, string | null] }) => {
      // Read seat from current state — not a closure
      const { seat } = get();
      const opponentName = seat === "white" ? (usernames[1] ?? "Visitante") : (usernames[0] ?? "Visitante");
      set({ phase: "playing", opponentName });
      // Fresh board for both players
      useGameStore.getState().init();
    });

    socket.on("opponent_move", ({ move }: { move: Move }) => {
      useGameStore.getState().applyMove(move);
    });

    socket.on("draw_offered", () => {
      set({ phase: "draw-offered" });
    });

    socket.on("draw_declined", () => {
      set({ phase: "playing" });
    });

    socket.on("game_over", ({ result, winner }: { result: string; winner?: string }) => {
      set({ phase: "finished" });
      const store = useGameStore.getState();
      // Only update gameStore if it hasn't already resolved the game locally
      if (store.status === "finished") return;
      if (result === "draw") {
        store.offerDraw();
      } else {
        // winner = "white" | "black" — resign the loser
        const loserColor: PieceColor = winner === "white" ? "dark" : "light";
        store.resign(loserColor);
      }
    });

    socket.on("opponent_disconnected", () => {
      set({ phase: "finished" });
      const { seat } = get();
      // Opponent left — we win, resign their color
      const opponentColor: PieceColor = seat === "white" ? "dark" : "light";
      useGameStore.getState().resign(opponentColor);
    });
  },

  disconnect() {
    const { socket } = get();
    if (socket) socket.disconnect();
    set({ socket: null, roomId: null, seat: null, phase: "idle", opponentName: null });
    // Note: timeSeconds intentionally NOT reset here — Game.tsx reads it on mount
  },

  sendMove(move) {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;
    socket.emit("move", { roomId, move });
  },

  sendResign() {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;
    socket.emit("resign", roomId);
  },

  sendDrawOffer() {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;
    socket.emit("draw_offer", roomId);
  },

  sendDrawAccept() {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;
    socket.emit("draw_accept", roomId);
  },

  sendDrawDecline() {
    const { socket, roomId } = get();
    if (!socket || !roomId) return;
    socket.emit("draw_decline", roomId);
  },
}));
