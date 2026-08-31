import { create } from "zustand";
import type { Piece, PieceColor } from "../../../shared/types";

export type { Piece, PieceColor };

export interface Move {
  from: [number, number];
  to:   [number, number];
  captured: [number, number][];  // squares of captured pieces
  promoted: boolean;
}

export interface HistoryEntry {
  notation: string;   // e.g. "e3-d4" or "e3xd4"
  color: PieceColor;
}

export interface DrawConfig {
  /** Moves without capture or promotion before draw. Default: 40. */
  noCaptureLimit: number;
  /** Repetitions of the same position before draw. Default: 3. */
  repetitionLimit: number;
  /** When a player has no legal moves: "win" (opponent wins) or "draw". Default: "win". */
  noMovesResult: "win" | "draw";
}

export const DEFAULT_DRAW_CONFIG: DrawConfig = {
  noCaptureLimit:  40,
  repetitionLimit: 3,
  noMovesResult:   "win",
};

export interface CheckersState {
  board:       (Piece | null)[][];
  currentTurn: PieceColor;
  status:      "waiting" | "playing" | "finished";
  winner:      PieceColor | null;
  drawReason:  string | null;
  selected:    Piece | null;
  validMoves:  Move[];
  chainPiece:  Piece | null;
  history:     HistoryEntry[];
  halfMoves:   number;
  positions:   string[];
  drawConfig:  DrawConfig;
}

// ─── Board helpers ────────────────────────────────────────────────────────────

export function buildInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  let id = 0;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 !== 0)
        board[r][c] = { id: `d${id++}`, color: "dark",  type: "man", row: r, col: c };
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 !== 0)
        board[r][c] = { id: `l${id++}`, color: "light", type: "man", row: r, col: c };
  return board;
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(row => row.map(p => p ? { ...p } : null));
}

export function boardFingerprint(board: (Piece | null)[][], turn: PieceColor): string {
  return turn + "|" + board.flat().map(p =>
    p ? `${p.color[0]}${p.type[0]}${p.row}${p.col}` : "."
  ).join("");
}

// ─── Move generation ──────────────────────────────────────────────────────────

/** All capture moves for a single piece (recursive multi-jump). */
function getCapturesForPiece(
  piece: Piece,
  board: (Piece | null)[][],
  captured: [number, number][] = []
): Move[] {
  const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const results: Move[] = [];

  for (const [dr, dc] of dirs) {
    if (piece.type === "man") {
      // Men only capture in their forward direction
      const forward = piece.color === "light" ? -1 : 1;
      if (dr !== forward) continue;
    }

    if (piece.type === "king") {
      // Flying king: scan along diagonal until blocked
      // Find the first enemy piece on this ray, then check the squares beyond it
      let r = piece.row + dr;
      let c = piece.col + dc;
      let enemyPos: [number, number] | null = null;

      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const sq = board[r][c];
        if (sq) {
          if (sq.color === piece.color) break; // own piece blocks
          if (captured.some(([cr, cc]) => cr === r && cc === c)) break; // already captured
          enemyPos = [r, c];
          break;
        }
        r += dr;
        c += dc;
      }

      if (!enemyPos) continue;

      // All empty squares beyond the enemy piece are valid landing squares
      let lr = enemyPos[0] + dr;
      let lc = enemyPos[1] + dc;
      while (lr >= 0 && lr <= 7 && lc >= 0 && lc <= 7 && board[lr][lc] === null) {
        const newCaptured: [number, number][] = [...captured, enemyPos];
        const promoted = false; // kings stay kings

        const tmpBoard = cloneBoard(board);
        tmpBoard[piece.row][piece.col] = null;
        tmpBoard[enemyPos[0]][enemyPos[1]] = null;
        const movedPiece: Piece = { ...piece, row: lr, col: lc };
        tmpBoard[lr][lc] = movedPiece;

        const further = getCapturesForPiece(movedPiece, tmpBoard, newCaptured);

        if (further.length > 0) {
          for (const f of further) {
            results.push({
              from:     [piece.row, piece.col],
              to:       f.to,
              captured: newCaptured.concat(f.captured.slice(newCaptured.length)),
              promoted,
            });
          }
        } else {
          results.push({
            from:     [piece.row, piece.col],
            to:       [lr, lc],
            captured: newCaptured,
            promoted,
          });
        }
        lr += dr;
        lc += dc;
      }
    } else {
      // Man capture: exactly 2 squares
      const mr = piece.row + dr;
      const mc = piece.col + dc;
      const lr = piece.row + dr * 2;
      const lc = piece.col + dc * 2;

      if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
      const mid = board[mr]?.[mc];
      if (!mid || mid.color === piece.color) continue;
      if (captured.some(([r, c]) => r === mr && c === mc)) continue;
      if (board[lr][lc] !== null) continue;

      const newCaptured: [number, number][] = [...captured, [mr, mc]];
      const promoted =
        (piece.color === "light" && lr === 0) ||
        (piece.color === "dark"  && lr === 7);

      const tmpBoard = cloneBoard(board);
      tmpBoard[piece.row][piece.col] = null;
      tmpBoard[mr][mc] = null;
      const movedPiece: Piece = {
        ...piece, row: lr, col: lc,
        type: promoted ? "king" : piece.type,
      };
      tmpBoard[lr][lc] = movedPiece;

      const further = promoted ? [] : getCapturesForPiece(movedPiece, tmpBoard, newCaptured);

      if (further.length > 0) {
        for (const f of further) {
          results.push({
            from:     [piece.row, piece.col],
            to:       f.to,
            captured: newCaptured.concat(f.captured.slice(newCaptured.length)),
            promoted: f.promoted,
          });
        }
      } else {
        results.push({
          from:     [piece.row, piece.col],
          to:       [lr, lc],
          captured: newCaptured,
          promoted,
        });
      }
    }
  }
  return results;
}

