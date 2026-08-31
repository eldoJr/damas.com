import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  RiRobotLine, RiUserLine, RiTimeLine,
  RiShakeHandsLine, RiFlagLine, RiRestartLine,
} from "react-icons/ri";
import styles from "./Game.module.css";
import { DragBoard } from "@/components/board/DragBoard";
import { Button } from "@/components/ui/Button";
import { GameModal, type ModalKind } from "@/components/ui/GameModal";
import { useGameStore } from "@/store/gameStore";
import { useAuthStore } from "@/store/authStore";
import { getBotMove, type BotLevel } from "@/store/botEngine";
import { api } from "@/lib/api";

const BOT_DELAY: Record<BotLevel, number> = { easy: 300, medium: 600, hard: 900, master: 1200 };
const BOT_LABEL: Record<BotLevel, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil", master: "Mestre" };
const BOT_ELO:   Record<BotLevel, string> = { easy: "400",   medium: "800",   hard: "1200",    master: "1800"   };

function PlayerBar({ name, rating, isSelf, isActive, isBot }: {
  name: string; rating: string; isSelf?: boolean; isActive: boolean; isBot?: boolean;
}) {
  return (
    <div className={`${styles.playerBar} ${isActive ? styles.playerBarActive : ""}`}>
      <div className={styles.playerInfo}>
        <div className={`${styles.avatar} ${isSelf ? styles.avatarSelf : ""}`}>
          {isBot ? <RiRobotLine size={14} /> : <RiUserLine size={14} />}
        </div>
        <div>
          <div className={styles.playerName}>{name}</div>
          <div className={styles.playerRating}>{rating} ELO</div>
        </div>
      </div>
      <div className={styles.playerRight}>
        <div className={`${styles.clock} ${isActive ? styles.clockActive : ""}`}>
          <RiTimeLine size={12} />
          <span>--:--</span>
        </div>
      </div>
    </div>
  );
}

