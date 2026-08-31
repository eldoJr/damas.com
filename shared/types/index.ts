export type PieceColor = "light" | "dark";
export type PieceType = "man" | "king";

export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  row: number;
  col: number;
}

export interface GameState {
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  status: "waiting" | "playing" | "finished";
  winner: PieceColor | null;
}

export interface Room {
  id: string;
  players: string[];
  gameState: GameState;
}
