import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  RiUserLine, RiTrophyLine, RiHistoryLine, RiBarChartLine,
  RiCalendarLine, RiFlashlightLine, RiEditLine, RiSettings3Line,
  RiLoader4Line,
} from "react-icons/ri";
import styles from "./Profile.module.css";
import { Button } from "@/components/ui/Button";
import { useAuthStore, AuthUser } from "@/store/authStore";
import { api } from "@/lib/api";

interface GameRecord {
  id: string;
  room_id: string | null;
  white_id: string | null;
  black_id: string | null;
  winner_id: string | null;
  time_control: string | null;
  draw_reason: string | null;
  bot_level: string | null;
  ended_at: string;
  white: { username: string; elo: number } | null;
  black: { username: string; elo: number } | null;
}

const BOT_LABEL: Record<string, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil", master: "Mestre" };

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export function Profile() {
  const navigate  = useNavigate();
  const authUser  = useAuthStore(s => s.user);
  const [user, setUser]       = useState<AuthUser | null>(authUser);
  const [games, setGames]     = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    Promise.all([
      api.get<{ user: AuthUser }>("/auth/me").then(d => setUser(d.user)),
      api.get<{ games: GameRecord[]; error?: string }>("/games/history")
        .then(d => setGames(d.games ?? []))
        .catch(() => setGames([])),
    ]).finally(() => setLoading(false));
  }, [authUser]);

  if (loading) return (
    <div className={styles.stateBox}>
      <RiLoader4Line size={24} className={styles.spinner} />
    </div>
  );

  if (!user) return (
    <div className={styles.stateBox}>
      <p>Faça login para ver seu perfil.</p>
      <Button onClick={() => navigate("/login")}>Entrar</Button>
    </div>
  );

  const total   = user.wins + user.losses + user.draws;
  const winRate = total > 0 ? Math.round((user.wins / total) * 1000) / 10 : 0;
  const joined  = new Date(user.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

  const STATS = [
    { label: "Partidas",  value: String(total)     },
    { label: "Vitórias",  value: String(user.wins)  },
    { label: "ELO",       value: String(user.elo)   },
    { label: "Empates",   value: String(user.draws) },
  ];

  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.inner}>

        {/* Hero card */}
        <motion.div className={styles.heroCard} variants={fadeUp} initial="hidden" animate="show">
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>{user.username[0].toUpperCase()}</div>
            <div className={styles.avatarBadge}><RiUserLine size={10} /></div>
          </div>
          <div className={styles.heroInfo}>
            <div className={styles.heroName}>{user.username}</div>
            <div className={styles.heroMeta}>
              <span className={styles.heroMetaItem}><RiCalendarLine size={12} /> Membro desde {joined}</span>
              <span className={styles.heroMetaItem}><RiTrophyLine size={12} /> {user.elo} ELO</span>
            </div>
            <div className={styles.heroStats}>
              {STATS.map(s => (
                <div key={s.label} className={styles.heroStat}>
                  <div className={styles.heroStatValue}>{s.value}</div>
                  <div className={styles.heroStatLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.heroActions}>
            <Button variant="primary" size="sm" onClick={() => navigate("/play")}>
              <RiFlashlightLine size={14} />Jogar
            </Button>
            <Button variant="secondary" size="sm">
              <RiEditLine size={14} />Editar
            </Button>
            <Button variant="ghost" size="sm">
              <RiSettings3Line size={14} />Config.
            </Button>
          </div>
        </motion.div>

        <motion.div
          className={styles.grid}
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          initial="hidden"
          animate="show"
        >
          {/* Performance */}
          <motion.div className={styles.card} variants={fadeUp}>
            <div className={styles.cardHeader}>
              <RiBarChartLine size={16} className={styles.cardHeaderIcon} />
              <span className={styles.cardTitle}>Desempenho</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>ELO Atual</span>
                <span className={`${styles.statValue} ${styles.statGreen}`}>{user.elo}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Vitórias</span>
                <span className={`${styles.statValue} ${styles.statGreen}`}>{user.wins}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Derrotas</span>
                <span className={`${styles.statValue} ${styles.statRed}`}>{user.losses}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Empates</span>
                <span className={styles.statValue}>{user.draws}</span>
              </div>
              <div className={styles.progressWrap}>
                <div className={styles.progressLabel}>
                  <span>Taxa de vitória</span>
                  <span>{winRate}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${winRate}%` }} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Match history */}
          <motion.div className={`${styles.card} ${styles.fullCard}`} variants={fadeUp}>
            <div className={styles.cardHeader}>
              <RiHistoryLine size={16} className={styles.cardHeaderIcon} />
              <span className={styles.cardTitle}>Histórico Recente</span>
            </div>
            <div className={styles.cardBody}>
              {games.length === 0 ? (
                <div className={styles.emptyHistory}>Nenhuma partida ainda.</div>
              ) : (
                <div className={styles.historyList}>
                  {games.map(g => {
                    const isBot    = g.bot_level !== null;
                    const isWhite  = g.white_id === user.id;
                    const opponent = isBot
                      ? `Bot — ${BOT_LABEL[g.bot_level!] ?? g.bot_level}`
                      : isWhite ? g.black?.username : g.white?.username;
                    const result   = g.winner_id === null ? "draw"
                                   : g.winner_id === user.id ? "win" : "loss";
                    const meta     = g.draw_reason
                      ? g.draw_reason
                      : g.time_control ?? (isBot ? "vs Bot" : "—");
                    return (
                      <div key={g.id} className={styles.historyItem}>
                        <div className={`${styles.historyResult} ${styles[result]}`}>
                          {result === "win" ? "+" : result === "loss" ? "−" : "="}
                        </div>
                        <div className={styles.historyInfo}>
                          <div className={styles.historyOpponent}>{opponent ?? "—"}</div>
                          <div className={styles.historyMeta}>
                            {meta} · {formatAgo(g.ended_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>

      </div>
    </motion.div>
  );
}