export function BotGame() {
  const { level = "medium" } = useParams<{ level: BotLevel }>();
  const navigate    = useNavigate();
  const user        = useAuthStore(s => s.user);
  const { board, currentTurn, status, winner, drawReason, history, init, applyMove: storeApply, resign, offerDraw } = useGameStore();
  const thinkingRef = useRef(false);
  const [modal, setModal] = useState<ModalKind | null>(null);

  const botColor    = "dark" as const;
  const botLevelKey = (level as BotLevel) in BOT_LABEL ? (level as BotLevel) : "medium";

  useEffect(() => { init(); setModal(null); }, [level]);

  // Persist bot game result when finished
  const savedRef = useRef(false);
  useEffect(() => {
    if (status !== "finished" || savedRef.current) return;
    savedRef.current = true;
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    api.post("/games/bot", {
      winner: winner,          // "light" | "dark" | null
      level:  botLevelKey,
      moves:  history.length,
      draw_reason: drawReason,
    }).catch(() => {/* non-critical */});
  }, [status]);

  // Auto-show result modal
  useEffect(() => {
    if (status !== "finished") return;
    if (winner) {
      setModal({
        type: "victory",
        winner,
        playerColor: "light",
        reason: winner === "light" ? "Você capturou todas as peças do bot!" : "O bot capturou todas as suas peças.",
      });
    } else {
      setModal({ type: "draw", reason: drawReason ?? "Empate" });
    }
  }, [status, winner, drawReason]);

  // Bot move
  useEffect(() => {
    if (status !== "playing" || currentTurn !== botColor || thinkingRef.current) return;
    thinkingRef.current = true;
    const timer = setTimeout(() => {
      const move = getBotMove(board, botColor, botLevelKey);
      if (move) storeApply(move);
      thinkingRef.current = false;
    }, BOT_DELAY[botLevelKey]);
    return () => { clearTimeout(timer); thinkingRef.current = false; };
  }, [currentTurn, status, board, botLevelKey, storeApply]);

  const isLightTurn = currentTurn === "light";
  const isFinished  = status === "finished";
  const botThinking = currentTurn === botColor && !isFinished;

  const moveRows: Array<[string, string]> = [];
  for (let i = 0; i < history.length; i += 2) {
    moveRows.push([history[i]?.notation ?? "", history[i + 1]?.notation ?? ""]);
  }

  const handleNewGame = () => { savedRef.current = false; setModal(null); init(); };
  const handleMenu    = () => { setModal(null); navigate("/play"); };
  const handleResign  = () => { setModal(null); resign("light"); };
  // Bot always declines draw — show a brief message instead
  const handleDrawOffer = () => {
    setModal(null);
    offerDraw(); // accept immediately (local game — treat as accepted)
  };

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className={styles.layout}>

        <div className={styles.boardColumn}>
          <PlayerBar
            name={`Bot — ${BOT_LABEL[botLevelKey]}`}
            rating={BOT_ELO[botLevelKey]}
            isActive={!isLightTurn && !isFinished}
            isBot
          />
          <DragBoard playerColor="light" />
          <PlayerBar
            name={user?.username ?? "Você (Visitante)"}
            rating={user ? String(user.elo) : "—"}
            isSelf
            isActive={isLightTurn && !isFinished}
          />
        </div>

        <aside className={styles.sidebar}>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTurn + String(isFinished)}
              className={`${styles.turnBanner} ${isLightTurn ? styles.turnBannerLight : styles.turnBannerDark}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className={`${styles.turnDisc} ${isLightTurn ? styles.discLight : styles.discDark}`} />
              <span>
                {botThinking ? "Bot pensando…" : isLightTurn ? "Sua vez" : "Vez do bot"}
              </span>
            </motion.div>
          </AnimatePresence>

          <div className={styles.sideSection}>
            <div className={styles.sideSectionRow}>
              <RiRobotLine size={13} style={{ color: "var(--color-text-muted)" }} />
              <span className={styles.sideLabel}>Nível</span>
              <span className={styles.roomId}>{BOT_LABEL[botLevelKey]}</span>
            </div>
          </div>

          <div className={styles.sep} />

          <div className={styles.moveSection}>
            <div className={styles.moveSectionHeader}>Lances</div>
            <div className={styles.moveGrid}>
              {moveRows.length === 0 ? (
                <div className={styles.moveEmpty}>Nenhum lance ainda</div>
              ) : moveRows.map(([dark, light], i) => (
                <>
                  <span key={`d${i}`} className={styles.moveEntry}>{i + 1}. {dark}</span>
                  <span key={`l${i}`} className={`${styles.moveEntry} ${styles.moveLight}`}>{light}</span>
                </>
              ))}
            </div>
          </div>

          <div className={styles.spacer} />
          <div className={styles.sep} />

          <div className={styles.sideActions}>
            {isFinished ? (
              <>
                <Button variant="primary" size="sm" fullWidth onClick={handleNewGame}>
                  <RiRestartLine size={14} />Jogar Novamente
                </Button>
                <Button variant="secondary" size="sm" fullWidth onClick={handleMenu}>
                  Voltar ao Menu
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" fullWidth onClick={() => setModal({ type: "confirm-draw" })}>
                  <RiShakeHandsLine size={14} />Propor Empate
                </Button>
                <Button variant="danger" size="sm" fullWidth onClick={() => setModal({ type: "confirm-resign" })}>
                  <RiFlagLine size={14} />Abandonar
                </Button>
              </>
            )}
          </div>

        </aside>
      </div>

      <GameModal
        modal={modal}
        onClose={() => setModal(null)}
        onNewGame={handleNewGame}
        onMenu={handleMenu}
        onResign={handleResign}
        onAcceptDraw={handleDrawOffer}
        onDeclineDraw={() => setModal(null)}
      />
    </motion.div>
  );
}
