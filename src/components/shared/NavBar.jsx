import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useState, useLayoutEffect } from "react";

export function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    setIsMobile(window.innerWidth < 850);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 850);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isStaff = user.role === "staff" || isAdmin;
  const isMember = !isStaff;

  const roleColor =
    user.role === "admin"
      ? "#2e7d32"
      : user.role === "staff"
        ? "#c8783c"
        : "#2b2b2b"; // Darker default

  const active = (path) => ({
    ...s.link,
    ...(pathname === path || pathname.startsWith(path + "/")
      ? s.linkActive
      : {}),
    ...(isMobile ? s.mobileLink : {}),
  });

  if (!isMobile) {
    return (
      <nav style={s.nav}>
        <div style={s.left}>
          <Link to={isStaff ? "/admin" : "/home"} style={s.logo}>
            Abeyton Lodge
          </Link>

          <div style={s.links}>
            {isMember && (
              <Link to="/home" style={active("/home")}>
                Home
              </Link>
            )}
            <Link to="/menu" style={active("/menu")}>
              Menu
            </Link>
            <Link to="/members" style={active("/members")}>
              Members
            </Link>
            {isStaff && (
              <Link to="/floor" style={active("/floor")}>
                Floor
              </Link>
            )}
            {isAdmin && (
              <>
                <Link to="/admin" style={active("/admin")}>
                  Admin
                </Link>
                <Link to="/overlord" style={active("/overlord")}>
                  Overlord
                </Link>
                <Link to="/calendar" style={active("/calendar")}>
                  Calendar
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
          <Link to="/issues" style={active("/issues")}>
            Issues
          </Link>
          <button style={s.logoutBtn} onClick={logout}>
            ↪ Sign Out
          </button>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav style={s.mobileTop}>
        <Link to={isStaff ? "/admin" : "/home"} style={s.logo}>
          Abeyton Lodge
        </Link>
        <button style={s.mobileLogout} onClick={logout}>
          Sign Out
        </button>
      </nav>

      <nav style={s.mobileBottom}>
        {isMember && (
          <Link to="/home" style={active("/home")}>
            Home
          </Link>
        )}
        <Link to="/menu" style={active("/menu")}>
          Menu
        </Link>
        <Link to="/members" style={active("/members")}>
          Members
        </Link>
        {isStaff && (
          <Link to="/floor" style={active("/floor")}>
            Floor
          </Link>
        )}
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
      </nav>
    </>
  );
}

const s = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 32px",
    height: "56px",
    borderBottom: "2px solid var(--border)",
    background: "white",
    position: "sticky",
    top: 0,
    zIndex: 100,
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
  },
  links: { display: "flex", alignItems: "center", gap: "4px" },
  link: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#555", // Darker than var(--muted) for visibility
    textDecoration: "none",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
  },
  linkActive: {
    color: "var(--text)",
    background: "var(--panel-2)",
  },
  email: { fontSize: "11px", color: "#555" },
  roleBadge: {
    fontSize: "9px",
    fontWeight: 900,
    textTransform: "uppercase",
    padding: "2px 8px",
    borderRadius: "2px",
    border: "1.5px solid currentColor",
  },
  logoutBtn: {
    fontSize: "11px",
    fontWeight: 700,
    background: "white", // Changed from transparent
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "4px 12px",
    cursor: "pointer",
    color: "var(--text)",
  },
  mobileTop: {
    height: "50px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px",
    background: "white",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  mobileLogout: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    background: "none",
    border: "none",
    color: "#c0392b", // Stronger red
    padding: 0,
  },
  mobileBottom: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60px",
    background: "white",
    borderTop: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    padding: "0 8px",
    zIndex: 1000,
  },
  mobileLink: {
    flex: 1,
    textAlign: "center",
    fontSize: "10px",
    padding: "10px 0",
    borderRadius: 0,
    color: "#2b2b2b",
  },
};
