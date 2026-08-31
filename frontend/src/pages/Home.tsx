import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  RiFlashlightLine,
  RiShieldCheckLine,
  RiBarChartLine,
  RiHistoryLine,
  RiArrowRightLine,
  RiGroupLine,
} from "react-icons/ri";
import styles from "./Home.module.css";
import { Button } from "@/components/ui/Button";
import { MiniBoard } from "@/components/board/MiniBoard";

const FEATURES = [
  {
    icon: RiFlashlightLine,
    title: "Multijogador em Tempo Real",
    desc: "Jogue contra amigos instantaneamente via links de sala compartilháveis. Sem conta necessária.",
  },
  {
    icon: RiShieldCheckLine,
    title: "Regras Clássicas de Damas",
    desc: "Tabuleiro 8×8 padrão com capturas obrigatórias, múltiplos saltos e promoção a dama.",
  },
  {
    icon: RiBarChartLine,
    title: "Classificação ELO",
    desc: "Compita globalmente. Acompanhe sua posição, taxa de vitórias e pontuação ao longo do tempo.",
  },
  {
    icon: RiHistoryLine,
    title: "Histórico de Partidas",
    desc: "Revise cada jogo lance a lance. Aprenda com suas vitórias e derrotas.",
  },
];

const STATS = [
  { value: "12.400+", label: "Partidas hoje",    icon: RiFlashlightLine },
  { value: "3.200+",  label: "Jogadores online", icon: RiGroupLine      },
  { value: "98ms",    label: "Latência média",   icon: RiBarChartLine   },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0  },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

export function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroText}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div className={styles.badge} variants={fadeUp}>
            <span className={styles.dot} />
            Ao vivo agora
          </motion.div>

          <motion.h1 className={styles.title} variants={fadeUp}>
            Jogue <span>Damas</span><br />online, grátis.
          </motion.h1>

          <motion.p className={styles.subtitle} variants={fadeUp}>
            O clássico jogo de tabuleiro — multijogador em tempo real,
            sem downloads, sem anúncios. Só jogar.
          </motion.p>

          <motion.div className={styles.cta} variants={fadeUp}>
            <Button size="lg" onClick={() => navigate("/play")}>
              Jogar Agora
              <RiArrowRightLine />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/play?mode=friend")}>
              <RiGroupLine />
              Jogar com Amigo
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.heroBoard}
          initial={{ opacity: 0, scale: 0.92, x: 40 }}
          animate={{ opacity: 1, scale: 1,    x: 0  }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <MiniBoard />
        </motion.div>
      </section>

      {/* Stats */}
      <motion.div
        className={styles.stats}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.statsInner}>
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className={styles.stat}>
              <div className={styles.statIcon}><Icon size={18} /></div>
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Features */}
      <section className={styles.features}>
        <motion.h2
          className={styles.sectionTitle}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          Tudo que você precisa para jogar
        </motion.h2>

        <motion.div
          className={styles.grid}
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} className={styles.card} variants={fadeUp}>
              <div className={styles.cardIconWrap}>
                <Icon size={22} />
              </div>
              <div className={styles.cardTitle}>{title}</div>
              <p className={styles.cardDesc}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
