import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  RiUserLine, RiMailLine, RiLockLine, RiEyeLine, RiEyeOffLine,
  RiGoogleLine, RiGithubLine, RiAlertLine, RiCheckLine,
  RiArrowRightLine, RiShieldCheckLine,
} from "react-icons/ri";
import styles from "./Register.module.css";
import { Button } from "@/components/ui/Button";
import { MiniBoard } from "@/components/board/MiniBoard";
import { useAuthStore } from "@/store/authStore";

/* ── Password strength ── */
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)            score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Muito fraca", color: "#e05252" },
    { label: "Fraca",       color: "#e05252" },
    { label: "Razoável",    color: "#e8a838" },
    { label: "Boa",         color: "#81b64c" },
    { label: "Forte",       color: "#81b64c" },
  ];
  return { score, ...map[score] };
}

export function Register() {
  const navigate = useNavigate();
  const register = useAuthStore(s => s.register);
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [terms, setTerms]       = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const strength  = useMemo(() => getStrength(password), [password]);
  const pwMatch   = confirm.length > 0 && password === confirm;
  const pwNoMatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !email || !password || !confirm) { setError("Preencha todos os campos."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    if (strength.score < 2)  { setError("Escolha uma senha mais forte."); return; }
    if (!terms)               { setError("Aceite os termos para continuar."); return; }
    setLoading(true);
    try {
      await register(username, email, password);
      navigate("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
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
            Crie sua conta e entre para o ranking global.
          </div>
          <div className={styles.leftQuoteSub}>Grátis para sempre. Sem anúncios.</div>
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
            <h1 className={styles.formTitle}>Criar conta</h1>
            <p className={styles.formSubtitle}>
              Já tem conta?{" "}
              <Link to="/login">Entrar</Link>
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

          <div className={styles.divider}>ou cadastre com e-mail</div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="username">Nome de usuário</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><RiUserLine size={15} /></span>
                  <input
                    id="username"
                    type="text"
                    className={styles.input}
                    placeholder="seunome"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/\s/g, ""))}
                    autoComplete="username"
                    autoFocus
                    maxLength={20}
                    spellCheck={false}
                  />
                </div>
              </div>

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
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
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
                {/* Strength meter */}
                <AnimatePresence>
                  {password.length > 0 && (
                    <motion.div
                      className={styles.strengthWrap}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className={styles.strengthBars}>
                        {[0,1,2,3].map(i => (
                          <div
                            key={i}
                            className={styles.strengthBar}
                            style={{ background: i < strength.score ? strength.color : undefined }}
                          />
                        ))}
                      </div>
                      <span className={styles.strengthLabel} style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm">Confirmar senha</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}><RiShieldCheckLine size={15} /></span>
                  <input
                    id="confirm"
                    type={showCf ? "text" : "password"}
                    className={`${styles.input} ${pwMatch ? styles.inputValid : ""} ${pwNoMatch ? styles.inputInvalid : ""}`}
                    placeholder="Repita a senha"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.inputRight}
                    onClick={() => setShowCf(v => !v)}
                    aria-label={showCf ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showCf ? <RiEyeOffLine size={15} /> : <RiEyeLine size={15} />}
                  </button>
                  {pwMatch && (
                    <span className={styles.inputValidIcon}><RiCheckLine size={14} /></span>
                  )}
                </div>
              </div>

              {/* Terms */}
              <label className={styles.termsRow}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={terms}
                  onChange={e => setTerms(e.target.checked)}
                />
                <span className={styles.termsText}>
                  Concordo com os{" "}
                  <a href="#" className={styles.termsLink}>Termos de Uso</a>
                  {" "}e a{" "}
                  <a href="#" className={styles.termsLink}>Política de Privacidade</a>
                </span>
              </label>

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
                  {loading ? "Criando conta…" : (
                    <><RiArrowRightLine size={15} />Criar conta</>
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
