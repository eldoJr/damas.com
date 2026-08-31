import clsx from "clsx";
import styles from "./Square.module.css";
import type { Piece as PieceType } from "../../../../shared/types";
import { Piece } from "./Piece";

interface SquareProps {
  row: number;
  col: number;
  piece: PieceType | null;
  isSelected: boolean;
  isMovable: boolean;
  isCapturable: boolean;
  onSquareClick: (row: number, col: number) => void;
  onPieceClick: (piece: PieceType) => void;
}

export function Square({
  row, col, piece, isSelected, isMovable, isCapturable,
  onSquareClick, onPieceClick,
}: SquareProps) {
  const isLight = (row + col) % 2 === 0;

  return (
    <div
      className={clsx(
        styles.square,
        isLight ? styles.light : styles.dark,
        isSelected && styles.selected,
        isMovable && styles.movable,
        isCapturable && styles.capturable,
      )}
      onClick={() => onSquareClick(row, col)}
    >
      {piece && (
        <Piece
          piece={piece}
          selected={isSelected}
          onClick={() => onPieceClick(piece)}
        />
      )}
    </div>
  );
}
