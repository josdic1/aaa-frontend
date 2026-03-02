// src/pages/mobile/ManageResScreen.jsx
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "../../utils/api";
import { useData } from "../../hooks/useData";
import { SubNav } from "./shared/SubNav";
import { RESERVATION_STATUS_COLOR_RGBA } from "../../utils/statusColors";

export function ManageResScreen({ onBack, onDetail }) {
  const { reservations, members, refresh } = useData();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const membersById = useMemo(() => {
    const map = {};
    members.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return reservations.filter((r) => {
      const name = (r.attendees || [])
        .map((a) => a.member?.name || a.guest_name || "")
        .join(" ")
        .toLowerCase();
      const date = r.date || "";
      const status = r.status || "";
      const matchesQuery =
        !q || name.includes(q) || date.includes(q) || status.includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [reservations, query, statusFilter]);

  const deleteRes = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/api/reservations/${id}`);
      toast.success("Reservation deleted");
      refresh();
    } catch (err) {
      toast.error(err?.detail || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const STATUS_FILTERS = ["all", "confirmed", "draft", "cancelled"];
  const statusCounts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] =
      s === "all"
        ? reservations.length
        : reservations.filter((r) => r.status === s).length;
    return acc;
  }, {});

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <SubNav
          onBack={onBack}
          eyebrow={null}
          title={null}
          backColor="rgba(255,255,255,0.3)"
          borderColor="transparent"
          noPad
        />
        <div style={s.live}>
          <div style={s.dot} />
          <div style={s.liveText}>Live · {reservations.length} records</div>
        </div>
        <div style={s.engineTitle}>RESERVATIONS</div>
        <div style={s.engineSub}>sys · admin · abeyton</div>
      </div>

      {/* Search */}
      <div style={s.searchWrap}>
        <input
          style={s.search}
          type="text"
          placeholder="› search by name, date, status..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Status filter pills */}
      <div style={s.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f;
          const dotColor = RESERVATION_STATUS_COLOR_RGBA[f];
          return (
            <button
              key={f}
              style={{ ...s.filterBtn, ...(active ? s.filterBtnActive : {}) }}
              onClick={() => setStatusFilter(f)}
            >
              {f !== "all" && (
                <span
                  style={{
                    ...s.filterDot,
                    background: dotColor || "rgba(255,255,255,0.3)",
                  }}
                />
              )}
              {f.toUpperCase()}
              {statusCounts[f] > 0 && (
                <span
                  style={{
                    ...s.filterCount,
                    ...(active ? s.filterCountActive : {}),
                  }}
                >
                  {statusCounts[f]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Records */}
      <div style={s.records}>
        {filtered.length === 0 && <p style={s.empty}>No reservations found.</p>}
        {filtered.map((r, i) => {
          const attendeeNames = (r.attendees || [])
            .map((a) => a.member?.name || a.guest_name || "Guest")
            .filter(Boolean);
          const displayName =
            attendeeNames.length > 0
              ? attendeeNames[0].split(" ").reverse().join("_").toUpperCase()
              : `RES_${r.id}`;
          const extraCount =
            attendeeNames.length > 1 ? `+${attendeeNames.length - 1}` : null;

          const noOrder = !r.orders?.length && r.status !== "cancelled";
          const hasFired = r.orders?.some((o) => o.status === "fired");
          const hasFulfilled =
            r.orders?.every((o) => o.status === "fulfilled") &&
            r.orders?.length > 0;
          const totalItems = (r.orders || []).reduce(
            (n, o) => n + (o.order_items?.length || o.item_count || 0),
            0,
          );
          const unreadCount = r.unread_message_count || 0;

          const statusDotColor =
            RESERVATION_STATUS_COLOR_RGBA[r.status] || "rgba(255,255,255,0.2)";

          return (
            <div
              key={r.id}
              style={{ ...s.record, animationDelay: `${i * 0.04}s` }}
            >
              <div style={s.recTop}>
                <div style={s.recNameRow}>
                  <div style={s.recName}>{displayName}</div>
                  {extraCount && (
                    <div style={s.recExtra}>{extraCount} more</div>
                  )}
                </div>
                <div style={s.recDate}>
                  {(r.date || "").replace(/-/g, ".").slice(2)}
                </div>
              </div>

              <div style={s.recMeta}>
                <div style={s.recMetaText}>
                  {(r.meal_type || "LUNCH").toUpperCase()} ·{" "}
                  {r.party_size || "?"}PAX
                  {r.dining_room?.name
                    ? ` · ${r.dining_room.name.toUpperCase()}`
                    : ""}
                </div>
                <div style={{ ...s.recStatus, color: statusDotColor }}>
                  ● {(r.status || "draft").toUpperCase()}
                </div>
              </div>

              {/* Attendee names (all of them, small) */}
              {attendeeNames.length > 0 && (
                <div style={s.recAttendees}>{attendeeNames.join(" · ")}</div>
              )}

              {/* Order / message indicators */}
              <div style={s.recIndicators}>
                {noOrder && <span style={s.warnChip}>⚠ No order</span>}
                {hasFulfilled && (
                  <span
                    style={{ ...s.infoChip, color: "rgba(74,222,128,0.8)" }}
                  >
                    ✓ Fulfilled
                  </span>
                )}
                {!hasFulfilled && hasFired && (
                  <span
                    style={{ ...s.infoChip, color: "rgba(167,139,250,0.8)" }}
                  >
                    🔥 Fired
                  </span>
                )}
                {!hasFired && !hasFulfilled && totalItems > 0 && (
                  <span
                    style={{ ...s.infoChip, color: "rgba(251,146,60,0.8)" }}
                  >
                    🍽 {totalItems} item{totalItems !== 1 ? "s" : ""}
                  </span>
                )}
                {unreadCount > 0 && (
                  <span
                    style={{ ...s.infoChip, color: "rgba(96,165,250,0.8)" }}
                  >
                    💬 {unreadCount} unread
                  </span>
                )}
              </div>

              <div style={s.recActions}>
                <button style={s.recBtn} onClick={() => onDetail(r.id)}>
                  VIEW
                </button>
                <button
                  style={{ ...s.recBtn, ...s.delBtn }}
                  onClick={() => deleteRes(r.id)}
                  disabled={deleting === r.id}
                >
                  {deleting === r.id ? "..." : "DEL"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#131820",
  },
  header: {
    padding: "52px 24px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    flexShrink: 0,
  },
  live: { display: "flex", alignItems: "center", gap: 7, marginBottom: 12 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#4ADE80",
    animation: "blink 2s ease-in-out infinite",
  },
  liveText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(74,222,128,0.6)",
  },
  engineTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 20,
    color: "#fff",
    letterSpacing: "0.02em",
    marginBottom: 3,
  },
  engineSub: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
  },
  searchWrap: {
    padding: "14px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    flexShrink: 0,
  },
  search: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    padding: "10px 14px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    outline: "none",
    boxSizing: "border-box",
  },

  // Filter pills
  filterRow: {
    display: "flex",
    gap: 6,
    padding: "10px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    flexShrink: 0,
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.1em",
    padding: "4px 9px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.3)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  filterBtnActive: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "rgba(255,255,255,0.8)",
  },
  filterDot: { width: 5, height: 5, borderRadius: "50%", flexShrink: 0 },
  filterCount: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.3)",
    padding: "1px 4px",
    borderRadius: 8,
    minWidth: 14,
    textAlign: "center",
  },
  filterCountActive: {
    background: "rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.8)",
  },

  // Records
  records: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    padding: "0 24px",
  },
  empty: {
    color: "rgba(255,255,255,0.25)",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    padding: "24px 0",
  },
  record: {
    padding: "15px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    animation: "riseIn 0.4s ease both",
  },
  recTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  recNameRow: { display: "flex", alignItems: "baseline", gap: 6 },
  recName: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.85)",
  },
  recExtra: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.06em",
  },
  recDate: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "rgba(255,255,255,0.22)",
  },
  recMeta: { display: "flex", alignItems: "center", gap: 10, marginBottom: 5 },
  recMetaText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "rgba(255,255,255,0.28)",
  },
  recStatus: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  recAttendees: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: "0.05em",
    marginBottom: 6,
  },
  recIndicators: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  warnChip: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.08em",
    color: "rgba(250,204,21,0.7)",
    border: "1px solid rgba(250,204,21,0.2)",
    padding: "2px 6px",
  },
  infoChip: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.06em",
    border: "1px solid currentColor",
    padding: "2px 6px",
    opacity: 0.9,
  },
  recActions: { display: "flex", gap: 6 },
  recBtn: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "5px 9px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.35)",
    cursor: "pointer",
  },
  delBtn: {
    borderColor: "rgba(248,113,113,0.2)",
    color: "rgba(248,113,113,0.45)",
  },
};