/** All simple (non-capture) moves for a piece. */
function getSimpleMoves(piece: Piece, board: (Piece | null)[][]): Move[] {
  const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const moves: Move[] = [];

  for (const [dr, dc] of dirs) {
    if (piece.type === "man") {
      const forward = piece.color === "light" ? -1 : 1;
      if (dr !== forward) continue;
      const r = piece.row + dr;
      const c = piece.col + dc;
      if (r >= 0 && r <= 7 && c >= 0 && c <= 7 && board[r][c] === null) {
        moves.push({
          from:     [piece.row, piece.col],
          to:       [r, c],
          captured: [],
          promoted: (piece.color === "light" && r === 0) || (piece.color === "dark" && r === 7),
        });
      }
    } else {
      // Flying king: slide any number of squares along diagonal
      let r = piece.row + dr;
      let c = piece.col + dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7 && board[r][c] === null) {
        moves.push({
          from:     [piece.row, piece.col],
          to:       [r, c],
          captured: [],
          promoted: false,
        });
        r += dr;
        c += dc;
      }
    }
  }
  return moves;
}

/** All legal moves for a color. Captures are mandatory. */
export function getAllMoves(color: PieceColor, board: (Piece | null)[][]): Move[] {
  const pieces = board.flat().filter((p): p is Piece => p !== null && p.color === color);
  const captures = pieces.flatMap(p => getCapturesForPiece(p, board));
  if (captures.length > 0) return captures;
  return pieces.flatMap(p => getSimpleMoves(p, board));
}

/** Legal moves for a specific piece (respects mandatory capture). */
export function getMovesForPiece(piece: Piece, board: (Piece | null)[][]): Move[] {
  const allForColor = getAllMoves(piece.color, board);
  // If any captures exist, only show captures for this piece
  const hasCaptures = allForColor.some(m => m.captured.length > 0);
  if (hasCaptures) {
    return allForColor.filter(m =>
      m.from[0] === piece.row && m.from[1] === piece.col && m.captured.length > 0
    );
  }
  return allForColor.filter(m => m.from[0] === piece.row && m.from[1] === piece.col);
}

// ─── Apply move ───────────────────────────────────────────────────────────────

export function applyMove(board: (Piece | null)[][], move: Move): (Piece | null)[][] {
  const b = cloneBoard(board);
  const piece = b[move.from[0]][move.from[1]]!;
  b[move.from[0]][move.from[1]] = null;
  for (const [r, c] of move.captured) b[r][c] = null;
  const promoted =
    move.promoted ||
    (piece.color === "light" && move.to[0] === 0) ||
    (piece.color === "dark"  && move.to[0] === 7);
  b[move.to[0]][move.to[1]] = {
    ...piece,
    row:  move.to[0],
    col:  move.to[1],
    type: promoted ? "king" : piece.type,
  };
  return b;
}

// ─── Notation ─────────────────────────────────────────────────────────────────

const COL_LETTERS = ["a","b","c","d","e","f","g","h"];

