import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { RiArrowLeftLine, RiHome4Line } from "react-icons/ri";
import styles from "./NotFound.module.css";
import { Button } from "@/components/ui/Button";
import { MiniBoard } from "@/components/board/MiniBoard";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.inner}>
        <div className={styles.boardWrap}>
          <MiniBoard />
          <div className={styles.boardOverlay}>
            <span className={styles.code}>404</span>
          </div>
        </div>
        <div className={styles.text}>
          <h1 className={styles.title}>Página não encontrada</h1>
          <p className={styles.desc}>
            Esta casa não existe no tabuleiro. Volte ao início e tente outro caminho.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => navigate(-1)} variant="secondary">
              <RiArrowLeftLine size={15} />
              Voltar
            </Button>
            <Button onClick={() => navigate("/")}>
              <RiHome4Line size={15} />
              Início
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
