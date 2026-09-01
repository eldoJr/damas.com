import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import type { PieceColor } from "@/store/gameStore";

const BOT_DELAY: Record<BotLevel, number> = { easy: 300, medium: 600, hard: 900, master: 1200 };
const BOT_LABEL: Record<BotLevel, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil", master: "Mestre" };
const BOT_ELO:   Record<BotLevel, string> = { easy: "400",   medium: "800",   hard: "1200",    master: "1800"   };

/* ── Clock helpers ────────────────────────────── */
function fmtClock(s: number): string {
  if (s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayerBar({ name, rating, isSelf, isActive, isBot, timeLeft, unlimited }: {
  name: string; rating: string; isSelf?: boolean; isActive: boolean;
  isBot?: boolean; timeLeft: number; unlimited: boolean;
}) {
  const low = !unlimited && timeLeft > 0 && timeLeft <= 10;
  const out = !unlimited && timeLeft <= 0;
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
        <div className={`${styles.clock} ${isActive ? styles.clockActive : ""} ${low ? styles.clockLow : ""} ${out ? styles.clockOut : ""}`}>
          <RiTimeLine size={12} />
          <span>{unlimited ? "∞" : fmtClock(timeLeft)}</span>
        </div>
      </div>
    </div>
  );
}

export function BotGame() {
  const { level = "medium" }  = useParams<{ level: BotLevel }>();
  const [searchParams]        = useSearchParams();
  const navigate              = useNavigate();
  const user                  = useAuthStore(s => s.user);

  const { board, currentTurn, status, winner, drawReason, history, init, applyMove: storeApply, resign, offerDraw } = useGameStore();

  const botLevelKey = (level as BotLevel) in BOT_LABEL ? (level as BotLevel) : "medium";
  const botColor: PieceColor = "dark";
  const playerColor: PieceColor = "light";

  // Time control from URL param (?t=seconds), 0 = unlimited
  const timeSeconds = parseInt(searchParams.get("t") ?? "0", 10) || 0;
  const unlimited   = timeSeconds === 0;

  // Clocks: [player(light), bot(dark)]
  const [clocks, setClocks]   = useState<[number, number]>([timeSeconds, timeSeconds]);
  const tickRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingRef           = useRef(false);
  const [modal, setModal]     = useState<ModalKind | null>(null);
  const savedRef              = useRef(false);

  const stopClock = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const startClock = useCallback((color: "light" | "dark") => {
    stopClock();
    if (unlimited) return;
    const idx = color === "light" ? 0 : 1;
    tickRef.current = setInterval(() => {
      setClocks(prev => {
        const next = prev[idx] - 1;
        if (next <= 0) {
          stopClock();
          // Whoever ran out loses
          resign(color);
          return color === "light" ? [0, prev[1]] : [prev[0], 0];
        }
        return color === "light" ? [next, prev[1]] : [prev[0], next];
      });
    }, 1000);
  }, [unlimited, stopClock, resign]);

  useEffect(() => {
    init();
    setModal(null);
    savedRef.current = false;
    setClocks([timeSeconds, timeSeconds]);
  }, [level, timeSeconds]);

  // Switch clock on turn change
  useEffect(() => {
    if (status !== "playing") { stopClock(); return; }
    startClock(currentTurn);
    return stopClock;
  }, [currentTurn, status]);

  useEffect(() => {
    if (status === "finished") stopClock();
  }, [status]);

  // Persist result
  useEffect(() => {
    if (status !== "finished" || savedRef.current) return;
    savedRef.current = true;
    if (!useAuthStore.getState().user?.id) return;
    api.post("/games/bot", {
      winner, level: botLevelKey, moves: history.length, draw_reason: drawReason,
    }).catch(() => {});
  }, [status]);

  // Result modal
  useEffect(() => {
    if (status !== "finished") return;
    if (winner) {
      setModal({
        type: "victory", winner, playerColor,
        reason: winner === playerColor ? "Você capturou todas as peças do bot!" : "O bot capturou todas as suas peças.",
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

  const isPlayerTurn = currentTurn === playerColor;
  const isFinished   = status === "finished";
  const botThinking  = currentTurn === botColor && !isFinished;

  const moveRows: Array<[string, string]> = [];
  for (let i = 0; i < history.length; i += 2)
    moveRows.push([history[i]?.notation ?? "", history[i + 1]?.notation ?? ""]);

  const handleNewGame   = () => { savedRef.current = false; setModal(null); init(); setClocks([timeSeconds, timeSeconds]); };
  const handleMenu      = () => { setModal(null); navigate("/play"); };
  const handleResign    = () => { setModal(null); resign("light"); };
  const handleDrawOffer = () => { setModal(null); offerDraw(); };

  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className={styles.layout}>

        <div className={styles.boardColumn}>
          <PlayerBar
            name={`Bot — ${BOT_LABEL[botLevelKey]}`}
            rating={BOT_ELO[botLevelKey]}
            isActive={!isPlayerTurn && !isFinished}
            isBot
            timeLeft={clocks[1]}
            unlimited={unlimited}
          />
          <DragBoard playerColor="light" />
          <PlayerBar
            name={user?.username ?? "Você (Visitante)"}
            rating={user ? String(user.elo) : "—"}
            isSelf
            isActive={isPlayerTurn && !isFinished}
            timeLeft={clocks[0]}
            unlimited={unlimited}
          />
        </div>

        <aside className={styles.sidebar}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTurn + String(isFinished)}
              className={`${styles.turnBanner} ${isPlayerTurn ? styles.turnBannerLight : styles.turnBannerDark}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className={`${styles.turnDisc} ${isPlayerTurn ? styles.discLight : styles.discDark}`} />
              <span>
                {isFinished ? "Partida encerrada"
                  : botThinking ? "Bot pensando…"
                  : isPlayerTurn ? "Sua vez" : "Vez do bot"}
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
              {moveRows.length === 0
                ? <div className={styles.moveEmpty}>Nenhum lance ainda</div>
                : moveRows.map(([dark, light], i) => (
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
