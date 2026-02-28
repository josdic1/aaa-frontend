// src/pages/mobile/MobileHub.jsx
import { useState, useCallback } from "react";
import { MembersScreen } from "./MembersScreen";
import { AddResScreen } from "./AddResScreen";
import { ManageResScreen } from "./ManageResScreen";
import { FoodOrderScreen } from "./FoodOrderScreen";
import { ResDetailScreen } from "./ResDetailScreen";

const WORLDS = {
  members: { dir: "scale", label: "Members" },
  addRes: { dir: "left", label: "Book" },
  manageRes: { dir: "up", label: "Manage" },
  food: { dir: "right", label: "Food" },
  resDetail: { dir: "up", label: "Detail" },
};

const PILL_WORLDS = [
  { key: "members", label: "Members", dot: "👥", bg: "#1B2D45", fg: "#fff" },
  { key: "addRes", label: "Book", dot: "✦", bg: "#C4A96A", fg: "#1a1a1a" },
  { key: "manageRes", label: "Manage", dot: "⚙", bg: "#1E2329", fg: "#4ADE80" },
  {
    key: "food",
    label: "Food",
    dot: "◈",
    bg: "#fff",
    fg: "#1a1a1a",
    border: "1.5px solid rgba(0,0,0,0.15)",
  },
];

