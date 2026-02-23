// src/pages/HomePage.jsx
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
      .sort(
        (a, b) =>
          tab === "past"
            ? b.date.localeCompare(a.date) // past: newest first
            : a.date.localeCompare(b.date), // today/future: soonest first
      );
  }, [reservations, tab]);

  return (
    <div className="page">
      {/* HEADER */}
      <div style={s.header}>
        <h1 style={{ fontSize: "28px" }}>My Reservations</h1>
        <Link to="/reservations/new">
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
              <div>
                <div style={s.date}>{formatDate(r.date)}</div>
                <div style={s.time}>
                  {formatTime(r.start_time)}
                  {r.end_time ? ` — ${formatTime(r.end_time)}` : ""}
                </div>
                {r.notes && (
                  <p
                    className="muted"
                    style={{ marginTop: "4px", fontSize: "13px" }}
                  >
                    {r.notes}
                  </p>
                )}
              </div>
              <span
                style={{
                  ...s.badge,
                  color: STATUS_COLOR[r.status] || "var(--muted)",
                }}
              >
                {r.status}
              </span>
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
    marginBottom: "24px",
  },
  tabs: {
    display: "flex",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    marginBottom: "24px",
    gap: "0",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "none",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    boxShadow: "none",
    cursor: "pointer",
    color: "var(--muted)",
    marginBottom: "-2px",
    transition: "color 0.1s",
  },
  tabActive: {
    color: "var(--text)",
    borderBottomColor: "var(--accent)",
  },
  tabCount: {
    fontSize: "10px",
    fontWeight: 900,
    background: "var(--border)",
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
    gap: "12px",
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  date: {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "4px",
  },
  time: { fontSize: "13px", color: "var(--muted)", fontWeight: 500 },
  badge: {
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "currentColor",
    borderRadius: "2px",
    whiteSpace: "nowrap",
  },
};
