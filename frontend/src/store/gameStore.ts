import { create } from "zustand";
import type { GameState, Piece } from "../../../shared/types";

function buildInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  let id = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        board[r][c] = { id: `d${id++}`, color: "dark", type: "man", row: r, col: c };
      }
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        board[r][c] = { id: `l${id++}`, color: "light", type: "man", row: r, col: c };
      }
    }
  }
  return board;
}

const INITIAL_STATE: GameState = {
  board: buildInitialBoard(),
  currentTurn: "light",
  status: "playing",
  winner: null,
};

interface GameStore {
  gameState: GameState;
  selectedPiece: Piece | null;
  validMoves: Array<{ row: number; col: number }>;
  selectPiece: (piece: Piece) => void;
  movePiece: (row: number, col: number) => void;
}

function getValidMoves(piece: Piece, board: (Piece | null)[][]): Array<{ row: number; col: number }> {
  const dir = piece.color === "light" ? -1 : 1;
  const dirs = piece.type === "king" ? [-1, 1] : [dir];
  const moves: Array<{ row: number; col: number }> = [];

  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const nr = piece.row + dr;
      const nc = piece.col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
        moves.push({ row: nr, col: nc });
      }
      // capture
      const jr = piece.row + dr * 2;
      const jc = piece.col + dc * 2;
      if (
        jr >= 0 && jr < 8 && jc >= 0 && jc < 8 &&
        board[nr]?.[nc]?.color !== piece.color && board[nr]?.[nc] &&
        !board[jr][jc]
      ) {
        moves.push({ row: jr, col: jc });
      }
    }
  }
  return moves;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: INITIAL_STATE,
  selectedPiece: null,
  validMoves: [],

  selectPiece(piece) {
    const { gameState } = get();
    if (piece.color !== gameState.currentTurn) return;
    const moves = getValidMoves(piece, gameState.board);
    set({ selectedPiece: piece, validMoves: moves });
  },

  movePiece(row, col) {
    const { selectedPiece, validMoves, gameState } = get();
    if (!selectedPiece) return;
    const isValid = validMoves.some(m => m.row === row && m.col === col);
    if (!isValid) return;

    const board = gameState.board.map(r => [...r]);
    board[selectedPiece.row][selectedPiece.col] = null;

    // capture
    const dr = row - selectedPiece.row;
    const dc = col - selectedPiece.col;
    if (Math.abs(dr) === 2) {
      board[selectedPiece.row + dr / 2][selectedPiece.col + dc / 2] = null;
    }

    const isKing = selectedPiece.type === "king" ||
      (selectedPiece.color === "light" && row === 0) ||
      (selectedPiece.color === "dark" && row === 7);

    board[row][col] = { ...selectedPiece, row, col, type: isKing ? "king" : "man" };

    set({
      gameState: {
        ...gameState,
        board,
        currentTurn: gameState.currentTurn === "light" ? "dark" : "light",
      },
      selectedPiece: null,
      validMoves: [],
    });
  },
}));
