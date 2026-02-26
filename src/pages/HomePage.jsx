import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData";

const TODAY = new Date().toISOString().split("T")[0];

const classify = (dateStr) => {
  if (dateStr < TODAY) return "past";
  if (dateStr === TODAY) return "today";
  return "future";
};

const formatDate = (dateStr) =>
  new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
};

const STATUS_COLOR = {
  confirmed: "var(--green)",
  draft: "var(--muted)",
  cancelled: "#c0392b",
};

export function HomePage() {
  const { reservations, loading } = useData();
  const [tab, setTab] = useState("today");

  const counts = useMemo(
    () => ({
      past: reservations.filter((r) => classify(r.date) === "past").length,
      today: reservations.filter((r) => classify(r.date) === "today").length,
      future: reservations.filter((r) => classify(r.date) === "future").length,
    }),
    [reservations],
  );

  const filtered = useMemo(() => {
    return reservations
      .filter((r) => classify(r.date) === tab)
      .sort((a, b) =>
        tab === "past"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date),
      );
  }, [reservations, tab]);

  return (
    <div className="page">
      {/* HEADER */}
      <div style={s.header}>
        <h1 style={{ fontSize: "28px" }}>My Reservations</h1>
        <Link to="/reservations/new" style={{ width: "auto" }}>
          <button className="primary">+ New Reservation</button>
        </Link>
      </div>

      {/* TABS */}
      <div style={s.tabs}>
        {["past", "today", "future"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {counts[t] > 0 && (
              <span
                style={{
                  ...s.tabCount,
                  ...(tab === t ? s.tabCountActive : {}),
                }}
              >
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LIST */}
      {loading && <p className="muted">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div
          className="card"
          style={{ textAlign: "center", padding: "48px 32px" }}
        >
          <p style={{ fontWeight: 700, marginBottom: "6px" }}>
            No {tab === "today" ? "reservations today" : tab + " reservations"}.
          </p>
          {tab !== "past" && (
            <p className="muted" style={{ marginBottom: "20px" }}>
              Book a table at Abeyton Lodge.
            </p>
          )}
          {tab !== "past" && (
            <Link to="/reservations/new">
              <button className="primary">Make a Reservation</button>
            </Link>
          )}
        </div>
      )}

      <div style={s.list}>
        {filtered.map((r) => (
          <Link
            to={`/reservations/${r.id}`}
            key={r.id}
            style={{ textDecoration: "none" }}
          >
            <div className="card" style={s.card}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.cardTop}>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.date}>{formatDate(r.date)}</div>
                    <div style={s.time}>
                      {formatTime(r.start_time)}
                      {r.end_time ? ` — ${formatTime(r.end_time)}` : ""}
                    </div>
                    {r.notes && (
                      <p
                        className="muted"
                        style={{
                          marginTop: "8px",
                          fontSize: "13px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.notes}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      ...s.badge,
                      color: STATUS_COLOR[r.status] || "var(--muted)",
                      flexShrink: 0,
                    }}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const s = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
  },
  tabs: {
    display: "flex",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    borderBottom: "2px solid var(--border-dim)",
    marginBottom: "24px",
    gap: "4px",
    scrollbarWidth: "none" /* Firefox */,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "12px 16px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    boxShadow: "none",
    cursor: "pointer",
    color: "var(--muted)",
    marginBottom: "-2px",
    transition: "color 0.1s",
    whiteSpace: "nowrap",
  },
  tabActive: {
    color: "var(--text)",
    borderBottom: "3px solid var(--accent)",
  },
  tabCount: {
    fontSize: "10px",
    fontWeight: 900,
    background: "var(--border-dim)",
    color: "var(--muted)",
    borderRadius: "10px",
    padding: "1px 6px",
    minWidth: "18px",
    textAlign: "center",
  },
  tabCountActive: {
    background: "var(--accent)",
    color: "white",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    display: "flex",
    cursor: "pointer",
    padding: "20px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  date: {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "4px",
    lineHeight: "1.2",
  },
  time: { fontSize: "13px", color: "var(--muted)", fontWeight: 500 },
  badge: {
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 8px",
    border: "1.5px solid currentColor",
    borderRadius: "2px",
    whiteSpace: "nowrap",
  },
};
