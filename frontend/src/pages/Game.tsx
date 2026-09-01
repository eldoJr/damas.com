import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  RiFileCopyLine, RiCheckLine, RiShakeHandsLine,
  RiFlagLine, RiUserLine, RiTimeLine, RiRestartLine,
  RiWifiLine, RiLoader4Line,
} from "react-icons/ri";
import styles from "./Game.module.css";
import { DragBoard } from "@/components/board/DragBoard";
import { Button } from "@/components/ui/Button";
import { GameModal, type ModalKind } from "@/components/ui/GameModal";
import { useGameStore } from "@/store/gameStore";
import { useSocketStore } from "@/store/socketStore";
import { useAuthStore } from "@/store/authStore";
import type { PieceColor } from "@/store/gameStore";

function fmtClock(s: number): string {
  if (s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function PlayerBar({ name, rating, isSelf, isActive, timeLeft, unlimited }: {
  name: string; rating: string; isSelf?: boolean; isActive: boolean;
  timeLeft: number; unlimited: boolean;
}) {
  const low = !unlimited && timeLeft > 0 && timeLeft <= 10;
  const out = !unlimited && timeLeft <= 0;
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
        <div className={`${styles.clock} ${isActive ? styles.clockActive : ""} ${low ? styles.clockLow : ""} ${out ? styles.clockOut : ""}`}>
          <RiTimeLine size={12} />
          <span>{unlimited ? "∞" : fmtClock(timeLeft)}</span>
        </div>
      </div>
    </div>
  );
}

export function Game() {
  const { roomId }  = useParams<{ roomId: string }>();
  const navigate    = useNavigate();
  const user        = useAuthStore(s => s.user);
  const token       = useAuthStore(s => s.token);

  const { currentTurn, status, winner, drawReason, history } = useGameStore();
  const {
    connect, disconnect, sendMove, sendResign,
    sendDrawOffer, sendDrawAccept, sendDrawDecline,
    seat, phase, opponentName,
  } = useSocketStore();

  // Clocks: [white, black] seconds. Initialized once when phase → "playing".
  const [clocks, setClocks]   = useState<[number, number]>([0, 0]);
  const unlimitedRef          = useRef(true);   // set at game start
  const clocksReadyRef        = useRef(false);  // true after first init
  const tickRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const [copied, setCopied]   = useState(false);
  const [modal, setModal]     = useState<ModalKind | null>(null);
  const resultSentRef         = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    useGameStore.getState().init();
    resultSentRef.current  = false;
    clocksReadyRef.current = false;
    unlimitedRef.current   = true;
    connect(roomId, token);
    return () => disconnect();
  }, [roomId]);

  // Init clocks exactly once when game starts
  useEffect(() => {
    if (phase !== "playing" || clocksReadyRef.current) return;
    clocksReadyRef.current = true;
    const secs = useSocketStore.getState().timeSeconds;
    unlimitedRef.current = secs === 0;
    setClocks([secs, secs]);
  }, [phase]);

  /* ── Clock tick ── */
  const stopClock = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const startClock = useCallback((color: "white" | "black") => {
    stopClock();
    if (unlimitedRef.current) return;
    const idx = color === "white" ? 0 : 1;
    tickRef.current = setInterval(() => {
      setClocks(prev => {
        const next = prev[idx] - 1;
        if (next <= 0) {
          stopClock();
          const loserColor: PieceColor = color === "white" ? "light" : "dark";
          const { socket, roomId: rid } = useSocketStore.getState();
          if (socket && rid) {
            socket.emit("game_over", { roomId: rid, result: "win", winner: color === "white" ? "black" : "white" });
          }
          useGameStore.getState().resign(loserColor);
          return color === "white" ? [0, prev[1]] : [prev[0], 0];
        }
        return color === "white" ? [next, prev[1]] : [prev[0], next];
      });
    }, 1000);
  }, [stopClock]);

  // Switch clock on turn change
  useEffect(() => {
    if (status !== "playing" || phase !== "playing" || !clocksReadyRef.current) {
      stopClock();
      return;
    }
    startClock(currentTurn === "light" ? "white" : "black");
    return stopClock;
  }, [currentTurn, status, phase]);

  useEffect(() => {
    if (status === "finished") stopClock();
  }, [status]);

  const boardFlipped = seat === "black";
  const ourColor: PieceColor = seat === "black" ? "dark" : "light";
  const ourClockIdx  = seat === "white" ? 0 : 1;
  const oppClockIdx  = seat === "white" ? 1 : 0;
  const unlimited    = unlimitedRef.current;

  useEffect(() => {
    if (phase === "draw-offered") setModal({ type: "draw-offer" });
  }, [phase]);

  useEffect(() => {
    if (status !== "finished") return;
    if (phase === "finished") return;
    if (resultSentRef.current) return;
    const { socket, roomId: rid } = useSocketStore.getState();
    if (!socket || !rid) return;
    if (winner) {
      socket.emit("game_over", { roomId: rid, result: "win", winner: winner === "light" ? "white" : "black" });
    } else {
      socket.emit("game_over", { roomId: rid, result: "draw", drawReason: drawReason ?? undefined });
    }
  }, [status, winner, drawReason]);

  useEffect(() => {
    if (status !== "finished" || phase !== "finished" || resultSentRef.current) return;
    resultSentRef.current = true;
    if (winner) {
      setModal({ type: "victory", winner, playerColor: ourColor,
        reason: winner === ourColor ? "Você capturou todas as peças!" : "Oponente capturou todas as peças." });
    } else {
      setModal({ type: "draw", reason: drawReason ?? "Empate" });
    }
  }, [status, phase, winner, drawReason]);

  const copyLink = () => {
    navigator.clipboard.writeText(roomId ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOurTurn  = currentTurn === ourColor;
  const isFinished = status === "finished";
  const isWaiting  = phase === "waiting" || phase === "idle";
  const isPlaying  = phase === "playing" || phase === "draw-offered" || phase === "finished";

  const moveRows: Array<[string, string]> = [];
  for (let i = 0; i < history.length; i += 2)
    moveRows.push([history[i]?.notation ?? "", history[i + 1]?.notation ?? ""]);

  const handleNewGame     = () => { resultSentRef.current = false; setModal(null); navigate("/play"); };
  const handleMenu        = () => { setModal(null); navigate("/play"); };
  const handleResign      = () => { setModal(null); sendResign(); };
  const handleDrawOffer   = () => { setModal(null); sendDrawOffer(); };
  const handleAcceptDraw  = () => { setModal(null); sendDrawAccept(); };
  const handleDeclineDraw = () => { setModal(null); sendDrawDecline(); useSocketStore.setState({ phase: "playing" }); };

  const myName  = user?.username ?? "Você (Visitante)";
  const myElo   = user ? String(user.elo) : "—";
  const oppName = isWaiting ? "Aguardando oponente…" : (opponentName ?? "Oponente");

  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <div className={styles.layout}>

        <div className={styles.boardColumn}>
          <PlayerBar name={oppName} rating="—"
            isActive={!isOurTurn && !isFinished && isPlaying}
            timeLeft={clocks[oppClockIdx]} unlimited={unlimited} />

          <div style={{ position: "relative", display: "inline-flex" }}>
            <DragBoard
              playerColor={ourColor} flipped={boardFlipped}
              disabled={!isPlaying || !isOurTurn || isFinished}
              onMove={sendMove}
            />
            {isWaiting && (
              <div className={styles.waitingOverlay}>
                <RiLoader4Line size={28} className={styles.waitingSpinner} />
                <span>Aguardando oponente…</span>
                <div className={styles.waitingLink}>
                  <span className={styles.roomCode}>{roomId}</span>
                  <button className={styles.copyBtn} onClick={copyLink}>
                    <AnimatePresence mode="wait">
                      {copied
                        ? <motion.span key="ok"   initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><RiCheckLine size={13} /></motion.span>
                        : <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><RiFileCopyLine size={13} /></motion.span>}
                    </AnimatePresence>
                    {copied ? "Copiado!" : "Copiar link"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <PlayerBar name={myName} rating={myElo} isSelf
            isActive={isOurTurn && !isFinished && isPlaying}
            timeLeft={clocks[ourClockIdx]} unlimited={unlimited} />
        </div>

        <aside className={styles.sidebar}>
          <AnimatePresence mode="wait">
            <motion.div
              key={String(isOurTurn) + String(isFinished) + phase}
              className={`${styles.turnBanner} ${isOurTurn ? styles.turnBannerLight : styles.turnBannerDark}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className={`${styles.turnDisc} ${isOurTurn ? styles.discLight : styles.discDark}`} />
              <span>
                {isWaiting ? "Aguardando…" : isFinished ? "Partida encerrada"
                  : isOurTurn ? "Sua vez" : `Vez de ${oppName}`}
              </span>
            </motion.div>
          </AnimatePresence>

          <div className={styles.sideSection}>
            <div className={styles.sideSectionRow}>
              <RiWifiLine size={13} style={{ color: "var(--color-text-muted)" }} />
              <span className={styles.sideLabel}>Sala</span>
              <span className={styles.roomId}>{roomId}</span>
              <button className={styles.copyBtn} onClick={copyLink}>
                <AnimatePresence mode="wait">
                  {copied
                    ? <motion.span key="ok"   initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><RiCheckLine size={13} /></motion.span>
                    : <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><RiFileCopyLine size={13} /></motion.span>}
                </AnimatePresence>
                {copied ? "Copiado!" : "Copiar"}
              </button>
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
                  <RiRestartLine size={14} />Nova Partida
                </Button>
                <Button variant="secondary" size="sm" fullWidth onClick={handleMenu}>
                  Voltar ao Menu
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" fullWidth disabled={!isPlaying}
                  onClick={() => setModal({ type: "confirm-draw" })}>
                  <RiShakeHandsLine size={14} />Propor Empate
                </Button>
                <Button variant="danger" size="sm" fullWidth disabled={!isPlaying}
                  onClick={() => setModal({ type: "confirm-resign" })}>
                  <RiFlagLine size={14} />Abandonar
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>

      <GameModal modal={modal} onClose={() => setModal(null)}
        onNewGame={handleNewGame} onMenu={handleMenu} onResign={handleResign}
        onAcceptDraw={handleAcceptDraw} onDeclineDraw={handleDeclineDraw} onOfferDraw={handleDrawOffer}
      />
    </motion.div>
  );
}
