import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  RiMailLine, RiLockLine, RiEyeLine, RiEyeOffLine,
  RiGoogleLine, RiGithubLine, RiAlertLine, RiArrowRightLine,
} from "react-icons/ri";
import styles from "./Login.module.css";
import { Button } from "@/components/ui/Button";
import { MiniBoard } from "@/components/board/MiniBoard";
import { useAuthStore } from "@/store/authStore";

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Preencha todos os campos."); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Left decorative panel ── */}
      <div className={styles.left}>
        <div className={styles.leftBg} />
        <motion.div
          className={styles.boardWrap}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <MiniBoard size="320px" />
        </motion.div>
        <motion.div
          className={styles.leftQuote}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className={styles.leftQuoteText}>
            "O tabuleiro é o espelho da mente."
          </div>
          <div className={styles.leftQuoteSub}>Jogue. Aprenda. Evolua.</div>
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className={styles.right}>
        <motion.div
          className={styles.form}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0  }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Header */}
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Entrar</h1>
            <p className={styles.formSubtitle}>
              Não tem conta?{" "}
              <Link to="/register">Cadastre-se grátis</Link>
            </p>
          </div>

          {/* OAuth */}
          <div className={styles.oauthRow}>
            <button className={styles.oauthBtn} type="button">
              <RiGoogleLine size={16} />
              Google
            </button>
            <button className={styles.oauthBtn} type="button">
              <RiGithubLine size={16} />
              GitHub
            </button>
          </div>

          <div className={styles.divider}>ou continue com e-mail</div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">E-mail</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><RiMailLine size={15} /></span>
                  <input
                    id="email"
                    type="email"
                    className={styles.input}
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">Senha</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><RiLockLine size={15} /></span>
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className={styles.input}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.inputRight}
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPw ? <RiEyeOffLine size={15} /> : <RiEyeLine size={15} />}
                  </button>
                </div>
                <div className={styles.forgotRow}>
                  <a href="#" className={styles.forgot}>Esqueceu a senha?</a>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className={styles.error}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <RiAlertLine size={14} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={styles.submit}>
                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? "Entrando…" : (
                    <><RiArrowRightLine size={15} />Entrar</>
                  )}
                </Button>
              </div>

            </div>
          </form>

          <div className={styles.guestRow}>
            Prefere não criar conta?{" "}
            <button className={styles.guestLink} onClick={() => navigate("/play")}>
              Jogar como visitante
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
