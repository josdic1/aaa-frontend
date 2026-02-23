// src/components/NavBar.jsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isStaff = user.role === "staff" || isAdmin;

  const roleColor =
    user.role === "admin"
      ? "#2e7d32"
      : user.role === "staff"
        ? "#c8783c"
        : "#888";

  const active = (path) => ({
    ...s.link,
    ...(pathname === path || pathname.startsWith(path + "/")
      ? s.linkActive
      : {}),
  });

  return (
    <nav style={s.nav}>
      <div style={s.left}>
        <Link to="/" style={s.logo}>
          Abeyton Lodge
        </Link>

        <div style={s.links}>
          {/* ALL ROLES */}
          <Link to="/" style={active("/home")}>
            Home
          </Link>
          <Link to="/menu" style={active("/menu")}>
            Menu
          </Link>
          <Link to="/members" style={active("/members")}>
            Members
          </Link>

          {/* STAFF + ADMIN */}
          {isStaff && (
            <Link to="/floor" style={active("/floor")}>
              Floor
            </Link>
          )}

          {/* ADMIN ONLY */}
          {isAdmin && (
            <>
              <Link to="/admin" style={active("/admin")}>
                Admin
              </Link>
              <Link to="/overlord" style={active("/overlord")}>
                Overlord
              </Link>
            </>
          )}
        </div>
      </div>

      <div style={s.right}>
        <span style={s.email}>{user.email}</span>
        <span
          style={{ ...s.roleBadge, color: roleColor, borderColor: roleColor }}
        >
          {user.role}
        </span>
        <button style={s.logoutBtn} onClick={logout}>
          ↪ Sign Out
        </button>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 32px",
    height: "56px",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    background: "white",
    position: "sticky",
    top: 0,
    zIndex: 100,
    flexShrink: 0,
  },
  left: { display: "flex", alignItems: "center", gap: "32px" },
  right: { display: "flex", alignItems: "center", gap: "12px" },
  logo: {
    fontFamily: "Playfair Display, serif",
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "var(--accent)",
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  links: { display: "flex", alignItems: "center", gap: "4px" },
  link: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    textDecoration: "none",
    padding: "4px 10px",
    borderRadius: "var(--radius-sm)",
    transition: "color 0.1s",
  },
  linkActive: {
    color: "var(--text)",
    background: "var(--panel-2)",
  },
  email: {
    fontSize: "11px",
    color: "var(--muted)",
  },
  roleBadge: {
    fontSize: "9px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    padding: "2px 8px",
    borderRadius: "2px",
    borderWidth: "1.5px",
    borderStyle: "solid",
  },
  logoutBtn: {
    fontSize: "11px",
    fontWeight: 700,
    background: "transparent",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "4px 12px",
    cursor: "pointer",
    color: "var(--text)",
    boxShadow: "none",
  },
};
