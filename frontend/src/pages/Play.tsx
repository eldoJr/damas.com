import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { RiFlashlightLine, RiLinksLine, RiArrowRightLine, RiLoginBoxLine } from "react-icons/ri";
import styles from "./Play.module.css";
import { Button } from "@/components/ui/Button";

export function Play() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");

  const createRoom = () => {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    navigate(`/game/${id}`);
  };

  const joinRoom = () => {
    if (roomCode.trim()) navigate(`/game/${roomCode.trim().toUpperCase()}`);
  };

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className={styles.title}>Jogar Damas</h1>
        <p className={styles.subtitle}>Crie uma sala ou entre na partida de um amigo</p>

        <div className={styles.cards}>
          {/* Quick play */}
          <motion.div
            className={styles.card}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
          >
            <div className={styles.cardIconWrap}>
              <RiFlashlightLine size={24} />
            </div>
            <h2 className={styles.cardTitle}>Partida Rápida</h2>
            <p className={styles.cardDesc}>
              Seja pareado com um oponente aleatório instantaneamente.
            </p>
            <Button fullWidth onClick={createRoom}>
              Encontrar Partida
              <RiArrowRightLine />
            </Button>
          </motion.div>

          <div className={styles.divider}>
            <span>ou</span>
          </div>

          {/* Play a friend */}
          <motion.div
            className={styles.card}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
          >
            <div className={styles.cardIconWrap}>
              <RiLinksLine size={24} />
            </div>
            <h2 className={styles.cardTitle}>Jogar com Amigo</h2>
            <p className={styles.cardDesc}>
              Crie uma sala privada e compartilhe o link.
            </p>
            <Button fullWidth variant="secondary" onClick={createRoom}>
              <RiLinksLine />
              Criar Sala
            </Button>
            <div className={styles.joinRow}>
              <input
                className={styles.input}
                placeholder="Código da sala"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && joinRoom()}
                maxLength={6}
                spellCheck={false}
              />
              <Button variant="secondary" onClick={joinRoom}>
                <RiLoginBoxLine />
                Entrar
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
