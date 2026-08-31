import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  RiFileCopyLine,
  RiCheckLine,
  RiShakeHandsLine,
  RiFlagLine,
  RiUserLine,
  RiTimeLine,
} from "react-icons/ri";
import styles from "./Game.module.css";
import { Board } from "@/components/board/Board";
import { Button } from "@/components/ui/Button";
import { useGameStore } from "@/store/gameStore";

function PlayerBar({
  name,
  rating,
  isSelf,
  isActive,
}: {
  name: string;
  rating: string;
  isSelf?: boolean;
  isActive: boolean;
}) {
  return (
    <div className={`${styles.playerBar} ${isActive ? styles.playerBarActive : ""}`}>
      <div className={styles.playerInfo}>
        <div className={`${styles.avatar} ${isSelf ? styles.avatarSelf : ""}`}>
          <RiUserLine size={14} />
        </div>
        <div>
          <div className={styles.playerName}>{name}</div>
          <div className={styles.playerRating}>{rating} ELO</div>
        </div>
      </div>
      <div className={styles.playerRight}>
        <div className={`${styles.clock} ${isActive ? styles.clockActive : ""}`}>
          <RiTimeLine size={12} />
          <span>10:00</span>
        </div>
      </div>
    </div>
  );
}

export function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const { gameState, selectedPiece, validMoves, selectPiece, movePiece } = useGameStore();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLightTurn = gameState.currentTurn === "light";

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className={styles.layout}>

        {/* ── Left: board column ── */}
        <div className={styles.boardColumn}>
          <PlayerBar
            name="Aguardando oponente…"
            rating="—"
            isActive={!isLightTurn}
          />

          <Board
            gameState={gameState}
            selectedPiece={selectedPiece}
            validMoves={validMoves}
            onPieceClick={selectPiece}
            onSquareClick={(row, col) => movePiece(row, col)}
          />

          <PlayerBar
            name="Você (Visitante)"
            rating="—"
            isSelf
            isActive={isLightTurn}
          />
        </div>

        {/* ── Right: sidebar panel ── */}
        <aside className={styles.sidebar}>

          {/* Turn indicator */}
          <AnimatePresence mode="wait">
            <motion.div
              key={gameState.currentTurn}
              className={`${styles.turnBanner} ${isLightTurn ? styles.turnBannerLight : styles.turnBannerDark}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className={`${styles.turnDisc} ${isLightTurn ? styles.discLight : styles.discDark}`} />
              <span>{isLightTurn ? "Vez das claras" : "Vez das escuras"}</span>
            </motion.div>
          </AnimatePresence>

          {/* Room info */}
          <div className={styles.sideSection}>
            <div className={styles.sideSectionRow}>
              <span className={styles.sideLabel}>Sala</span>
              <span className={styles.roomId}>{roomId}</span>
              <button className={styles.copyBtn} onClick={copyLink}>
                <AnimatePresence mode="wait">
                  {copied
                    ? <motion.span key="ok"   initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><RiCheckLine size={13} /></motion.span>
                    : <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><RiFileCopyLine size={13} /></motion.span>
                  }
                </AnimatePresence>
                {copied ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>

          <div className={styles.sep} />

          {/* Move list */}
          <div className={styles.moveSection}>
            <div className={styles.moveSectionHeader}>Lances</div>
            <div className={styles.moveGrid}>
              <div className={styles.moveEmpty}>Nenhum lance ainda</div>
            </div>
          </div>

          <div className={styles.spacer} />

          <div className={styles.sep} />

          {/* Actions */}
          <div className={styles.sideActions}>
            <Button variant="secondary" size="sm" fullWidth>
              <RiShakeHandsLine size={14} />
              Propor Empate
            </Button>
            <Button variant="danger" size="sm" fullWidth>
              <RiFlagLine size={14} />
              Abandonar
            </Button>
          </div>

        </aside>
      </div>
    </motion.div>
  );
}
