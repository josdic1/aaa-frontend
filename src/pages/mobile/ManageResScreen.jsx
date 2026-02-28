// src/pages/mobile/ManageResScreen.jsx
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "../../utils/api";
import { useData } from "../../hooks/useData";
import { SubNav } from "./shared/SubNav";

export function ManageResScreen({ onBack, onDetail }) {
  const { reservations, members, refresh } = useData();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState(null);

  // Build a members lookup
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
      const name = membersById[r.member_id]?.name?.toLowerCase() || "";
      const date = r.date || "";
      const status = r.status || "";
      return !q || name.includes(q) || date.includes(q) || status.includes(q);
    });
  }, [reservations, membersById, query]);

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

  const hasOrder = (r) => r.orders?.length > 0 || r.order_count > 0;
  const formatDate = (d) => (d ? d.replace(/-/g, ".").slice(2) : "—");

  const statusColor = {
    confirmed: "rgba(74,222,128,0.65)",
    draft: "rgba(250,204,21,0.65)",
    cancelled: "rgba(248,113,113,0.65)",
    pending: "rgba(250,204,21,0.65)",
  };

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

      {/* Records */}
      <div style={s.records}>
        {filtered.length === 0 && <p style={s.empty}>No reservations found.</p>}
        {filtered.map((r, i) => {
          const member = membersById[r.member_id];
          const nameKey = member
            ? member.name.split(" ").reverse().join("_").toUpperCase()
            : `RES_${r.id}`;
          const noOrder = !hasOrder(r) && r.status !== "cancelled";

          return (
            <div
              key={r.id}
              style={{ ...s.record, animationDelay: `${i * 0.04}s` }}
            >
              <div style={s.recTop}>
                <div style={s.recName}>{nameKey}</div>
                <div style={s.recDate}>{formatDate(r.date)}</div>
              </div>
              <div style={s.recMeta}>
                <div style={s.recMetaText}>
                  {(r.meal_type || "DINNER").toUpperCase()} ·{" "}
                  {r.party_size || "?"}PAX
                  {r.dining_room?.name
                    ? ` · ${r.dining_room.name.toUpperCase()}`
                    : ""}
                </div>
                <div
                  style={{
                    ...s.recStatus,
                    color: statusColor[r.status] || "#888",
                  }}
                >
                  ● {(r.status || "draft").toUpperCase()}
                </div>
              </div>

              {/* No order warning */}
              {noOrder && (
                <div style={s.noOrderWarn}>⚠ No food order placed</div>
              )}

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
  recName: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.85)",
  },
  recDate: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "rgba(255,255,255,0.22)",
  },
  recMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
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
  noOrderWarn: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.08em",
    color: "rgba(250,204,21,0.7)",
    marginBottom: 8,
    paddingLeft: 2,
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
