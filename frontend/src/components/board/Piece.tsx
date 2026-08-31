import { motion } from "motion/react";
import clsx from "clsx";
import { RiVipCrownLine } from "react-icons/ri";
import styles from "./Piece.module.css";
import type { Piece as PieceType } from "../../../../shared/types";

interface PieceProps {
  piece: PieceType;
  selected?: boolean;
  onClick?: () => void;
}

export function Piece({ piece, selected = false, onClick }: PieceProps) {
  return (
    <motion.div
      className={clsx(styles.piece, styles[piece.color], selected && styles.selected)}
      onClick={onClick}
      role="button"
      aria-label={`peça ${piece.color === "light" ? "clara" : "escura"} ${piece.type === "king" ? "dama" : "peão"}`}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      animate={selected ? { scale: 1.12 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
    >
      {piece.type === "king" && (
        <motion.span
          className={styles.crown}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          <RiVipCrownLine />
        </motion.span>
      )}
    </motion.div>
  );
}
