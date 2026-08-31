import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  RiTrophyLine,
  RiGroupLine,
  RiTimeLine,
  RiCalendarLine,
  RiFlashlightLine,
  RiArrowRightLine,
  RiSwordLine,
  RiVipCrownLine,
  RiMedalLine,
  RiFocus3Line,
  RiAwardLine,
} from "react-icons/ri";
import styles from "./Tournaments.module.css";
import { Button } from "@/components/ui/Button";

const TOURNAMENTS = [
  {
    name: "Arena Relâmpago",
    type: "Bala · 3 min",
    players: 24,
    maxPlayers: 32,
    status: "live",
    prize: "500 pts",
    Icon: RiFlashlightLine,
    iconBg: "rgba(129,182,76,0.12)",
    iconColor: "#81b64c",
    starts: "Ao vivo",
  },
  {
    name: "Torneio Semanal",
    type: "Rápida · 10 min",
    players: 48,
    maxPlayers: 64,
    status: "live",
    prize: "1.000 pts",
    Icon: RiTrophyLine,
    iconBg: "rgba(240,192,64,0.12)",
    iconColor: "#f0c040",
    starts: "Ao vivo",
  },
  {
    name: "Copa Nordeste",
    type: "Clássica · 30 min",
    players: 12,
    maxPlayers: 16,
    status: "upcoming",
    prize: "2.500 pts",
    Icon: RiFocus3Line,
    iconBg: "rgba(91,155,213,0.12)",
    iconColor: "#5b9bd5",
    starts: "Em 2h 30m",
  },
  {
    name: "Desafio Mestre",
    type: "Rápida · 5 min",
    players: 0,
    maxPlayers: 8,
    status: "upcoming",
    prize: "800 pts",
    Icon: RiVipCrownLine,
    iconBg: "rgba(155,89,182,0.12)",
    iconColor: "#9b59b6",
    starts: "Amanhã 20h",
  },
  {
    name: "Arena Clássica #12",
    type: "Clássica · 45 min",
    players: 16,
    maxPlayers: 16,
    status: "finished",
    prize: "3.000 pts",
    Icon: RiAwardLine,
    iconBg: "rgba(80,80,80,0.12)",
    iconColor: "#888",
    starts: "Encerrado",
  },
];

const STATUS_LABEL: Record<string, string> = {
  live: "Ao vivo",
  upcoming: "Em breve",
  finished: "Encerrado",
};

const STATUS_CLASS: Record<string, string> = {
  live: styles.statusLive,
  upcoming: styles.statusUpcoming,
  finished: styles.statusFinished,
};

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export function Tournaments() {
  const navigate = useNavigate();

  const live     = TOURNAMENTS.filter(t => t.status === "live");
  const upcoming = TOURNAMENTS.filter(t => t.status === "upcoming");
  const finished = TOURNAMENTS.filter(t => t.status === "finished");

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}><RiTrophyLine size={20} /></div>
            <div>
              <h1 className={styles.title}>Torneios</h1>
              <p className={styles.subtitle}>Arenas abertas — qualquer jogador pode vencer</p>
            </div>
          </div>
          <Button onClick={() => navigate("/play")}>
            <RiFlashlightLine size={14} />
            Jogar Agora
          </Button>
        </div>

        {/* Live banner */}
        <motion.div className={styles.liveBanner} variants={fadeUp} initial="hidden" animate="show">
          <div className={styles.liveBannerLeft}>
            <div className={styles.liveDot} />
            <div>
              <div className={styles.liveBannerTitle}>2 torneios ao vivo agora</div>
              <div className={styles.liveBannerMeta}>Entre a qualquer momento — pontos distribuídos por posição</div>
            </div>
          </div>
          <div className={styles.liveBannerStats}>
            <div className={styles.liveStat}>
              <div className={styles.liveStatValue}>72</div>
              <div className={styles.liveStatLabel}>Jogadores</div>
            </div>
            <div className={styles.liveStat}>
              <div className={styles.liveStatValue}>2</div>
              <div className={styles.liveStatLabel}>Ao vivo</div>
            </div>
          </div>
        </motion.div>

        {/* Live */}
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          initial="hidden"
          animate="show"
        >
          <div className={styles.sectionTitle}>Ao vivo</div>
          <div className={styles.cards}>
            {live.map(t => <TournamentCard key={t.name} t={t} />)}
          </div>
        </motion.div>

        {/* Upcoming */}
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className={styles.sectionTitle}>Em breve</div>
          <div className={styles.cards}>
            {upcoming.map(t => <TournamentCard key={t.name} t={t} />)}
          </div>
        </motion.div>

        {/* Finished */}
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className={styles.sectionTitle}>Encerrados</div>
          <div className={styles.cards}>
            {finished.map(t => <TournamentCard key={t.name} t={t} />)}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

function TournamentCard({ t }: { t: typeof TOURNAMENTS[number] }) {
  const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
  return (
    <motion.div className={styles.card} variants={fadeUp}>
      <div className={styles.cardIcon} style={{ background: t.iconBg, color: t.iconColor }}>
        <t.Icon size={20} />
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.cardName}>{t.name}</div>
        <div className={styles.cardMeta}>
          <span className={styles.cardMetaItem}><RiTimeLine size={11} />{t.type}</span>
          <span className={styles.cardMetaItem}><RiGroupLine size={11} />{t.players}/{t.maxPlayers}</span>
          <span className={styles.cardMetaItem}><RiCalendarLine size={11} />{t.starts}</span>
        </div>
      </div>
      <div className={styles.cardRight}>
        <span className={`${styles.statusBadge} ${STATUS_CLASS[t.status]}`}>
          {t.status === "live" && <span className={styles.livePulse} />}
          {STATUS_LABEL[t.status]}
        </span>
        <span className={styles.prize}>{t.prize}</span>
      </div>
      {t.status !== "finished" && (
        <Button variant="secondary" size="sm">
          <RiArrowRightLine size={13} />
          Entrar
        </Button>
      )}
    </motion.div>
  );
}
