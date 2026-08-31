import { motion, AnimatePresence } from "motion/react";
import {
  RiTrophyLine, RiMedalLine,
  RiFlagLine, RiShakeHandsLine, RiRestartLine,
  RiArrowLeftLine, RiCloseLine, RiCheckLine,
} from "react-icons/ri";
import styles from "./GameModal.module.css";
import { Button } from "@/components/ui/Button";
import type { PieceColor } from "../../../../shared/types";

/* ── Types ── */
export type ModalKind =
  | { type: "victory";  winner: PieceColor; reason?: string; playerColor: PieceColor }
  | { type: "draw";     reason: string }
  | { type: "confirm-resign" }
  | { type: "confirm-draw" }
  | { type: "draw-offer" };   // opponent offered draw

interface GameModalProps {
  modal: ModalKind | null;
  onClose:       () => void;
  onNewGame:     () => void;
  onMenu:        () => void;
  onResign:      () => void;
  onAcceptDraw:  () => void;
  onDeclineDraw: () => void;
  onOfferDraw?:  () => void;
}

/* ── Backdrop ── */
function Backdrop({ onClick }: { onClick: () => void }) {
  return <div className={styles.backdrop} onClick={onClick} />;
}

/* ── Victory ── */
function VictoryModal({ modal, onNewGame, onMenu }: {
  modal: Extract<ModalKind, { type: "victory" }>;
  onNewGame: () => void;
  onMenu: () => void;
}) {
  const isWinner = modal.winner === modal.playerColor;
  const isDraw   = false;

  return (
    <div className={`${styles.card} ${isWinner ? styles.cardWin : styles.cardLoss}`}>
      <div className={styles.iconWrap}>
        {isWinner
          ? <RiTrophyLine  className={`${styles.icon} ${styles.iconGold}`} />
          : <RiMedalLine   className={`${styles.icon} ${styles.iconSilver}`} />
        }
      </div>

      <div className={styles.resultLabel}>
        {isWinner ? "Vitória!" : "Derrota"}
      </div>
      <div className={styles.resultSub}>
        {modal.reason ?? (isWinner ? "Você venceu a partida." : "Melhor sorte na próxima.")}
      </div>

      <div className={styles.actions}>
        <Button variant="primary" fullWidth onClick={onNewGame}>
          <RiRestartLine size={15} />
          Nova Partida
        </Button>
        <Button variant="secondary" fullWidth onClick={onMenu}>
          <RiArrowLeftLine size={15} />
          Menu
        </Button>
      </div>
    </div>
  );
}

/* ── Draw ── */
function DrawModal({ reason, onNewGame, onMenu }: {
  reason: string; onNewGame: () => void; onMenu: () => void;
}) {
  return (
    <div className={`${styles.card} ${styles.cardDraw}`}>
      <div className={styles.iconWrap}>
        <RiShakeHandsLine className={`${styles.icon} ${styles.iconDraw}`} />
      </div>
      <div className={styles.resultLabel}>Empate</div>
      <div className={styles.resultSub}>{reason}</div>
      <div className={styles.actions}>
        <Button variant="primary" fullWidth onClick={onNewGame}>
          <RiRestartLine size={15} />
          Nova Partida
        </Button>
        <Button variant="secondary" fullWidth onClick={onMenu}>
          <RiArrowLeftLine size={15} />
          Menu
        </Button>
      </div>
    </div>
  );
}

/* ── Confirm resign ── */
function ConfirmResignModal({ onConfirm, onCancel }: {
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <RiFlagLine className={`${styles.icon} ${styles.iconDanger}`} />
      </div>
      <div className={styles.resultLabel}>Abandonar partida?</div>
      <div className={styles.resultSub}>
        Você perderá a partida e o oponente vencerá. Tem certeza?
      </div>
      <div className={styles.actions}>
        <Button variant="danger" fullWidth onClick={onConfirm}>
          <RiFlagLine size={15} />
          Sim, abandonar
        </Button>
        <Button variant="secondary" fullWidth onClick={onCancel}>
          <RiCloseLine size={15} />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/* ── Confirm draw offer ── */
function ConfirmDrawModal({ onConfirm, onCancel }: {
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <RiShakeHandsLine className={`${styles.icon} ${styles.iconDraw}`} />
      </div>
      <div className={styles.resultLabel}>Propor empate?</div>
      <div className={styles.resultSub}>
        O oponente pode aceitar ou recusar sua proposta de empate.
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={onConfirm}>
          <RiCheckLine size={15} />
          Propor empate
        </Button>
        <Button variant="ghost" fullWidth onClick={onCancel}>
          <RiCloseLine size={15} />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/* ── Draw offer received ── */
function DrawOfferModal({ onAccept, onDecline }: {
  onAccept: () => void; onDecline: () => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <RiShakeHandsLine className={`${styles.icon} ${styles.iconDraw}`} />
      </div>
      <div className={styles.resultLabel}>Empate proposto</div>
      <div className={styles.resultSub}>
        O oponente propôs um empate. Você aceita?
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={onAccept}>
          <RiCheckLine size={15} />
          Aceitar empate
        </Button>
        <Button variant="danger" fullWidth onClick={onDecline}>
          <RiCloseLine size={15} />
          Recusar
        </Button>
      </div>
    </div>
  );
}

/* ── Root ── */
export function GameModal({
  modal, onClose, onNewGame, onMenu,
  onResign, onAcceptDraw, onDeclineDraw, onOfferDraw,
}: GameModalProps) {
  const isResult = modal?.type === "victory" || modal?.type === "draw";

  return (
    <AnimatePresence>
      {modal && (
        <>
          <Backdrop onClick={isResult ? () => {} : onClose} />
          <motion.div
            className={styles.wrapper}
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.92,  y: 16 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          >
            {modal.type === "victory" && (
              <VictoryModal modal={modal} onNewGame={onNewGame} onMenu={onMenu} />
            )}
            {modal.type === "draw" && (
              <DrawModal reason={modal.reason} onNewGame={onNewGame} onMenu={onMenu} />
            )}
            {modal.type === "confirm-resign" && (
              <ConfirmResignModal onConfirm={onResign} onCancel={onClose} />
            )}
            {modal.type === "confirm-draw" && (
              <ConfirmDrawModal onConfirm={onOfferDraw ?? onAcceptDraw} onCancel={onClose} />
            )}
            {modal.type === "draw-offer" && (
              <DrawOfferModal onAccept={onAcceptDraw} onDecline={onDeclineDraw} />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
