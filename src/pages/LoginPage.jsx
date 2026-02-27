import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Resolve intended destination:
    // 1. ?from= query param 2. location state 3. default home
    const queryParams = new URLSearchParams(location.search);
    const fromPath =
      queryParams.get("from") || location.state?.from?.pathname || "/";

    try {
      await login(email, password);
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(err.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const fill = (e, p) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div style={s.page}>
      {/* LEFT SECTION - Branding */}
      <div style={s.left}>
        <div style={s.pattern} />
        <div style={s.circle} />
        <div style={s.brand}>
          <div style={s.eyebrow}>Members Portal</div>
          <div style={s.lodgeName}>
            Abeyton
            <br />
            Lodge
          </div>
          <div style={s.tagline}>
            Private dining reservations and member services for Abeyton Lodge.
          </div>

          {/* Debug/Staff Links - Only visible in DEV */}
          {import.meta.env.DEV && (
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {["Staff1", "Staff2", "Sarah", "Jaime"].map((name) => (
                <div
                  key={name}
                  style={s.debugLink}
                  onClick={() =>
                    fill(`${name.toLowerCase()}@josh.com`, "111111")
                  }
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={s.leftFooter}>
          <div style={s.rule} />
          <div style={s.footerText}>Est. in tradition. Built for members.</div>
        </div>
      </div>

      {/* RIGHT SECTION - The Form */}
      <div style={s.right}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h1
              style={s.title}
              onClick={
                import.meta.env.DEV
                  ? () => fill("josh@josh.com", "1111")
                  : undefined
              }
            >
              Welcome back.
            </h1>
            <p style={s.sub}>Sign in to your member account.</p>
          </div>

          {error && <div style={s.alert}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={s.toggleBtn}
                >
                  {showPwd ? "hide" : "show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary"
              style={{ width: "100%", marginTop: "8px" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <div style={s.dividerLine} />
          </div>

          <p style={s.registerLink}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ fontWeight: 800 }}>
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    minHeight: "100vh",
  },
  left: {
    background: "#000",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "clamp(24px, 5vw, 48px)",
    position: "relative",
    overflow: "hidden",
    minHeight: "300px",
  },
  pattern: {
    position: "absolute",
    inset: 0,
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px)`,
    pointerEvents: "none",
  },
  circle: {
    position: "absolute",
    bottom: "-80px",
    right: "-80px",
    width: "min(320px, 50vw)",
    height: "min(320px, 50vw)",
    background: "#f97316",
    borderRadius: "50%",
    opacity: 0.15,
    pointerEvents: "none",
  },
  brand: { position: "relative", zIndex: 1 },
  eyebrow: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#f97316",
    marginBottom: "12px",
  },
  lodgeName: {
    fontFamily: "Playfair Display, serif",
    fontSize: "clamp(32px, 8vw, 52px)",
    fontWeight: 900,
    color: "#fff",
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
  },
  tagline: {
    marginTop: "20px",
    fontSize: "14px",
    color: "rgba(255,255,255,0.4)",
    fontWeight: 500,
    lineHeight: 1.6,
    maxWidth: "280px",
  },
  debugLink: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  leftFooter: { position: "relative", zIndex: 1, marginTop: "40px" },
  rule: {
    width: "40px",
    height: "3px",
    background: "#f97316",
    marginBottom: "16px",
  },
  footerText: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.25)",
    fontWeight: 500,
    letterSpacing: "0.05em",
  },
  right: {
    display: "flex",
    alignItems: "center",
    justifyCenter: "center",
    padding: "24px",
    background: "var(--bg)",
  },
  card: { width: "100%", maxWidth: "400px" },
  cardHeader: { marginBottom: "36px" },
  title: { fontSize: "clamp(24px, 6vw, 32px)", marginBottom: "8px" },
  sub: { fontSize: "14px", color: "var(--muted)", fontWeight: 500 },
  alert: {
    padding: "12px 16px",
    border: "2px solid var(--red)",
    borderRadius: "var(--radius-sm)",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: 600,
    boxShadow: "4px 4px 0 var(--red)",
    marginBottom: "20px",
  },
  toggleBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    boxShadow: "none",
    color: "var(--muted)",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    padding: "4px",
    cursor: "pointer",
    zIndex: 2,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "28px 0",
  },
  dividerLine: { flex: 1, height: "2px", background: "var(--border)" },
  dividerText: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--muted)",
  },
  registerLink: {
    textAlign: "center",
    fontSize: "13px",
    color: "var(--muted)",
    fontWeight: 500,
  },
};
