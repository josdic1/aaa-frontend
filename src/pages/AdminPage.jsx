// src/pages/AdminPage.jsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { api } from "../utils/api";
import { ReservationThermometer } from "../components/ReservationThermometer";
import { ReservationDetailModal } from "../components/ReservationEditPanel";
import { extractError } from "../utils/errors";
import { formatPrice, formatTime } from "../utils/format";
import { resStatusColor, orderStatusColor } from "../utils/statusColors";

function sanitizeReservationPatch(patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === "date") continue;
    if (v === "" || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

// Status filter options shown above the reservation list
const STATUS_FILTERS = ["all", "confirmed", "draft", "cancelled"];

export function AdminPage() {
  const { diningRooms, tables } = useData();
  const [detailRes, setDetailRes] = useState(null);
  const [tab, setTab] = useState("reservations");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reservations, setReservations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [firedOrders, setFiredOrders] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const [assigning, setAssigning] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [resData, assignData, ordersData] = await Promise.all([
        api.get(`/api/admin/daily?date=${date}`),
        api.get(`/api/admin/seat-assignments?date=${date}`),
        api.get(`/api/admin/orders?status=fired&date=${date}`),
      ]);
      setReservations(resData.reservations || []);
      setAssignments(assignData || []);
      setFiredOrders(ordersData || []);
    } catch (err) {
      toast.error(extractError(err) || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date]);

  const getAssignment = (reservationId) =>
    assignments.find((a) => a.reservation_id === reservationId);

  const getTableLabel = (tableId) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return `Table ${tableId}`;
    const room = (diningRooms || []).find((r) => r.id === table.dining_room_id);
    return `${room?.name || "Room"} — ${table.name}`;
  };

  const updateStatus = async (reservationId, status) => {
    try {
      await api.patch(`/api/admin/reservations/${reservationId}`, sanitizeReservationPatch({ status }));
      await load();
      toast.success(`Reservation ${status}`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const openAssignModal = (res) => {
    setAssigning(res);
    const existing = getAssignment(res.reservation_id);
    if (existing) {
      const t = tables.find((x) => x.id === existing.table_id);
      setSelectedRoomId(t ? String(t.dining_room_id) : "");
      setSelectedTableId(String(existing.table_id));
      return;
    }
    setSelectedRoomId(res.dining_room_id ? String(res.dining_room_id) : "");
    setSelectedTableId("");
  };

  const submitAssignment = async () => {
    if (!selectedTableId) { toast.error("Select a table"); return; }
    setAssignLoading(true);
    try {
      const existing = getAssignment(assigning.reservation_id);
      if (existing) {
        await api.patch(`/api/seat-assignments/${existing.id}`, { table_id: parseInt(selectedTableId) });
      } else {
        await api.post("/api/seat-assignments", {
          reservation_id: assigning.reservation_id,
          table_id: parseInt(selectedTableId),
        });
      }
      await load();
      toast.success("Table assigned");
      setAssigning(null);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setAssignLoading(false);
    }
  };

  const removeAssignment = async (reservationId) => {
    const existing = getAssignment(reservationId);
    if (!existing) return;
    try {
      await api.delete(`/api/seat-assignments/${existing.id}`);
      await load();
      toast.success("Assignment removed");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const fulfillOrder = async (orderId) => {
    try {
      await api.patch(`/api/admin/orders/${orderId}/fulfill`);
      await load();
      toast.success("Order fulfilled");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const activeRooms = (diningRooms || []).filter((r) => r.is_active);
  const tablesInRoom = (roomId) =>
    tables.filter((t) => t.dining_room_id === parseInt(roomId) && t.is_active);

  // Apply status filter to reservation list
  const filteredReservations = statusFilter === "all"
    ? reservations
    : reservations.filter((r) => r.status === statusFilter);

  // Count per status for filter tab badges
  const statusCounts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === "all" ? reservations.length : reservations.filter((r) => r.status === s).length;
    return acc;
  }, {});

  if (loading)
    return <div className="page"><p className="muted">Loading...</p></div>;

  return (
    <div className="page" style={{ maxWidth: "900px" }}>
      {/* ── Page header with date nav ── */}
      <div style={s.header}>
        <div>
          <h1 style={{ fontSize: "28px", marginBottom: "4px" }}>Admin</h1>
          <p className="muted">Manage reservations, seating, and orders.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button className="ghost" style={{ fontSize: "18px", padding: "4px 10px", lineHeight: 1 }}
            onClick={() => { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() - 1); setDate(d.toISOString().split("T")[0]); }}>
            ‹
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ fontSize: "13px", padding: "6px 10px", border: "2px solid var(--border)", borderRadius: "var(--radius-sm)" }} />
          <button className="ghost" style={{ fontSize: "18px", padding: "4px 10px", lineHeight: 1 }}
            onClick={() => { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() + 1); setDate(d.toISOString().split("T")[0]); }}>
            ›
          </button>
          <button className="ghost" style={{ fontSize: "11px", fontWeight: 700 }}
            onClick={() => setDate(new Date().toISOString().split("T")[0])}>
            Today
          </button>
        </div>
      </div>

      {/* ── Main tabs: Reservations / Fired Orders ── */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === "reservations" ? s.tabActive : {}) }} onClick={() => setTab("reservations")}>
          Reservations ({reservations.length})
        </button>
        <button style={{ ...s.tab, ...(tab === "orders" ? s.tabActive : {}) }} onClick={() => setTab("orders")}>
          Fired Orders ({firedOrders.length})
        </button>
      </div>

      {/* ── Reservations tab ── */}
      {tab === "reservations" && (
        <div>
          {/* Status filter strip */}
          <div style={s.filterStrip}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                style={{
                  ...s.filterBtn,
                  ...(statusFilter === f ? {
                    background: f === "all" ? "var(--accent)" : resStatusColor(f),
                    color: "#fff",
                    border: `1.5px solid ${f === "all" ? "var(--accent)" : resStatusColor(f)}`,
                  } : {}),
                }}
                onClick={() => setStatusFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {statusCounts[f] > 0 && (
                  <span style={{
                    ...s.filterCount,
                    background: statusFilter === f ? "rgba(255,255,255,0.25)" : "var(--border-dim)",
                    color: statusFilter === f ? "#fff" : "var(--muted)",
                  }}>
                    {statusCounts[f]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filteredReservations.length === 0 && (
            <div className="card">
              <p className="muted">
                {statusFilter === "all"
                  ? `No reservations for ${date}.`
                  : `No ${statusFilter} reservations for ${date}.`}
              </p>
            </div>
          )}

          {filteredReservations.map((res) => {
            const assignment = getAssignment(res.reservation_id);
            const statusColor = resStatusColor(res.status);

            // Attendee names from the daily endpoint (may be nested)
            const attendeeNames = (res.attendees || [])
              .map((a) => a.member?.name || a.guest_name || "Guest")
              .filter(Boolean);

            // Order summary from res.orders if present
            const orders = res.orders || [];
            const totalItems = orders.reduce((n, o) => n + (o.items?.length || o.item_count || 0), 0);
            const hasFired = orders.some((o) => o.status === "fired");
            const hasFulfilled = orders.every((o) => o.status === "fulfilled") && orders.length > 0;

            // Room name from preference or table assignment
            const prefRoom = res.dining_room?.name || null;
            const assignedTable = assignment ? getTableLabel(assignment.table_id) : null;

            // Unread messages
            const unreadCount = res.unread_message_count || 0;

            return (
              <div key={res.reservation_id} className="card"
                style={{ ...s.resCard, borderLeft: `4px solid ${statusColor}` }}>

                {/* ── Card header: time + status ── */}
                <div style={s.resHeader}>
                  <div>
                    <div style={s.resTime}>
                      {formatTime(res.start_time)}
                      {res.end_time ? ` — ${formatTime(res.end_time)}` : ""}
                    </div>
                    <div style={s.resMeta}>
                      <span className="muted" style={{ fontSize: "11px" }}>
                        #{res.reservation_id} · {res.party_size} guest{res.party_size !== 1 ? "s" : ""}
                      </span>
                      {res.meal_type && (
                        <span style={s.metaChip}>
                          {res.meal_type.charAt(0).toUpperCase() + res.meal_type.slice(1)}
                        </span>
                      )}
                      {prefRoom && !assignedTable && (
                        <span style={s.metaChip}>Pref: {prefRoom}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ ...s.badge, color: statusColor }}>
                    {res.status}
                  </span>
                </div>

                {/* ── Attendee names ── */}
                {attendeeNames.length > 0 && (
                  <div style={s.attendeeRow}>
                    <span style={s.attendeeLabel}>Party:</span>
                    <span style={s.attendeeNames}>{attendeeNames.join(", ")}</span>
                  </div>
                )}

                {/* ── Info chips: table, order status, messages ── */}
                <div style={s.infoChips}>
                  {assignedTable && (
                    <span style={{ ...s.chip, color: "#1B2D45" }}>
                      📍 {assignedTable}
                    </span>
                  )}
                  {hasFulfilled && (
                    <span style={{ ...s.chip, color: "#2e7d32" }}>
                      ✓ Orders fulfilled
                    </span>
                  )}
                  {!hasFulfilled && hasFired && (
                    <span style={{ ...s.chip, color: "#6d28d9" }}>
                      🔥 Orders fired
                    </span>
                  )}
                  {!hasFired && !hasFulfilled && totalItems > 0 && (
                    <span style={{ ...s.chip, color: "#c8783c" }}>
                      🍽 {totalItems} item{totalItems !== 1 ? "s" : ""} selected
                    </span>
                  )}
                  {!hasFired && !hasFulfilled && totalItems === 0 && res.status !== "cancelled" && (
                    <span style={{ ...s.chip, color: "#b45309" }}>
                      ⚠ No order placed
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <span style={{ ...s.chip, color: "#1B2D45" }}>
                      💬 {unreadCount} unread
                    </span>
                  )}
                </div>

                {/* ── Thermometer ── */}
                <div style={{ padding: "12px 0 4px" }}>
                  <ReservationThermometer reservation={res} adminData={res} size="compact" />
                </div>

                {/* ── Table assignment row ── */}
                <div style={s.assignRow}>
                  {assignment ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ fontSize: "12px" }}>
                        📍 <strong>{getTableLabel(assignment.table_id)}</strong>
                      </div>
                      <button className="ghost" style={{ fontSize: "11px" }} onClick={() => openAssignModal(res)}>
                        Reassign
                      </button>
                      <button style={s.dangerBtn} onClick={() => removeAssignment(res.reservation_id)}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button className="ghost" style={{ fontSize: "12px", fontWeight: 700 }} onClick={() => openAssignModal(res)}>
                      + Assign Table
                    </button>
                  )}
                </div>

                {/* ── Action buttons ── */}
                <div style={s.actionRow}>
                  {res.status !== "confirmed" && (
                    <button className="primary" style={{ fontSize: "12px" }}
                      onClick={() => updateStatus(res.reservation_id, "confirmed")}>
                      Confirm
                    </button>
                  )}
                  {res.status !== "cancelled" && (
                    <button style={s.dangerBtn}
                      onClick={() => updateStatus(res.reservation_id, "cancelled")}>
                      Cancel
                    </button>
                  )}
                  {res.status === "cancelled" && (
                    <button className="ghost" style={{ fontSize: "12px" }}
                      onClick={() => updateStatus(res.reservation_id, "draft")}>
                      Restore Draft
                    </button>
                  )}
                  <button className="ghost" style={{ fontSize: "12px", fontWeight: 700 }}
                    onClick={() => setDetailRes(res.reservation_id)}>
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fired Orders tab ── */}
      {tab === "orders" && (
        <div>
          {firedOrders.length === 0 && (
            <div className="card">
              <p className="muted">No fired orders found for this date.</p>
            </div>
          )}
          {firedOrders.map((order) => (
            <div key={order.id} className="card" style={s.orderCard}>
              <div style={s.orderHeader}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "15px" }}>Order #{order.id}</div>
                  {order.attendee?.member?.name || order.attendee?.guest_name ? (
                    <div className="muted" style={{ fontSize: "12px", marginTop: "2px" }}>
                      {order.attendee?.member?.name || order.attendee?.guest_name}
                    </div>
                  ) : null}
                </div>
                <button className="primary" style={{ fontSize: "12px" }} onClick={() => fulfillOrder(order.id)}>
                  ✓ Fulfill
                </button>
              </div>
              {order.items?.length > 0 && (
                <div style={s.itemList}>
                  {order.items.map((item) => (
                    <div key={item.id} style={s.itemRow}>
                      <span>{item.name_snapshot}{item.quantity > 1 && ` x${item.quantity}`}</span>
                      <span style={{ fontWeight: 700 }}>
                        {formatPrice((item.price_cents_snapshot || 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Assign Table modal ── */}
      {assigning && (
        <div style={s.modalOverlay} onClick={() => setAssigning(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalTitle}>Assign Table</div>
            <button onClick={() => setAssigning(null)} style={s.closeBtn}>✕</button>
            <div className="field">
              <label>Room</label>
              <select value={selectedRoomId} onChange={(e) => { setSelectedRoomId(e.target.value); setSelectedTableId(""); }}>
                <option value="">Select a room...</option>
                {activeRooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
            {selectedRoomId && (
              <div className="field">
                <label>Table</label>
                <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)}>
                  <option value="">Select a table...</option>
                  {tablesInRoom(selectedRoomId).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.seat_count} seats</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="ghost" onClick={() => setAssigning(null)}>Cancel</button>
              <button className="primary" onClick={submitAssignment} disabled={assignLoading || !selectedTableId}>
                {assignLoading ? "Assigning..." : "Assign Table"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailRes && (
        <ReservationDetailModal
          reservationId={detailRes}
          onClose={() => setDetailRes(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

const s = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  tabs: {
    display: "flex",
    borderBottom: "2px solid var(--border)",
    marginBottom: "16px",
  },
  tab: {
    padding: "8px 20px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "none",
    border: "none",
    boxShadow: "none",
    cursor: "pointer",
    color: "var(--muted)",
    borderBottom: "2px solid transparent",
    marginBottom: "-2px",
  },
  tabActive: { color: "var(--text)", borderBottom: "2px solid var(--accent)" },

  // Status filter strip
  filterStrip: {
    display: "flex",
    gap: "6px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 12px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    border: "1.5px solid var(--border)",
    borderRadius: "2px",
    background: "white",
    color: "var(--muted)",
    cursor: "pointer",
    boxShadow: "none",
    transition: "all 0.1s",
  },
  filterCount: {
    fontSize: "9px",
    fontWeight: 900,
    borderRadius: "8px",
    padding: "1px 5px",
    minWidth: "16px",
    textAlign: "center",
  },

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
    flexShrink: 0,
  },
  resCard: { marginBottom: "12px" },
  resHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "6px",
  },
  resTime: {
    fontFamily: "Playfair Display, serif",
    fontSize: "20px",
    fontWeight: 900,
  },
  resMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "2px",
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: "11px",
    color: "var(--muted)",
    background: "var(--panel-2)",
    padding: "1px 6px",
    borderRadius: "2px",
    border: "1px solid var(--border-dim)",
  },
  attendeeRow: {
    display: "flex",
    gap: "5px",
    alignItems: "baseline",
    marginBottom: "6px",
  },
  attendeeLabel: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted)",
    flexShrink: 0,
  },
  attendeeNames: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text)",
  },
  infoChips: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  chip: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 8px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "currentColor",
    borderRadius: "2px",
    whiteSpace: "nowrap",
  },
  assignRow: {
    padding: "10px 0",
    borderTop: "1px solid var(--border-dim)",
    borderBottom: "1px solid var(--border-dim)",
    marginBottom: "12px",
  },
  actionRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  dangerBtn: {
    background: "none",
    border: "1.5px solid var(--red)",
    color: "var(--red)",
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    boxShadow: "none",
  },
  orderCard: { marginBottom: "12px" },
  orderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  itemList: { borderTop: "1px solid var(--border-dim)", paddingTop: "8px" },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    fontSize: "13px",
    borderBottom: "1px solid var(--border-dim)",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    border: "2px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "28px",
    width: "440px",
    maxWidth: "90vw",
    boxShadow: "4px 4px 0 var(--border)",
  },
  modalTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "20px",
    fontWeight: 900,
    marginBottom: "16px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    boxShadow: "none",
    color: "var(--muted)",
    fontSize: "18px",
    cursor: "pointer",
    padding: 0,
    float: "right",
    marginTop: "-32px",
  },
};