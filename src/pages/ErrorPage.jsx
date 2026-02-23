import { useRouteError, useNavigate } from "react-router-dom";
import { AlertCircle, Home, RefreshCcw, ShieldAlert } from "lucide-react";

/**
 * ErrorPage: Brutalist High-Contrast UI.
 * Aligned with Sterling/Bagger design tokens.
 */
export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Determine error details
  const status = error?.status || 500;
  const is404 = status === 404;
  const title = is404
    ? "Page Not Found"
    : error?.statusText || "Unexpected Exception";

  const message = is404
    ? "The resource you're looking for doesn't exist or has been moved."
    : error?.message || "The application encountered a runtime error.";

  return (
    <div style={containerStyle}>
      <div data-ui="card" style={errorCardStyle}>
        {/* Header with Cream Background Panel */}
        <div style={headerPanelStyle}>
          <div style={iconCircleStyle}>
            {is404 ? (
              <AlertCircle size={32} color="var(--accent)" />
            ) : (
              <ShieldAlert size={32} color="#ef4444" />
            )}
          </div>
          <div>
            <div style={labelStyle}>System Interruption</div>
            <h1 style={titleStyle}>
              {status} — {title}
            </h1>
          </div>
        </div>

        {/* Message Body */}
        <div style={messageContainerStyle}>
          <div style={sectionLabelStyle}>Diagnostic Report:</div>
          <div style={messageTextStyle}>{message}</div>
        </div>

        <div style={dividerStyle} />

        {/* Action Footer */}
        <div style={actionRowStyle}>
          <div style={supportTextStyle}>
            If this repeats, please contact technical support.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={secondaryBtnStyle}
            >
              <Home size={16} /> Home
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={primaryBtnStyle}
            >
              <RefreshCcw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Styles (Brutalist Theme) ---

const containerStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "var(--bg)",
};

const errorCardStyle = {
  width: "min(700px, 100%)",
  padding: "0", // Padding handled by internal sections for the full-bleed header
  overflow: "hidden",
};

const headerPanelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "24px",
  padding: "32px",
  background: "var(--panel-2)", // Cream header
  borderBottom: "3px solid var(--border)",
};

const iconCircleStyle = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "3px solid var(--border)",
  boxShadow: "4px 4px 0px var(--border)",
};

const labelStyle = {
  fontSize: "0.75rem",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--muted)",
  marginBottom: "4px",
};

const titleStyle = {
  margin: 0,
  fontSize: "1.8rem",
  fontWeight: 900,
  letterSpacing: "-1px",
  color: "var(--text)",
};

const messageContainerStyle = {
  padding: "32px",
  background: "white",
};

const sectionLabelStyle = {
  fontSize: "0.65rem",
  fontWeight: 900,
  textTransform: "uppercase",
  color: "var(--muted-2)",
  marginBottom: "12px",
};

const messageTextStyle = {
  fontSize: "1rem",
  fontWeight: 600,
  lineHeight: 1.6,
  color: "var(--text)",
  whiteSpace: "pre-wrap",
  padding: "16px",
  background: "var(--bg)",
  border: "2px solid var(--border)",
  borderRadius: "var(--radius-sm)",
};

const dividerStyle = {
  height: "3px",
  background: "var(--border)",
  margin: "0 32px",
};

const actionRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "20px",
  padding: "32px",
};

const supportTextStyle = {
  flex: 1,
  fontSize: "0.8rem",
  color: "var(--muted)",
  fontWeight: 700,
};

const primaryBtnStyle = {
  background: "var(--primary)",
  color: "white",
  border: "2px solid var(--border)",
  padding: "12px 24px",
  borderRadius: "var(--radius-sm)",
  fontWeight: 900,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "4px 4px 0px var(--border)",
};

const secondaryBtnStyle = {
  background: "white",
  color: "var(--text)",
  border: "2px solid var(--border)",
  padding: "12px 24px",
  borderRadius: "var(--radius-sm)",
  fontWeight: 900,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  boxShadow: "4px 4px 0px var(--border)",
};