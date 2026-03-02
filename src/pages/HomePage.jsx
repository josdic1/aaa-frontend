// src/pages/HomePage.jsx
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../hooks/useData";
import { resStatusColor } from "../utils/statusColors";

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

// Summarize order state across all attendees on a reservation
function getOrderSummary(r) {
  const orders = r.orders || [];
  if (orders.length === 0) return null;
  const statuses = orders.map((o) => o.status);
  if (statuses.every((s) => s === "fulfilled"))
    return { label: "Fulfilled", color: "#2e7d32" };
  if (statuses.some((s) => s === "fired"))
    return { label: "Fired", color: "#6d28d9" };
  const totalItems = orders.reduce(
    (n, o) => n + (o.order_items?.length || o.item_count || 0),
    0,
  );
  if (totalItems > 0)
    return {
      label: `${totalItems} item${totalItems !== 1 ? "s" : ""} ordered`,
      color: "#c8783c",
    };
  return { label: "No items yet", color: "#b45309" };
}

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
        {filtered.map((r) => {
          const statusColor = resStatusColor(r.status);
          const attendeeNames = (r.attendees || [])
            .map((a) => a.member?.name || a.guest_name || "Guest")
            .filter(Boolean);
          const roomName = r.dining_room?.name || null;
          const orderSummary = getOrderSummary(r);
          const hasUnreadMessages = (r.unread_message_count || 0) > 0;

          return (
            <Link
              to={`/reservations/${r.id}`}
              key={r.id}
              style={{ textDecoration: "none" }}
            >
              <div
                className="card"
                style={{ ...s.card, borderLeft: `4px solid ${statusColor}` }}
              >
                {/* Top row: date + status badge */}
                <div style={s.cardTop}>
                  <div style={s.date}>{formatDate(r.date)}</div>
                  <span
                    style={{
                      ...s.badge,
                      color: statusColor,
                      borderColor: statusColor,
                    }}
                  >
                    {r.status}
                  </span>
                </div>

                {/* Second row: time + room */}
                <div style={s.cardMeta}>
                  <span style={s.time}>{formatTime(r.start_time)}</span>
                  {r.meal_type && <span style={s.metaSep}>·</span>}
                  {r.meal_type && (
                    <span style={s.metaChip}>
                      {r.meal_type.charAt(0).toUpperCase() +
                        r.meal_type.slice(1)}
                    </span>
                  )}
                  {roomName && <span style={s.metaSep}>·</span>}
                  {roomName && <span style={s.metaChip}>📍 {roomName}</span>}
                </div>

                {/* Attendee names */}
                {attendeeNames.length > 0 && (
                  <div style={s.attendeeRow}>
                    <span style={s.attendeeLabel}>Party: </span>
                    <span style={s.attendeeNames}>
                      {attendeeNames.join(", ")}
                    </span>
                  </div>
                )}

                {/* Bottom row: order summary + messages */}
                <div style={s.cardFooter}>
                  {orderSummary && (
                    <span
                      style={{
                        ...s.footerChip,
                        color: orderSummary.color,
                        borderColor: orderSummary.color,
                      }}
                    >
                      🍽 {orderSummary.label}
                    </span>
                  )}
                  {!orderSummary && r.status !== "cancelled" && (
                    <span
                      style={{
                        ...s.footerChip,
                        color: "#b45309",
                        borderColor: "#b45309",
                      }}
                    >
                      ⚠ No order placed
                    </span>
                  )}
                  {hasUnreadMessages && (
                    <span
                      style={{
                        ...s.footerChip,
                        color: "#1B2D45",
                        borderColor: "#1B2D45",
                      }}
                    >
                      💬 New message
                    </span>
                  )}
                  {r.notes && (
                    <span style={s.notesSnippet} title={r.notes}>
                      {r.notes.length > 40
                        ? r.notes.slice(0, 40) + "…"
                        : r.notes}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
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
    scrollbarWidth: "none",
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
  tabActive: { color: "var(--text)", borderBottom: "3px solid var(--accent)" },
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
  tabCountActive: { background: "var(--accent)", color: "white" },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  card: {
    cursor: "pointer",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  date: {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 900,
    lineHeight: "1.2",
  },
  badge: {
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 8px",
    border: "1.5px solid currentColor",
    borderRadius: "2px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  time: { fontSize: "13px", color: "var(--muted)", fontWeight: 500 },
  metaSep: { color: "var(--border-dim)", fontSize: "12px" },
  metaChip: { fontSize: "12px", color: "var(--muted)" },
  attendeeRow: { display: "flex", gap: "4px", alignItems: "baseline" },
  attendeeLabel: {
    fontSize: "11px",
    color: "var(--muted)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    flexShrink: 0,
  },
  attendeeNames: { fontSize: "13px", fontWeight: 600, color: "var(--text)" },
  cardFooter: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: "2px",
  },
  footerChip: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 8px",
    border: "1px solid currentColor",
    borderRadius: "2px",
    whiteSpace: "nowrap",
  },
  notesSnippet: {
    fontSize: "11px",
    color: "var(--muted)",
    fontStyle: "italic",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "200px",
  },
};
