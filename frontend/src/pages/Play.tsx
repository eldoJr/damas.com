import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  RiFlashlightLine,
  RiRobotLine,
  RiLinksLine,
  RiTrophyLine,
  RiHistoryLine,
  RiBarChartLine,
  RiArrowRightSLine,
  RiArrowLeftLine,
  RiLoginBoxLine,
  RiUserLine,
  RiTimeLine,
  RiCloseLine,
  RiLoader4Line,
} from "react-icons/ri";
import styles from "./Play.module.css";
import { DragBoard } from "@/components/board/DragBoard";
import { Button } from "@/components/ui/Button";
import { useSocketStore } from "@/store/socketStore";
import { useAuthStore } from "@/store/authStore";

/* ── Time controls ──────────────────────────────── */
interface TimeControl {
  label: string;
  value: string;
  seconds: number;
  increment?: number;
}

const TIME_GROUPS: { category: string; icon: React.ElementType; controls: TimeControl[] }[] = [
  {
    category: "Bala",
    icon: RiFlashlightLine,
    controls: [
      { label: "1 min",  value: "1:00", seconds: 60  },
      { label: "2+1",    value: "2:00", seconds: 120, increment: 1 },
      { label: "3 min",  value: "3:00", seconds: 180 },
    ],
  },
  {
    category: "Rápida",
    icon: RiTimeLine,
    controls: [
      { label: "5 min",  value: "5:00",  seconds: 300 },
      { label: "10 min", value: "10:00", seconds: 600 },
      { label: "15+10",  value: "15:00", seconds: 900, increment: 10 },
    ],
  },
  {
    category: "Clássica",
    icon: RiBarChartLine,
    controls: [
      { label: "30 min",   value: "30:00", seconds: 1800 },
      { label: "45+45",    value: "45:00", seconds: 2700, increment: 45 },
      { label: "Sem lim.", value: "∞",     seconds: 0    },
    ],
  },
];

const ALL_CONTROLS = TIME_GROUPS.flatMap(g => g.controls);