function toNotation(move: Move): string {
  const from = `${COL_LETTERS[move.from[1]]}${8 - move.from[0]}`;
  const to   = `${COL_LETTERS[move.to[1]]}${8 - move.to[0]}`;
  return move.captured.length > 0 ? `${from}x${to}` : `${from}-${to}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface GameStore extends CheckersState {
  init:        (config?: Partial<DrawConfig>) => void;
  selectPiece: (piece: Piece) => void;
  applyMove:   (move: Move) => void;
  clickSquare: (row: number, col: number) => void;
  resign:      (color: PieceColor) => void;
  offerDraw:   () => void;
}

const INITIAL = (config?: Partial<DrawConfig>): CheckersState => ({
  board:       buildInitialBoard(),
  currentTurn: "dark",
  status:      "playing",
  winner:      null,
  drawReason:  null,
  selected:    null,
  validMoves:  [],
  chainPiece:  null,
  history:     [],
  halfMoves:   0,
  positions:   [],
  drawConfig:  { ...DEFAULT_DRAW_CONFIG, ...config },
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL(),

  init(config) {
    set(INITIAL(config));
  },

  selectPiece(piece) {
    const { currentTurn, board, status, chainPiece } = get();
    if (status !== "playing") return;
    if (piece.color !== currentTurn) return;
    // During a capture chain, only the chained piece can be selected
    if (chainPiece && (chainPiece.row !== piece.row || chainPiece.col !== piece.col)) return;
    const moves = getMovesForPiece(piece, board);
    set({ selected: piece, validMoves: moves });
  },

  applyMove(move) {
    const { board, currentTurn, history, halfMoves, positions, drawConfig } = get();
    const newBoard   = applyMove(board, move);
    const isCapture  = move.captured.length > 0;
    // Check if the piece was actually promoted (either flagged or reached back rank)
    const landingPiece = newBoard[move.to[0]][move.to[1]]!;
    const wasPromoted  = move.promoted || landingPiece.type === "king" && board[move.from[0]][move.from[1]]?.type === "man";
    const newHalf    = isCapture || wasPromoted ? 0 : halfMoves + 1;
    const nextTurn   = currentTurn === "light" ? "dark" : "light";
    const newPos     = boardFingerprint(newBoard, nextTurn);
    const newPositions = [...positions, newPos];

    const furtherCaptures = isCapture
      ? getCapturesForPiece(landingPiece, newBoard)
      : [];

    const notation = toNotation(move);
    const newHistory: HistoryEntry[] = [...history, { notation, color: currentTurn }];

    // Draw: no-capture/no-promotion rule (threshold in full moves × 2 half-moves)
    if (newHalf >= drawConfig.noCaptureLimit * 2) {
      set({ board: newBoard, status: "finished", winner: null, drawReason: `Empate — Sem Captura ou Promoção (${drawConfig.noCaptureLimit} lances)`, history: newHistory, selected: null, validMoves: [], chainPiece: null, halfMoves: newHalf, positions: newPositions });
      return;
    }

    // Draw: threefold repetition
    const repCount = newPositions.filter(p => p === newPos).length;
    if (repCount >= drawConfig.repetitionLimit) {
      set({ board: newBoard, status: "finished", winner: null, drawReason: "Empate — Repetição de Posição", history: newHistory, selected: null, validMoves: [], chainPiece: null, halfMoves: newHalf, positions: newPositions });
      return;
    }

    // Continue capture chain
    if (furtherCaptures.length > 0) {
      set({
        board:       newBoard,
        history:     newHistory,
        halfMoves:   newHalf,
        positions:   newPositions,
        selected:    landingPiece,
        validMoves:  furtherCaptures,
        chainPiece:  landingPiece,
      });
      return;
    }

    // Check no legal moves for next player
    const nextMoves = getAllMoves(nextTurn, newBoard);
    if (nextMoves.length === 0) {
      if (drawConfig.noMovesResult === "draw") {
        set({ board: newBoard, currentTurn: nextTurn, status: "finished", winner: null, drawReason: "Empate — Sem Movimentos Legais", history: newHistory, selected: null, validMoves: [], chainPiece: null, halfMoves: newHalf, positions: newPositions });
      } else {
        set({ board: newBoard, currentTurn: nextTurn, status: "finished", winner: currentTurn, drawReason: null, history: newHistory, selected: null, validMoves: [], chainPiece: null, halfMoves: newHalf, positions: newPositions });
      }
      return;
    }

    set({
      board:       newBoard,
      currentTurn: nextTurn,
      status:      "playing",
      winner:      null,
      drawReason:  null,
      selected:    null,
      validMoves:  [],
      chainPiece:  null,
      history:     newHistory,
      halfMoves:   newHalf,
      positions:   newPositions,
    });
  },

  clickSquare(row, col) {
    const { selected, validMoves, board, status } = get();
    if (status !== "playing") return;

    // Click on a valid destination
    if (selected) {
      const move = validMoves.find(m => m.to[0] === row && m.to[1] === col);
      if (move) { get().applyMove(move); return; }
    }

    // Click on a piece
    const piece = board[row][col];
    if (piece) get().selectPiece(piece);
    else set({ selected: null, validMoves: [] });
  },

  resign(color) {
    set({ status: "finished", winner: color === "light" ? "dark" : "light", drawReason: null });
  },

  offerDraw() {
    set({ status: "finished", winner: null, drawReason: "Empate acordado" });
  },
}));
