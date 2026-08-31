import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "./gameStore";
import type { Move } from "./gameStore";
import type { PieceColor } from "../../../shared/types";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:4000";

export type SocketPhase = "idle" | "waiting" | "playing" | "draw-offered" | "finished";

interface SocketState {
  socket:       Socket | null;
  roomId:       string | null;
  seat:         "white" | "black" | null;
  phase:        SocketPhase;
  opponentName: string | null;
  connect:         (roomId: string, token: string | null) => void;
  disconnect:      () => void;
  sendMove:        (move: Move) => void;
  sendResign:      () => void;
  sendDrawOffer:   () => void;
  sendDrawAccept:  () => void;
  sendDrawDecline: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket:       null,
  roomId:       null,
  seat:         null,
  phase:        "idle",
  opponentName: null,

  connect(roomId, token) {
    // Tear down any existing connection first
    const prev = get().socket;
    if (prev) prev.disconnect();

    // Store roomId immediately — do NOT reset seat/phase here
    set({ roomId });

    const socket = io(SOCKET_URL, {
      auth: token ? { token } : {},
      transports: ["websocket"],
    });

    // Store socket reference as soon as it's created
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