/* ── Time picker ────────────────────────────────── */
function TimePicker({ selected, onChange }: { selected: TimeControl; onChange: (t: TimeControl) => void }) {
  return (
    <div className={styles.timePicker}>
      {TIME_GROUPS.map(group => {
        const Icon = group.icon;
        return (
          <div key={group.category} className={styles.timeGroup}>
            <div className={styles.timeGroupLabel}>
              <Icon size={11} />
              {group.category}
            </div>
            <div className={styles.timeRow}>
              {group.controls.map(tc => (
                <button
                  key={tc.label}
                  className={`${styles.timeBtn} ${selected.label === tc.label ? styles.timeBtnActive : ""}`}
                  onClick={() => onChange(tc)}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Searching panel ────────────────────────────── */
function SearchingPanel({ time, onCancel }: { time: TimeControl; onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <motion.div
      className={styles.searchingPanel}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.searchingRing}>
        <RiLoader4Line size={26} className={styles.searchingSpinner} />
      </div>

      <div className={styles.searchingTitle}>Procurando oponente…</div>

      <div className={styles.searchingMeta}>
        <span className={styles.searchingTimeLabel}>{time.label}</span>
        <span className={styles.searchingDot} />
        <span className={styles.searchingElapsed}>{fmt(elapsed)}</span>
      </div>

      <div className={styles.searchingBars}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={styles.searchingBar} style={{ animationDelay: `${i * 0.14}s` }} />
        ))}
      </div>

      <button className={styles.cancelBtn} onClick={onCancel}>
        <RiCloseLine size={13} />
        Cancelar
      </button>
    </motion.div>
  );
}

/* ── Bot levels ─────────────────────────────────── */
const BOT_LEVELS = [
  { label: "Fácil",   elo: "400",  color: "#81b64c" },
  { label: "Médio",   elo: "800",  color: "#e8a838" },
  { label: "Difícil", elo: "1200", color: "#e05252" },
  { label: "Mestre",  elo: "1800", color: "#9b59b6" },
];

/* ── Panel components ───────────────────────────── */
function OnlinePanel({
  time, onTimeChange, searching, onSearch, onCancel,
}: {
  time: TimeControl;
  onTimeChange: (t: TimeControl) => void;
  searching: boolean;
  onSearch: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {searching ? (
        <SearchingPanel key="searching" time={time} onCancel={onCancel} />
      ) : (
        <motion.div
          key="form"
          className={styles.onlineForm}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
        >
          <p className={styles.panelDesc}>
            Seja pareado com um jogador de nível similar. Escolha o controle de tempo:
          </p>
          <TimePicker selected={time} onChange={onTimeChange} />
          <Button fullWidth onClick={onSearch}>
            <RiFlashlightLine size={15} />
            Encontrar Partida · {time.label}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BotsPanel({ time, onTimeChange }: { time: TimeControl; onTimeChange: (t: TimeControl) => void }) {
  const navigate = useNavigate();
  const [level, setLevel] = useState(0);
  const levelKeys = ["easy", "medium", "hard", "master"] as const;
  return (
    <>
      <div className={styles.botGrid}>
        {BOT_LEVELS.map((b, i) => (
          <button
            key={b.label}
            className={`${styles.botBtn} ${level === i ? styles.botBtnActive : ""}`}
            style={{ "--bot-color": b.color } as React.CSSProperties}
            onClick={() => setLevel(i)}
          >
            <RiRobotLine size={15} />
            <span className={styles.botLabel}>{b.label}</span>
            <span className={styles.botElo}>{b.elo} ELO</span>
          </button>
        ))}
      </div>
      <TimePicker selected={time} onChange={onTimeChange} />
      <Button fullWidth onClick={() => navigate(`/bot/${levelKeys[level]}?t=${time.seconds}`)}>
        <RiRobotLine size={15} />
        Jogar · {BOT_LEVELS[level].label} · {time.label}
      </Button>
    </>
  );
}

function FriendPanel({
  time, onTimeChange, onPlay,
}: {
  time: TimeControl;
  onTimeChange: (t: TimeControl) => void;
  onPlay: () => void;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const join = () => { if (code.trim()) navigate(`/game/${code.trim().toUpperCase()}`); };

  return (
    <>
      <TimePicker selected={time} onChange={onTimeChange} />
      <Button fullWidth variant="secondary" onClick={onPlay}>
        <RiLinksLine size={15} />
        Criar Sala · {time.label}
      </Button>
      <div className={styles.orRow}><span>ou entre com um código</span></div>
      <div className={styles.joinRow}>
        <input
          className={styles.input}
          placeholder="Código da sala"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && join()}
          maxLength={6}
          spellCheck={false}
        />
        <Button variant="secondary" onClick={join}>
          <RiLoginBoxLine size={15} />
          Entrar
        </Button>
      </div>
    </>
  );
}

/* ── Menu definition ────────────────────────────── */
type PanelId = "online" | "bots" | "friend";

const MENU = [
  { id: "online"  as PanelId, icon: RiFlashlightLine, label: "Jogar Online",     desc: "Contra jogador de nível similar",      action: "panel"    },
  { id: "bots"    as PanelId, icon: RiRobotLine,      label: "Jogar contra Bot", desc: "Do Fácil ao Mestre",                   action: "panel"    },
  { id: "friend"  as PanelId, icon: RiLinksLine,      label: "Jogar com Amigo",  desc: "Sala privada com link compartilhável", action: "panel"    },
  { id: null,                 icon: RiTrophyLine,      label: "Torneios",         desc: "Arenas abertas a todos",               action: "navigate", to: "/tournaments" },
  { id: null,                 icon: RiHistoryLine,     label: "Histórico",        desc: "Revise suas partidas anteriores",      action: "navigate", to: "/profile"     },
  { id: null,                 icon: RiBarChartLine,    label: "Classificação",    desc: "Ranking global por ELO",               action: "navigate", to: "/leaderboard" },
] as const;

/* ── Main ───────────────────────────────────────── */
export function Play() {
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const { joinQueue, leaveQueue, phase, roomId } = useSocketStore();

  const [panel, setPanel]       = useState<PanelId | null>(null);
  const [time, setTime]         = useState<TimeControl>(ALL_CONTROLS[3]); // 5 min default
  const searching               = panel === "online" && phase === "matchmaking";

  // Navigate to game once match is found
  useEffect(() => {
    if (phase === "waiting" && roomId) {
      navigate(`/game/${roomId}`);
    }
  }, [phase, roomId, navigate]);

  // Clean up queue if user navigates away from online panel
  useEffect(() => {
    if (panel !== "online" && phase === "matchmaking") {
      leaveQueue();
    }
  }, [panel]);

  const handleSearch = () => {
    joinQueue(time.label, user?.elo);
  };

  const handleCancel = () => {
    leaveQueue();
  };

  const handleBack = () => {
    if (searching) leaveQueue();
    setPanel(null);
  };

  const createRoom = () => {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    navigate(`/game/${id}`);
  };

  const clockDisplay = time.seconds === 0 ? "∞" : time.value;

  return (
    <motion.div
      className={styles.page}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.layout}>

        {/* ── Board column ── */}
        <div className={styles.boardColumn}>

          <div className={styles.playerBar}>
            <div className={styles.playerInfo}>
              <div className={styles.avatar}><RiUserLine size={14} /></div>
              <div>
                <div className={styles.playerName}>Oponente</div>
                <div className={styles.playerRating}>— ELO</div>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={clockDisplay}
                className={`${styles.clock} ${panel ? styles.clockSet : ""}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                <RiTimeLine size={12} />
                <span>{panel ? clockDisplay : "--:--"}</span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={styles.boardWrap}>
            <DragBoard />
          </div>

          <div className={`${styles.playerBar} ${styles.playerBarSelf}`}>
            <div className={styles.playerInfo}>
              <div className={`${styles.avatar} ${styles.avatarSelf}`}><RiUserLine size={14} /></div>
              <div>
                <div className={styles.playerName}>{user?.username ?? "Você (Visitante)"}</div>
                <div className={styles.playerRating}>{user ? `${user.elo} ELO` : "— ELO"}</div>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={clockDisplay}
                className={`${styles.clock} ${panel ? styles.clockSet : ""}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                <RiTimeLine size={12} />
                <span>{panel ? clockDisplay : "--:--"}</span>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>

          <div className={styles.sideHeader}>
            <AnimatePresence mode="wait">
              {panel ? (
                <motion.button
                  key="back"
                  className={styles.backBtn}
                  onClick={handleBack}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <RiArrowLeftLine size={14} />
                  {MENU.find(m => m.id === panel)?.label}
                </motion.button>
              ) : (
                <motion.span
                  key="title"
                  className={styles.sideTitle}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  Jogar
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className={styles.sideBody}>
            <AnimatePresence mode="wait">

              {!panel && (
                <motion.nav
                  key="menu"
                  className={styles.menu}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  {MENU.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        className={styles.menuItem}
                        onClick={() => {
                          if (item.action === "panel" && item.id) setPanel(item.id);
                          else if (item.action === "navigate" && "to" in item) navigate(item.to);
                        }}
                      >
                        <div className={styles.menuIcon}><Icon size={17} /></div>
                        <div className={styles.menuText}>
                          <span className={styles.menuLabel}>{item.label}</span>
                          <span className={styles.menuDesc}>{item.desc}</span>
                        </div>
                        <RiArrowRightSLine size={15} className={styles.menuArrow} />
                      </button>
                    );
                  })}
                </motion.nav>
              )}

              {panel && (
                <motion.div
                  key={panel}
                  className={styles.panelContent}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.18 }}
                >
                  {panel === "online" && (
                    <OnlinePanel
                      time={time}
                      onTimeChange={setTime}
                      searching={searching}
                      onSearch={handleSearch}
                      onCancel={handleCancel}
                    />
                  )}
                  {panel === "bots"   && <BotsPanel   time={time} onTimeChange={setTime} />}
                  {panel === "friend" && <FriendPanel time={time} onTimeChange={setTime} onPlay={createRoom} />}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </aside>
      </div>
    </motion.div>
  );
}
