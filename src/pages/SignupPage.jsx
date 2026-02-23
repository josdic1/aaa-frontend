// src/pages/SignupPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const STAFF_CODE = "STAFF2026";

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
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          // Only include invite_code if the user actually typed something
          ...(form.invite_code.trim()
            ? { invite_code: form.invite_code.trim() }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data?.detail)
          ? data.detail.map((e) => e.msg).join(", ")
          : data?.detail || "Registration failed";
        throw new Error(msg);
      }

      // Log in to populate auth context (register doesn't auto-login)
      await login(form.email.trim().toLowerCase(), form.password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const codeEntered = form.invite_code.trim().length > 0;
  const codeValid = form.invite_code.trim() === STAFF_CODE;

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
            placeholder="Minimum 6 characters"
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
            <span
              style={{
                color: "var(--muted)",
                fontWeight: 400,
                textTransform: "none",
              }}
            >
              — leave blank if you're a member
            </span>
          </label>
          <input
            style={{
              ...s.input,
              borderColor: codeEntered
                ? codeValid
                  ? "#2e7d32"
                  : "#c0392b"
                : "var(--border)",
            }}
            type="text"
            value={form.invite_code}
            onChange={set("invite_code")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Optional"
          />
          {codeEntered && codeValid && (
            <div style={s.codeHintGood}>✓ Staff access verified</div>
          )}
          {codeEntered && !codeValid && (
            <div style={s.codeHintBad}>
              ✗ Invalid code — will sign up as member
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
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "white",
    borderRadius: "var(--radius)",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    padding: "40px 44px",
    boxShadow: "4px 4px 0 var(--border)",
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
    fontSize: "28px",
    fontWeight: 900,
    margin: "0 0 4px",
  },
  subtitle: { fontSize: "13px", color: "var(--muted)", margin: "0 0 28px" },
  error: {
    padding: "10px 14px",
    background: "#fff0f0",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "#c0392b",
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
  input: {
    width: "100%",
    padding: "9px 12px",
    fontSize: "14px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
    color: "var(--text)",
    background: "white",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "11px",
    fontSize: "14px",
    fontWeight: 700,
    background: "var(--accent)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "white",
    marginTop: "4px",
  },
  footer: {
    marginTop: "22px",
    fontSize: "13px",
    color: "var(--muted)",
    textAlign: "center",
  },
  codeHintGood: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#2e7d32",
    marginTop: "5px",
  },
  codeHintBad: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#c0392b",
    marginTop: "5px",
  },
};
