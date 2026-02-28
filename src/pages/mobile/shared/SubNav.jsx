// src/pages/mobile/shared/SubNav.jsx

export function SubNav({
  onBack,
  eyebrow,
  title,
  eyebrowColor = "var(--muted, #888)",
  titleColor = "var(--accent, #1a1a1a)",
  backColor = "rgba(26,26,26,0.45)",
  borderColor = "rgba(26,26,26,0.08)",
  noPad = false,
}) {
  return (
    <div
      style={{
        padding: noPad ? "52px 24px 0" : "52px 24px 20px",
        borderBottom:
          borderColor !== "transparent" ? `1px solid ${borderColor}` : "none",
        flexShrink: 0,
      }}
    >
      <button
        onClick={onBack}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          marginBottom: eyebrow || title ? 20 : 0,
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: backColor,
        }}
      >
        ← Lodge
      </button>

      {eyebrow && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: eyebrowColor,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      )}

      {title && (
        <div
          style={{
            fontFamily: "Playfair Display, serif",
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.1,
            color: titleColor,
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
}
