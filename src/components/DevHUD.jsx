import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";

const LS_ENABLED = "devhud:enabled";
const LS_COLLAPSED = "devhud:collapsed";

// Cmd/Ctrl + ` (backtick) toggles
function isToggleHotkey(e) {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? e.metaKey : e.ctrlKey;
  return mod && e.key === "`";
}

function pillStyle() {
  return {
    position: "fixed",
    top: 12,
    right: 12,
    zIndex: 99999,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  };
}

function panelWrapStyle() {
  return {
    position: "fixed",
    top: 12,
    right: 12,
    zIndex: 99999,
  };
}

function panelStyle() {
  return {
    width: 360,
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 16px 50px rgba(0,0,0,0.14)",
    overflow: "hidden",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  };
}

function monoText(color = "rgba(0,0,0,0.72)") {
  return { color };
}

function tinyBtn() {
  return {
    border: "1px solid rgba(0,0,0,0.12)",
    background: "transparent",
    borderRadius: 10,
    padding: "6px 8px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    ...monoText("rgba(0,0,0,0.74)"),
  };
}

function chip(label, value, tone = "dark") {
  const tones = {
    dark: { bg: "rgba(0,0,0,0.06)", fg: "rgba(0,0,0,0.74)" },
    faint: { bg: "rgba(0,0,0,0.04)", fg: "rgba(0,0,0,0.55)" },
    invert: { bg: "rgba(0,0,0,0.86)", fg: "rgba(255,255,255,0.92)" },
  }[tone] || { bg: "rgba(0,0,0,0.06)", fg: "rgba(0,0,0,0.74)" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 12,
        background: tones.bg,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: tones.fg,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: tones.fg,
          textAlign: "right",
          maxWidth: 210,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={String(value ?? "")}
      >
        {value}
      </div>
    </div>
  );
}

function formatLocalTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return String(ts);
  }
}

