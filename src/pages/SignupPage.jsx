import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
    invite_code: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async () => {
    setError(null);

    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!form.password) {
      setError("Password is required");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    // L-09 FIX: Removed frontend-only "length < 6" check.
    // Backend validation will now surface naturally.

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          ...(form.invite_code.trim()
            ? { invite_code: form.invite_code.trim() }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // SURFACING BACKEND ERRORS:
        // Handles both Pydantic list errors and custom detail strings.
        const msg = Array.isArray(data?.detail)
          ? data.detail.map((e) => e.msg).join(", ")
          : data?.detail || "Registration failed";
        throw new Error(msg);
      }

      await login(form.email.trim().toLowerCase(), form.password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const codeEntered = form.invite_code.trim().length > 0;

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logo}>Abeyton Lodge</div>
        <h1 style={s.title}>Create Account</h1>
        <p style={s.subtitle}>Members and staff sign up here.</p>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={form.email}
            onChange={set("email")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="you@example.com"
            autoFocus
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={form.password}
            onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Choose a strong password"
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Confirm Password</label>
          <input
            style={s.input}
            type="password"
            value={form.confirm}
            onChange={set("confirm")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Repeat password"
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>
            Staff Invite Code{" "}
            <span style={s.labelHint}>— leave blank if you're a member</span>
          </label>
          <input
            style={s.input}
            type="text"
            value={form.invite_code}
            onChange={set("invite_code")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Optional"
          />
          {codeEntered && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                marginTop: "5px",
              }}
            >
              Invite code will be verified on submission.
            </div>
          )}
        </div>

        <button
          style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <div style={s.footer}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent)", fontWeight: 700 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    padding: "16px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "white",
    borderRadius: "var(--radius)",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    padding: "clamp(24px, 8vw, 44px)",
    boxShadow: "4px 4px 0 var(--border)",
    boxSizing: "border-box",
  },
  logo: {
    fontFamily: "Playfair Display, serif",
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "var(--accent)",
    marginBottom: "6px",
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: "clamp(24px, 5vw, 28px)",
    fontWeight: 900,
    margin: "0 0 4px",
    lineHeight: "1.2",
  },
  subtitle: { fontSize: "13px", color: "var(--muted)", margin: "0 0 28px" },
  error: {
    padding: "10px 14px",
    background: "#fff0f0",
    border: "1.5px solid #c0392b",
    borderRadius: "var(--radius-sm)",
    color: "#c0392b",
    fontSize: "13px",
    marginBottom: "20px",
  },
  field: { marginBottom: "18px" },
  label: {
    display: "block",
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: "5px",
  },
  labelHint: {
    color: "var(--muted)",
    fontWeight: 400,
    textTransform: "none",
    display: "inline-block",
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "15px",
    border: "2px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
    color: "var(--text)",
    background: "white",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "14px",
    fontSize: "14px",
    fontWeight: 900,
    background: "var(--accent)",
    border: "2px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "white",
    marginTop: "4px",
    boxShadow: "2px 2px 0 var(--border)",
  },
  footer: {
    marginTop: "22px",
    fontSize: "13px",
    color: "var(--muted)",
    textAlign: "center",
  },
};