export function MobileHub() {
  const [active, setActive] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [exiting, setExiting] = useState(null);
  const [pillOpen, setPillOpen] = useState(false);

  const go = useCallback((world, id = null) => {
    setDetailId(id);
    setActive(world);
    setPillOpen(false);
  }, []);

  const goBack = useCallback(() => {
    setExiting(active);
    setTimeout(() => {
      setActive(null);
      setExiting(null);
      setDetailId(null);
    }, 460);
  }, [active]);

  const goDetail = useCallback((id) => go("resDetail", id), [go]);

  const currentLabel = active
    ? WORLDS[active]?.label || "Lodge"
    : "Abeyton Lodge";

  return (
    <div style={s.root}>
      {/* ── HOME ── */}
      <div
        style={{
          ...s.screen,
          ...(active ? dirOut(WORLDS[active]?.dir) : s.visible),
          transition: active
            ? "transform 0.46s cubic-bezier(0.77,0,0.175,1), opacity 0.46s ease"
            : "none",
          paddingBottom: 88,
        }}
      >
        <HomeScreen onGo={go} />
      </div>

      {/* ── SUB SCREENS ── */}
      {["members", "addRes", "manageRes", "food", "resDetail"].map((world) => {
        const isActive = active === world;
        const isExiting = exiting === world;
        const wDir = WORLDS[world].dir;
        return (
          <div
            key={world}
            style={{
              ...s.screen,
              ...(!isActive && !isExiting ? s.gone : {}),
              ...(isActive ? s.visible : {}),
              ...(isExiting ? dirOut(wDir) : !isActive ? dirIn(wDir) : {}),
              transition:
                "transform 0.46s cubic-bezier(0.77,0,0.175,1), opacity 0.46s ease",
              paddingBottom: 88,
            }}
          >
            {world === "members" && <MembersScreen onBack={goBack} />}
            {world === "addRes" && <AddResScreen onBack={goBack} />}
            {world === "manageRes" && (
              <ManageResScreen onBack={goBack} onDetail={goDetail} />
            )}
            {world === "food" && <FoodOrderScreen onBack={goBack} />}
            {world === "resDetail" && (
              <ResDetailScreen
                onBack={goBack}
                reservationId={detailId}
                onAddFood={() => go("food")}
              />
            )}
          </div>
        );
      })}

      {/* ── PILL NAV ── */}
      <Pill
        currentLabel={currentLabel}
        activeWorld={active}
        open={pillOpen}
        onToggle={() => setPillOpen((o) => !o)}
        onClose={() => setPillOpen(false)}
        onGo={go}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   PILL COMPONENT
───────────────────────────────────────── */
function Pill({ currentLabel, activeWorld, open, onToggle, onClose, onGo }) {
  return (
    <>
      {/* Tap-outside backdrop */}
      {open && <div onClick={onClose} style={s.pillBackdrop} />}

      <div style={s.pillWrap}>
        {/* Expanded switcher */}
        <div
          style={{
            ...s.pillExpanded,
            ...(open ? s.pillExpandedVisible : {}),
          }}
        >
          {PILL_WORLDS.map((w) => (
            <button
              key={w.key}
              onClick={() => onGo(w.key)}
              style={{
                ...s.pillWorld,
                ...(activeWorld === w.key ? s.pillWorldActive : {}),
              }}
            >
              <div
                style={{
                  ...s.pillDot,
                  background: w.bg,
                  color: w.fg,
                  border: w.border || "none",
                }}
              >
                {w.dot}
              </div>
              <div
                style={{
                  ...s.pillWorldLabel,
                  ...(activeWorld === w.key ? s.pillWorldLabelActive : {}),
                }}
              >
                {w.label}
              </div>
              <div
                style={{
                  ...s.pillActiveBar,
                  ...(activeWorld === w.key ? s.pillActiveBarOn : {}),
                }}
              />
            </button>
          ))}
        </div>

        {/* Collapsed pill */}
        <div style={s.pillHome} onClick={onToggle}>
          <span style={s.pillCurrentLabel}>{currentLabel}</span>
          <div style={s.pillDivider} />
          <div style={s.pillLines}>
            <div style={s.pillLine} />
            <div style={s.pillLine} />
            <div style={s.pillLine} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   HOME SCREEN
───────────────────────────────────────── */
function HomeScreen({ onGo }) {
  return (
    <div style={s.home}>
      <div style={s.homeTop}>
        <div style={s.lodge}>Abeyton Lodge</div>
        <div style={s.greeting}>
          Good{" "}
          <em style={{ fontStyle: "italic", fontWeight: 400 }}>evening.</em>
        </div>
      </div>
      <div style={s.grid}>
        <Tile
          color="navy"
          num="01"
          label="Members"
          name={["Family", "Registry"]}
          hint="Create & manage members"
          onClick={() => onGo("members")}
        />
        <Tile
          color="brass"
          num="02"
          label="Book"
          name={["New", "Reservation"]}
          hint="Open a reservation"
          onClick={() => onGo("addRes")}
        />
        <Tile
          color="slate"
          num="03"
          label="System"
          name={["Manage", "Reservations"]}
          hint="Live records, edit & search"
          onClick={() => onGo("manageRes")}
        />
        <Tile
          color="white"
          num="04"
          label="Service"
          name={["Food", "Orders"]}
          hint="Tonight's menu & ordering"
          onClick={() => onGo("food")}
        />
      </div>
    </div>
  );
}

const TILE_THEMES = {
  navy: {
    bg: "#1B2D45",
    fg: "#fff",
    sub: "rgba(255,255,255,0.35)",
    hint: "rgba(255,255,255,0.35)",
  },
  brass: {
    bg: "#C4A96A",
    fg: "#1a1a1a",
    sub: "rgba(26,26,26,0.45)",
    hint: "rgba(26,26,26,0.45)",
  },
  slate: {
    bg: "#1E2329",
    fg: "#fff",
    sub: "rgba(255,255,255,0.3)",
    hint: "rgba(255,255,255,0.3)",
  },
  white: {
    bg: "#fff",
    fg: "#1a1a1a",
    sub: "rgba(26,26,26,0.4)",
    hint: "rgba(26,26,26,0.4)",
    border: "2px solid #1a1a1a",
  },
};

function Tile({ color, num, label, name, hint, onClick }) {
  const t = TILE_THEMES[color];
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: t.bg,
        border: t.border || "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "22px 18px 18px",
        cursor: "pointer",
        textAlign: "left",
        filter: pressed ? "brightness(0.88)" : "brightness(1)",
        transition: "filter 0.12s",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: t.sub,
            marginBottom: 8,
          }}
        >
          {num} — {label}
        </div>
        <div
          style={{
            fontFamily: "Playfair Display, serif",
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.15,
            color: t.fg,
          }}
        >
          {name[0]}
          <br />
          {name[1]}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{ fontSize: 10, lineHeight: 1.4, color: t.hint, maxWidth: 80 }}
        >
          {hint}
        </div>
        <div style={{ fontSize: 18, color: t.fg, opacity: 0.3 }}>↗</div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────
   TRANSITION HELPERS
───────────────────────────────────────── */
function dirIn(dir) {
  return (
    {
      scale: { transform: "scale(1.05)", opacity: 0 },
      left: { transform: "translateX(100%)" },
      right: { transform: "translateX(-100%)" },
      up: { transform: "translateY(100%)" },
    }[dir] || {}
  );
}

function dirOut(dir) {
  return (
    {
      scale: { transform: "scale(0.92)", opacity: 0 },
      left: { transform: "translateX(-100%)" },
      right: { transform: "translateX(100%)" },
      up: { transform: "translateY(-100%)" },
    }[dir] || {}
  );
}

/* ─────────────────────────────────────────
   STYLES
───────────────────────────────────────── */
const s = {
  root: {
    position: "relative",
    width: "100%",
    height: "100dvh",
    overflow: "hidden",
    background: "#F7F4EF",
  },
  screen: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    background: "#F7F4EF",
  },
  visible: { transform: "translate(0,0) scale(1)", opacity: 1 },
  gone: { display: "none" },

  // home
  home: { display: "flex", flexDirection: "column", height: "100%" },
  homeTop: { padding: "52px 24px 28px", flexShrink: 0 },
  lodge: {
    fontFamily: "Playfair Display, serif",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#888",
    marginBottom: 10,
  },
  greeting: {
    fontFamily: "Playfair Display, serif",
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.1,
    color: "#1a1a1a",
  },
  grid: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: 3,
    background: "rgba(26,26,26,0.12)",
    borderTop: "2px solid #1a1a1a",
  },

  // pill backdrop
  pillBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 20,
  },

  // pill wrap — floats above everything
  pillWrap: {
    position: "absolute",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  },

  // expanded switcher
  pillExpanded: {
    background: "rgba(18,16,12,0.88)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 8,
    display: "flex",
    gap: 6,
    opacity: 0,
    pointerEvents: "none",
    transform: "translateY(12px) scale(0.92)",
    transition: "all 0.38s cubic-bezier(0.34,1.3,0.64,1)",
    marginBottom: 10,
  },
  pillExpandedVisible: {
    opacity: 1,
    pointerEvents: "all",
    transform: "translateY(0) scale(1)",
  },

  // world button in expanded
  pillWorld: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "10px 12px",
    borderRadius: 14,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    minWidth: 68,
    transition: "background 0.15s",
  },
  pillWorldActive: {
    background: "rgba(255,255,255,0.1)",
  },
  pillDot: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
  },
  pillWorldLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    lineHeight: 1.3,
  },
  pillWorldLabelActive: {
    color: "rgba(255,255,255,0.85)",
  },
  pillActiveBar: {
    width: 16,
    height: 2,
    borderRadius: 1,
    background: "transparent",
    transition: "background 0.2s",
  },
  pillActiveBarOn: {
    background: "rgba(255,255,255,0.6)",
  },

  // collapsed pill
  pillHome: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(26,26,26,0.82)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 100,
    padding: "10px 16px 10px 20px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  pillCurrentLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
  },
  pillDivider: {
    width: 1,
    height: 14,
    background: "rgba(255,255,255,0.15)",
  },
  pillLines: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: 2,
  },
  pillLine: {
    width: 16,
    height: 1.5,
    background: "rgba(255,255,255,0.5)",
    borderRadius: 1,
  },
};
