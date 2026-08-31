import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { RiSwordLine, RiTrophyLine, RiUserLine, RiMenuLine, RiCloseLine, RiLogoutBoxLine } from "react-icons/ri";
import styles from "./Navbar.module.css";
import { Logo } from "./Logo";
import { Button } from "./Button";
import { useAuthStore } from "@/store/authStore";

const NAV_LINKS = [
  { to: "/play",        label: "Jogar",        icon: RiSwordLine  },
  { to: "/leaderboard", label: "Classificação", icon: RiTrophyLine },
  { to: "/profile",     label: "Perfil",        icon: RiUserLine   },
];

export function Navbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <>
      <motion.header
        className={styles.navbar}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            <Logo />
            <span className={styles.brandName}>damas<span className={styles.brandDot}>.com</span></span>
          </Link>

          <nav className={styles.nav}>
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.active}` : styles.link
                }
              >
                <Icon className={styles.linkIcon} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.actions}>
            {user ? (
              <>
                <span className={styles.navUser}><RiUserLine size={13} />{user.username}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <RiLogoutBoxLine size={13} />Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Entrar</Button>
                <Button variant="primary" size="sm" onClick={() => navigate("/register")}>Cadastrar</Button>
              </>
            )}
          </div>

          <button
            className={styles.menuBtn}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <RiCloseLine size={22} /> : <RiMenuLine size={22} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink
                }
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <div className={styles.mobileDivider} />
            {user ? (
              <Button variant="ghost" size="sm" fullWidth onClick={handleLogout}>
                <RiLogoutBoxLine size={13} />Sair
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" fullWidth onClick={() => { navigate("/login"); setMobileOpen(false); }}>Entrar</Button>
                <Button variant="primary" size="sm" fullWidth onClick={() => { navigate("/register"); setMobileOpen(false); }}>Cadastrar</Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
