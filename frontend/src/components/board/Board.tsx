import { motion } from "motion/react";
import styles from "./Board.module.css";
import { Square } from "./Square";
import type { GameState, Piece } from "../../../../shared/types";

interface BoardProps {
  gameState: GameState;
  selectedPiece: Piece | null;
  validMoves: Array<{ row: number; col: number }>;
  onSquareClick: (row: number, col: number) => void;
  onPieceClick: (piece: Piece) => void;
  flipped?: boolean;
}

export function Board({
  gameState, selectedPiece, validMoves,
  onSquareClick, onPieceClick, flipped = false,
}: BoardProps) {
  const rows = flipped ? [...gameState.board].reverse() : gameState.board;

  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className={styles.board}>
        {rows.map((row, rIdx) =>
          row.map((piece, cIdx) => {
            const actualRow = flipped ? 7 - rIdx : rIdx;
            const isSelected = selectedPiece?.row === actualRow && selectedPiece?.col === cIdx;
            const isMovable = validMoves.some(m => m.row === actualRow && m.col === cIdx && !piece);
            const isCapturable = validMoves.some(m => m.row === actualRow && m.col === cIdx && !!piece);

            return (
              <Square
                key={`${rIdx}-${cIdx}`}
                row={actualRow}
                col={cIdx}
                piece={piece}
                isSelected={isSelected}
                isMovable={isMovable}
                isCapturable={isCapturable}
                onSquareClick={onSquareClick}
                onPieceClick={onPieceClick}
              />
            );
          })
        )}
      </div>
    </motion.div>
  );
}
