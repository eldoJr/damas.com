import type { Piece, PieceColor } from "../../../shared/types";
import { getAllMoves, applyMove, cloneBoard, type Move } from "./gameStore";

export type BotLevel = "easy" | "medium" | "hard" | "master";

const DEPTH: Record<BotLevel, number> = {
  easy:   1,
  medium: 2,
  hard:   4,
  master: 6,
};

// ─── Evaluation ───────────────────────────────────────────────────────────────

function evaluate(board: (Piece | null)[][], color: PieceColor): number {
  let score = 0;
  for (const piece of board.flat()) {
    if (!piece) continue;
    const sign  = piece.color === color ? 1 : -1;
    const value = piece.type === "king" ? 3 : 1;
    // Positional bonus: center control
    const centerBonus = (3 - Math.abs(piece.col - 3.5)) * 0.05
                      + (3 - Math.abs(piece.row - 3.5)) * 0.05;
    // Advancement bonus for men
    const advBonus = piece.type === "man"
      ? (piece.color === "dark" ? piece.row : 7 - piece.row) * 0.04
      : 0;
    score += sign * (value + centerBonus + advBonus);
  }
  return score;
}

// ─── Minimax with alpha-beta ──────────────────────────────────────────────────

function minimax(
  board: (Piece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  botColor: PieceColor,
): number {
  const currentColor: PieceColor = maximizing ? botColor : (botColor === "dark" ? "light" : "dark");
  const moves = getAllMoves(currentColor, board);

  if (depth === 0 || moves.length === 0) return evaluate(board, botColor);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyMove(board, move);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false, botColor));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const next = applyMove(board, move);
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, true, botColor));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the best move for the bot, or null if no moves available. */
export function getBotMove(
  board: (Piece | null)[][],
  botColor: PieceColor,
  level: BotLevel,
): Move | null {
  const moves = getAllMoves(botColor, board);
  if (moves.length === 0) return null;

  // Easy: random move
  if (level === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = DEPTH[level];
  let bestMove = moves[0];
  let bestScore = -Infinity;

  // Shuffle for variety at same score
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffled) {
    const next  = applyMove(board, move);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false, botColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove  = move;
    }
  }
  return bestMove;
}
