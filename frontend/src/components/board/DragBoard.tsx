import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RiVipCrownLine } from "react-icons/ri";
import styles from "./DragBoard.module.css";
import { useGameStore, type Move } from "@/store/gameStore";
import type { Piece, PieceColor } from "../../../../shared/types";

interface DragBoardProps {
  playerColor?: PieceColor;
  flipped?: boolean;
  disabled?: boolean;
  onMove?: (move: Move) => void;
}

const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["8","7","6","5","4","3","2","1"];

function DragGhost({ color, isKing, x, y, size }: {
  color: PieceColor; isKing: boolean; x: number; y: number; size: number;
}) {
  return (
    <div
      className={styles.ghost}
      style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}
    >
      <div className={[
        styles.ghostPiece,
        color === "light" ? styles.pLight : styles.pDark,
        isKing ? styles.pKing : "",
        isKing ? styles.ghostPieceKing : "",
      ].join(" ")}>
        {isKing && <RiVipCrownLine className={styles.ghostCrown} />}
      </div>
    </div>
  );
}

export function DragBoard({ playerColor, flipped = false, disabled = false, onMove }: DragBoardProps) {
  const { board, selected, validMoves, status, selectPiece, applyMove: storeApply } = useGameStore();

  const boardRef   = useRef<HTMLDivElement>(null);
  const dragId     = useRef<string | null>(null);
  const dragOrigin = useRef<{ row: number; col: number } | null>(null);
  const [ghost, setGhost]         = useState<{ piece: Piece; x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [sq, setSq] = useState(70);

  useEffect(() => {
    const update = () => {
      if (boardRef.current) setSq(boardRef.current.getBoundingClientRect().width / 8);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const toCell = useCallback((cx: number, cy: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const r   = el.getBoundingClientRect();
    let col = Math.floor((cx - r.left)  / (r.width  / 8));
    let row = Math.floor((cy - r.top)   / (r.height / 8));
    if (flipped) { row = 7 - row; col = 7 - col; }
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return { row, col };
  }, [flipped]);

  // Unified move executor — applies to store AND relays via onMove
  const executeMove = useCallback((move: Move) => {
    storeApply(move);
    onMove?.(move);
  }, [storeApply, onMove]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (disabled) return;
    const state = useGameStore.getState();
    if (state.status !== "playing") return;
    if (state.selected) {
      const move = state.validMoves.find(m => m.to[0] === row && m.to[1] === col);
      if (move) { executeMove(move); return; }
    }
    const piece = state.board[row][col];
    if (piece) selectPiece(piece);
    else useGameStore.setState({ selected: null, validMoves: [] });
  }, [disabled, selectPiece, executeMove]);

  const canControl = useCallback((piece: Piece) => {
    if (disabled) return false;
    if (status !== "playing") return false;
    if (playerColor && piece.color !== playerColor) return false;
    return true;
  }, [playerColor, status, disabled]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const cell = toCell(e.clientX, e.clientY);
    if (!cell) return;
    const piece = board[cell.row][cell.col];
    if (!piece || !canControl(piece)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragId.current     = piece.id;
    dragOrigin.current = { row: piece.row, col: piece.col };
    setGhost({ piece, x: e.clientX, y: e.clientY });
    setHoverCell(cell);
    selectPiece(piece);
  }, [board, canControl, toCell, selectPiece]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragId.current) return;
    setGhost(g => g ? { ...g, x: e.clientX, y: e.clientY } : null);
    const cell = toCell(e.clientX, e.clientY);
    setHoverCell(cell && (cell.row + cell.col) % 2 !== 0 ? cell : null);
  }, [toCell]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragId.current || !dragOrigin.current) return;
    const origin = dragOrigin.current;
    dragId.current     = null;
    dragOrigin.current = null;
    setGhost(null);
    setHoverCell(null);

    const cell = toCell(e.clientX, e.clientY);
    if (!cell || (cell.row === origin.row && cell.col === origin.col)) return;

    const move = validMoves.find(m => m.to[0] === cell.row && m.to[1] === cell.col);
    if (move) executeMove(move);
  }, [toCell, validMoves, executeMove]);

  const displayRows = flipped
    ? [...Array(8)].map((_, i) => 7 - i)
    : [...Array(8)].map((_, i) => i);
  const displayCols = flipped
    ? [...Array(8)].map((_, i) => 7 - i)
    : [...Array(8)].map((_, i) => i);

  // Coordinate labels — flip when board is flipped
  const rankLabels = flipped ? [...RANKS].reverse() : RANKS;   // top→bottom: 1..8 or 8..1
  const fileLabels = flipped ? [...FILES].reverse() : FILES;   // left→right: h..a or a..h

  const validDests = new Set(validMoves.map(m => `${m.to[0]},${m.to[1]}`));
  const captureDests = new Set(
    validMoves.filter(m => m.captured.length > 0).map(m => `${m.to[0]},${m.to[1]}`)
  );

  return (
    <>
      <div className={styles.boardWrap}>
        {/* Rank labels — left side */}
        <div className={styles.ranks}>
          {rankLabels.map(r => (
            <div key={r} className={styles.rankLabel}>{r}</div>
          ))}
        </div>

        <div className={styles.boardInner}>
          <div
            ref={boardRef}
            className={styles.board}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => { if (!dragId.current) setHoverCell(null); }}
          >
            {/* Squares */}
            {displayRows.map(row =>
              displayCols.map(col => {
                const isLight    = (row + col) % 2 === 0;
                const key        = `${row},${col}`;
                const isSelected = selected?.row === row && selected?.col === col;
                const isMovable  = validDests.has(key) && !captureDests.has(key);
                const isCapture  = captureDests.has(key);
                const isHover    = hoverCell?.row === row && hoverCell?.col === col;
                return (
                  <div
                    key={key}
                    className={[
                      styles.sq,
                      isLight    ? styles.sqLight    : styles.sqDark,
                      isSelected ? styles.sqSelected : "",
                      isMovable  ? styles.sqMovable  : "",
                      isCapture  ? styles.sqCapture  : "",
                      isHover    ? styles.sqHover    : "",
                    ].join(" ")}
                    onClick={() => handleSquareClick(row, col)}
                  >
                    {(isMovable || isCapture) && !board[row][col] && (
                      <div className={`${styles.moveDot} ${isCapture ? styles.moveDotCapture : ""}`} />
                    )}
                  </div>
                );
              })
            )}

            {/* Pieces */}
            <AnimatePresence>
              {board.flat().filter((p): p is Piece => p !== null).map(piece => {
                const dragging = dragId.current === piece.id;
                const dispRow  = flipped ? 7 - piece.row : piece.row;
                const dispCol  = flipped ? 7 - piece.col : piece.col;
                return (
                  <motion.div
                    key={piece.id}
                    className={[
                      styles.piece,
                      piece.color === "light" ? styles.pLight : styles.pDark,
                      piece.type === "king"   ? styles.pKing  : "",
                      dragging ? styles.pHidden : "",
                      selected?.id === piece.id
                        ? piece.type === "king" ? `${styles.pSelected} ${styles.pKing}` : styles.pSelected
                        : "",
                    ].join(" ")}
                    style={{
                      width:  sq * 0.76,
                      height: sq * 0.76,
                      top:    dispRow * sq + sq * 0.12,
                      left:   dispCol * sq + sq * 0.12,
                    }}
                    animate={{
                      top:  dispRow * sq + sq * 0.12,
                      left: dispCol * sq + sq * 0.12,
                    }}
                    transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.8 }}
                    exit={{ scale: 0, opacity: 0, transition: { duration: 0.18 } }}
                  >
                    {piece.type === "king" && (
                      <motion.div
                        className={styles.crown}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      >
                        <RiVipCrownLine />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* File labels — bottom */}
          <div className={styles.files}>
            {fileLabels.map(f => (
              <div key={f} className={styles.fileLabel}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {ghost && (
        <DragGhost
          color={ghost.piece.color}
          isKing={ghost.piece.type === "king"}
          x={ghost.x}
          y={ghost.y}
          size={sq * 0.88}
        />
      )}
    </>
  );
}
