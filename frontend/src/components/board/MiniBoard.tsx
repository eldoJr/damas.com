import styles from "./MiniBoard.module.css";

const INITIAL: (0 | 1 | 2)[][] = [
  [0,2,0,2,0,2,0,2],
  [2,0,2,0,2,0,2,0],
  [0,2,0,2,0,2,0,2],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [1,0,1,0,1,0,1,0],
  [0,1,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0],
];

export function MiniBoard() {
  return (
    <div className={styles.board}>
      {INITIAL.map((row, r) =>
        row.map((cell, c) => {
          const isDark = (r + c) % 2 !== 0;
          return (
            <div key={`${r}-${c}`} className={`${styles.sq} ${isDark ? styles.dark : styles.light}`}>
              {isDark && cell === 1 && <div className={`${styles.piece} ${styles.pLight}`} />}
              {isDark && cell === 2 && <div className={`${styles.piece} ${styles.pDark}`} />}
            </div>
          );
        })
      )}
    </div>
  );
}