function truthyEnv(v) {
  if (v == null) return false;
  const s = String(v).toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/**
 * Best-effort token getter.
 * Adjust this if your app stores the JWT under a different key.
 */
function getAuthToken() {
  // Most common keys used in small apps:
  const candidates = ["token", "access_token", "jwt", "authToken"];
  for (const k of candidates) {
    const v = localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

export function DevHUD() {
  const { user } = useAuth();

  // SAFE portal target (prevents "Target container is not a DOM element.")
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.body instanceof HTMLElement
    ) {
      setPortalTarget(document.body);
    }
  }, []);

  const [enabled, setEnabled] = useState(() => {
    const v = localStorage.getItem(LS_ENABLED);
    return v == null ? true : v === "1";
  });

  const [collapsed, setCollapsed] = useState(() => {
    const v = localStorage.getItem(LS_COLLAPSED);
    return v == null ? false : v === "1";
  });

  const env = useMemo(() => {
    // Vite exposes only VITE_* vars to the client
    return {
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD,
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_DEV_HUD: import.meta.env.VITE_DEV_HUD,
    };
  }, []);

  const role = user?.role || "none";
  const isAuthed = Boolean(user);

  // --- REAL HUD GATE ---
  // Default behavior: show only in dev AND only when signed in.
  // Override: set VITE_DEV_HUD=1/true to allow in any mode (still requires auth).
  const envAllowsHud = env.DEV || truthyEnv(env.VITE_DEV_HUD);
  const shouldRender = envAllowsHud && isAuthed;

  const toggleEnabled = () => {
    setEnabled((v) => {
      const next = !v;
      localStorage.setItem(LS_ENABLED, next ? "1" : "0");
      return next;
    });
  };

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(LS_COLLAPSED, next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isToggleHotkey(e)) {
        e.preventDefault();
        toggleEnabled();
      }
      // Escape collapses (when visible)
      if (enabled && e.key === "Escape") {
        setCollapsed(true);
        localStorage.setItem(LS_COLLAPSED, "1");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // --- Health state ---
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState(null);

  const apiBase = env.VITE_API_URL || "http://localhost:8080";
  const healthUrl = `${apiBase}/api/health`;

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);

    try {
      const token = getAuthToken();

      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(healthUrl, {
        method: "GET",
        headers,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.error ||
          `Health request failed (${res.status})`;
        setHealthError(msg);
        setHealthData(data);
        setHealthCheckedAt(Date.now());
        return;
      }

      setHealthData(data);
      setHealthCheckedAt(Date.now());
    } catch (e) {
      setHealthError(e?.message || String(e));
      setHealthCheckedAt(Date.now());
    } finally {
      setHealthLoading(false);
    }
  };

  // Auto-fetch once when panel is enabled + expanded (keeps it light)
  useEffect(() => {
    if (!enabled) return;
    if (collapsed) return;
    if (!shouldRender) return;
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, collapsed, shouldRender]);

  // If not allowed (not dev / not env-enabled) or not authed, render nothing.
  if (!shouldRender) return null;

  // If user toggled it off (in-app), render nothing.
  if (!enabled) return null;

  // Don’t attempt portal until we have a real DOM element.
  if (!portalTarget) return null;

  // Collapsed “chip” view (also portal, so it stays fixed)
  if (collapsed) {
    return createPortal(
      <div style={pillStyle()}>
        <div
          style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              ...monoText("rgba(0,0,0,0.78)"),
            }}
          >
            DEV HUD
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              ...monoText("rgba(0,0,0,0.52)"),
            }}
          >
            {isAuthed ? `user:${user?.id ?? "?"} (${role})` : "unauth"}
          </div>
        </div>

        <button onClick={toggleCollapsed} style={tinyBtn()} title="Expand">
          Open
        </button>

        <button
          onClick={toggleEnabled}
          style={tinyBtn()}
          title="Hide HUD (Cmd/Ctrl + `)"
        >
          Hide
        </button>
      </div>,
      portalTarget,
    );
  }

  const healthStatus =
    healthData?.status || (healthError ? "error" : "unknown");
  const dbStatus =
    healthData?.checks?.database?.status ||
    healthData?.checks?.db?.status ||
    "unknown";
  const dbLatency =
    healthData?.checks?.database?.latency_ms ??
    healthData?.checks?.db?.latency_ms ??
    null;
  const authStatus = healthData?.checks?.auth?.status || "unknown";
  const checkedLabel = healthCheckedAt ? formatLocalTime(healthCheckedAt) : "—";

  // Expanded panel view
  return createPortal(
    <div style={panelWrapStyle()}>
      <div style={panelStyle()}>
        <div
          style={{
            padding: "12px 12px 10px",
            borderBottom: "1px solid rgba(0,0,0,0.10)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 950,
                letterSpacing: "0.02em",
                ...monoText("rgba(0,0,0,0.82)"),
              }}
            >
              Dev HUD
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                ...monoText("rgba(0,0,0,0.52)"),
              }}
            >
              Toggle: Cmd/Ctrl + <span style={{ fontWeight: 900 }}>`</span> •
              Collapse: Esc
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={toggleCollapsed}
              style={tinyBtn()}
              title="Collapse"
            >
              —
            </button>
            <button onClick={toggleEnabled} style={tinyBtn()} title="Hide HUD">
              Hide
            </button>
          </div>
        </div>

        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          {chip(
            "Auth",
            isAuthed ? "signed in" : "signed out",
            isAuthed ? "invert" : "dark",
          )}
          {chip(
            "User",
            isAuthed
              ? `${user?.email ?? "unknown"} (#${user?.id ?? "?"})`
              : "none",
            "dark",
          )}
          {chip(
            "Role",
            role,
            role === "admin" || role === "staff" ? "invert" : "faint",
          )}
          {chip("API", env.VITE_API_URL || "(unset)", "dark")}
          {chip("Mode", env.MODE, "faint")}
          {chip("VITE_DEV_HUD", String(env.VITE_DEV_HUD), "faint")}

          {/* Health section */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              display: "grid",
              gap: 10,
            }}
          >
            {chip(
              "Health",
              healthStatus,
              healthStatus === "ok" ? "invert" : "dark",
            )}
            {chip(
              "DB",
              dbLatency == null ? dbStatus : `${dbStatus} (${dbLatency}ms)`,
              "dark",
            )}
            {chip("Auth Check", authStatus, "faint")}
            {chip("Last Checked", checkedLabel, "faint")}

            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                style={tinyBtn()}
                onClick={fetchHealth}
                title="Fetch /api/health"
                disabled={healthLoading}
              >
                {healthLoading ? "Checking…" : "Check Health"}
              </button>
            </div>

            {healthError ? (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "rgba(0,0,0,0.03)",
                  ...monoText("rgba(0,0,0,0.62)"),
                }}
                title={healthError}
              >
                {`Error: ${healthError}`}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            padding: "10px 12px 12px",
            borderTop: "1px solid rgba(0,0,0,0.10)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              ...monoText("rgba(0,0,0,0.45)"),
            }}
          >
            Minimal • Monochrome • Always-on
          </div>

          <button
            style={tinyBtn()}
            onClick={() => {
              const payload = {
                auth: isAuthed,
                user: user
                  ? { id: user.id, email: user.email, role: user.role }
                  : null,
                env,
                health: healthData,
                healthError,
                healthCheckedAt,
              };
              navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
            }}
            title="Copy essentials to clipboard"
          >
            Copy
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
