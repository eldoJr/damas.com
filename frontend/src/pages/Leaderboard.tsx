import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  RiTrophyLine, RiArrowUpLine, RiArrowDownLine,
  RiMedalLine, RiFireLine, RiSearchLine, RiLoader4Line,
} from "react-icons/ri";
import styles from "./Leaderboard.module.css";
import { api } from "@/lib/api";

interface Player {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  rank: number;
}

const TABS = ["Global", "Semanal", "Mensal"] as const;
type Tab = typeof TABS[number];

const MEDAL: Record<number, string> = { 1: styles.gold, 2: styles.silver, 3: styles.bronze };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export function Leaderboard() {
  const [tab, setTab]         = useState<Tab>("Global");
  const [search, setSearch]   = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get<{ players: Player[] }>("/leaderboard")
      .then(d => setPlayers(d.players))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  const filtered = players.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.inner}>

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}><RiTrophyLine size={20} /></div>
            <div>
              <h1 className={styles.title}>Classificação</h1>
              <p className={styles.subtitle}>Ranking global por ELO e desempenho</p>
            </div>
          </div>
          <div className={styles.searchWrap}>
            <RiSearchLine size={14} className={styles.searchIcon} />
            <input
              className={styles.search}
              placeholder="Buscar jogador…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
              onClick={() => setTab(t)}
            >{t}</button>
          ))}
        </div>

        {loading && (
          <div className={styles.stateBox}>
            <RiLoader4Line size={24} className={styles.spinner} />
            <span>Carregando…</span>
          </div>
        )}

        {error && <div className={styles.stateBox}>{error}</div>}

        {!loading && !error && (
          <>
            {/* Top 3 podium */}
            <motion.div
              className={styles.podium}
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
            >
              {filtered.slice(0, 3).map(p => (
                <motion.div key={p.id} className={`${styles.podiumCard} ${MEDAL[p.rank] ?? ""}`} variants={fadeUp}>
                  <div className={styles.podiumRank}>
                    <RiMedalLine size={18} />
                    <span>#{p.rank}</span>
                  </div>
                  <div className={styles.podiumName}>{p.username}</div>
                  <div className={styles.podiumElo}>{p.elo} <span>ELO</span></div>
                  <div className={styles.podiumStats}>
                    <span>{p.wins}V</span>
                    <span>{p.winRate}%</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Table */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th><th>Jogador</th><th>ELO</th>
                    <th>Vitórias</th><th>Derrotas</th>
                    <th>Taxa</th><th>Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      className={styles.row}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                    >
                      <td className={styles.rankCell}>
                        <span className={`${styles.rankBadge} ${MEDAL[p.rank] ?? ""}`}>{p.rank}</span>
                      </td>
                      <td className={styles.nameCell}>
                        <div className={styles.avatar}>{p.username[0].toUpperCase()}</div>
                        <span>{p.username}</span>
                      </td>
                      <td className={styles.eloCell}>{p.elo}</td>
                      <td className={styles.winsCell}>{p.wins}</td>
                      <td className={styles.lossCell}>{p.losses}</td>
                      <td>
                        <div className={styles.rateBar}>
                          <div className={styles.rateBarFill} style={{ width: `${p.winRate}%` }} />
                          <span>{p.winRate}%</span>
                        </div>
                      </td>
                      <td>
                        {p.wins > p.losses
                          ? <RiArrowUpLine   size={14} className={styles.trendUp}   />
                          : p.wins < p.losses
                          ? <RiArrowDownLine size={14} className={styles.trendDown} />
                          : <span className={styles.trendSame}>—</span>
                        }
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </motion.div>
  );
}
