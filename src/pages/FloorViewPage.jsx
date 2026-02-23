// src/pages/FloorViewPage.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../utils/api";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ROOM_CONFIG = {
  "Breakfast Nook": { cols: 1, accent: "#4a7c59" },
  "Card Room": { cols: 1, accent: "#1e3a5f" },
  "Croquet Court": { cols: 3, accent: "#7c4a1e" },
  "Living Room": { cols: 3, accent: "#4a1e7c" },
  Pool: { cols: 4, accent: "#1e7c6a" },
};

const HEAT = {
  empty: { bg: "#f8f8f6", border: "#d0d0c8", text: "#888", label: "Empty" },
  seated: {
    bg: "#e8f0fe",
    border: "#3a6fa8",
    text: "#1e3a5f",
    label: "Seated",
  },
  ordering: {
    bg: "#fff7e6",
    border: "#c8920a",
    text: "#7a5500",
    label: "Ordering",
  },
  partial: {
    bg: "#fef0e8",
    border: "#d4601a",
    text: "#7a2e00",
    label: "Partial",
  },
  fired: {
    bg: "#e8f5e9",
    border: "#2e7d32",
    text: "#1a4d1c",
    label: "All Fired",
  },
};

const DIETARY_OPTIONS = [
  "dairy_free",
  "egg_free",
  "fish_allergy",
  "gluten_free",
  "halal",
  "kosher",
  "nut_allergy",
  "peanut_allergy",
  "sesame_allergy",
  "shellfish_allergy",
  "soy_free",
  "vegan",
  "vegetarian",
];

export function FloorViewPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "staff";

  const [rooms, setRooms] = useState([]);
  const [tables, setTables] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [bootstraps, setBootstraps] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [firing, setFiring] = useState(null);
  const [panelTab, setPanelTab] = useState("orders"); // "orders" | "edit"

  const loadFloor = async () => {
    setLoading(true);
    try {
      const [roomsData, tablesData, assignmentsData, menuData] =
        await Promise.all([
          api.get("/api/dining-rooms/"),
          api.get("/api/tables"),
          api.get(`/api/admin/seat-assignments?date=${date}`),
          api.get("/api/menu-items"),
        ]);
      setRooms(roomsData);
      setTables(tablesData);
      setAssignments(assignmentsData);
      setMenuItems(menuData.filter((m) => m.is_active));

      const reservationIds = [
        ...new Set(assignmentsData.map((a) => a.reservation_id)),
      ];
      const results = await Promise.all(
        reservationIds.map((rid) =>
          api.get(`/api/reservations/${rid}/bootstrap`).catch(() => null),
        ),
      );
      const bsMap = {};
      reservationIds.forEach((rid, i) => {
        if (results[i]) bsMap[rid] = results[i];
      });
      setBootstraps(bsMap);
    } catch {
      toast.error("Failed to load floor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloor();
  }, [date]);

  const getAssignment = (tid) => assignments.find((a) => a.table_id === tid);
  const getBootstrap = (tid) => {
    const a = getAssignment(tid);
    return a ? bootstraps[a.reservation_id] || null : null;
  };

  const getHeat = (tid) => {
    const bs = getBootstrap(tid);
    if (!bs) return "empty";
    const orders = bs.orders || [];
    if (orders.length === 0) return "seated";
    if (orders.every((o) => o.status !== "open")) return "fired";
    if (orders.some((o) => o.status === "fired" || o.status === "fulfilled"))
      return "partial";
    return "ordering";
  };

  const formatPrice = (c) => `$${((c || 0) / 100).toFixed(2)}`;
  const getName = (att) => att?.member?.name || att?.guest_name || "Guest";

  const selectedBs = selectedTable ? getBootstrap(selectedTable.id) : null;
  const selectedAttendee = selectedBs?.attendees?.find(
    (a) => a.id === selectedAttendeeId,
  );
  const selectedOrder = selectedAttendee
    ? selectedBs?.orders?.find((o) => o.attendee_id === selectedAttendee.id)
    : null;
  const selectedItems = selectedOrder
    ? (selectedBs?.order_items || []).filter(
        (i) => i.order_id === selectedOrder.id,
      )
    : [];
  const isLocked =
    selectedOrder?.status === "fired" || selectedOrder?.status === "fulfilled";

  const fireOrder = async (orderId) => {
    setFiring(orderId);
    try {
      await api.post(`/api/orders/${orderId}/fire`);
      await loadFloor();
      toast.success("Order fired");
    } catch (err) {
      const _msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed";
      toast.error(_msg);
    } finally {
      setFiring(null);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/api/order-items/${itemId}`);
      await loadFloor();
    } catch (err) {
      const _msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed";
      toast.error(_msg);
    }
  };

  const addItem = async (orderId, menuItemId) => {
    try {
      await api.post(`/api/order-items/by-order/${orderId}`, {
        menu_item_id: menuItemId,
        quantity: 1,
        status: "selected",
      });
      await loadFloor();
    } catch (err) {
      const _msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed";
      toast.error(_msg);
    }
  };

  const tablesByRoom = rooms.reduce((acc, room) => {
    acc[room.id] = {
      room,
      tables: tables.filter((t) => t.dining_room_id === room.id && t.is_active),
    };
    return acc;
  }, {});

  if (loading)
    return (
      <div className="page">
        <p className="muted">Loading floor...</p>
      </div>
    );

  return (
    <div style={s.root}>
      {/* FLOOR */}
      <div style={s.floor}>
        <div style={s.floorHeader}>
          <h1 style={s.floorTitle}>
            Floor
            <br />
            View
          </h1>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedTable(null);
              setSelectedAttendeeId(null);
            }}
            style={s.datePicker}
          />
        </div>

        {/* Legend */}
        <div style={s.legend}>
          {Object.entries(HEAT).map(([key, { bg, border, label }]) => (
            <div
              key={key}
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <div
                style={{
                  width: "13px",
                  height: "13px",
                  background: bg,
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: border,
                  borderRadius: "2px",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Rooms */}
        {Object.values(tablesByRoom).map(({ room, tables: rt }) => {
          if (rt.length === 0) return null;
          const cfg = ROOM_CONFIG[room.name] || { cols: 3, accent: "#444" };
          return (
            <div key={room.id} style={s.roomBlock}>
              <div style={s.roomLabel}>
                <span
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftStyle: "solid",
                    borderLeftColor: cfg.accent,
                    paddingLeft: "10px",
                    color: cfg.accent,
                  }}
                >
                  {room.name}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginLeft: "8px",
                  }}
                >
                  {rt.length} table{rt.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div
                style={{
                  ...s.tableGrid,
                  gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
                }}
              >
                {rt.map((table) => {
                  const heat = getHeat(table.id);
                  const { bg, border, text } = HEAT[heat];
                  const bs = getBootstrap(table.id);
                  const isSelected = selectedTable?.id === table.id;

                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        setSelectedTable(isSelected ? null : table);
                        setSelectedAttendeeId(null);
                        setPanelTab("orders");
                      }}
                      style={{
                        ...s.tableBtn,
                        background: bg,
                        borderColor: isSelected ? "var(--accent)" : border,
                        boxShadow: isSelected
                          ? "0 0 0 3px var(--accent)"
                          : "2px 2px 0 rgba(0,0,0,0.06)",
                      }}
                    >
                      <div style={{ ...s.tableName, color: text }}>
                        {table.name}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: text,
                          opacity: 0.7,
                          marginTop: "2px",
                        }}
                      >
                        {table.seat_count} seats
                      </div>
                      {bs ? (
                        <div style={{ marginTop: "8px" }}>
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: border,
                            }}
                          >
                            {bs.party_size} / {table.seat_count}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: text,
                              opacity: 0.7,
                              marginTop: "2px",
                            }}
                          >
                            {formatPrice(bs.reservation_total)} est.
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "3px",
                              marginTop: "6px",
                              justifyContent: "center",
                            }}
                          >
                            {(bs.attendees || []).map((att) => {
                              const ord = bs.orders?.find(
                                (o) => o.attendee_id === att.id,
                              );
                              const dotColor = !ord
                                ? "#ccc"
                                : ord.status === "fulfilled"
                                  ? "#2e7d32"
                                  : ord.status === "fired"
                                    ? "#e06820"
                                    : (bs.order_items || []).filter(
                                          (i) => i.order_id === ord.id,
                                        ).length > 0
                                      ? "#d4a017"
                                      : "#e53935";
                              return (
                                <div
                                  key={att.id}
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    background: dotColor,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "10px",
                            color: text,
                            opacity: 0.6,
                            marginTop: "8px",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            fontWeight: 700,
                          }}
                        >
                          Available
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* SIDE PANEL */}
      {selectedTable && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <div>
              <div style={s.panelTitle}>{selectedTable.name}</div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                {selectedTable.seat_count} seats
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedTable(null);
                setSelectedAttendeeId(null);
              }}
              style={s.closeBtn}
            >
              ✕
            </button>
          </div>

          {!selectedBs ? (
            <div
              style={{
                color: "var(--muted)",
                fontSize: "13px",
                padding: "16px 0",
              }}
            >
              No reservation assigned to this table today.
            </div>
          ) : (
            <>
              {/* Res info */}
              <div style={s.resInfo}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {new Date(
                    selectedBs.reservation.date + "T12:00:00",
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {selectedBs.reservation.start_time?.slice(0, 5)}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginTop: "2px",
                  }}
                >
                  {selectedBs.party_size} guest
                  {selectedBs.party_size !== 1 ? "s" : ""} · Est.{" "}
                  {formatPrice(selectedBs.reservation_total)}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <span
                    style={{
                      ...s.statusBadge,
                      color:
                        selectedBs.reservation.status === "confirmed"
                          ? "#2e7d32"
                          : selectedBs.reservation.status === "cancelled"
                            ? "#c0392b"
                            : "#888",
                      borderColor:
                        selectedBs.reservation.status === "confirmed"
                          ? "#2e7d32"
                          : selectedBs.reservation.status === "cancelled"
                            ? "#c0392b"
                            : "#888",
                    }}
                  >
                    {selectedBs.reservation.status}
                  </span>
                </div>
              </div>

              {/* Panel tabs — only show edit tab to admin/staff */}
              {isAdmin && (
                <div style={s.panelTabs}>
                  <button
                    style={{
                      ...s.panelTab,
                      ...(panelTab === "orders" ? s.panelTabActive : {}),
                    }}
                    onClick={() => setPanelTab("orders")}
                  >
                    Orders
                  </button>
                  <button
                    style={{
                      ...s.panelTab,
                      ...(panelTab === "edit" ? s.panelTabActive : {}),
                    }}
                    onClick={() => setPanelTab("edit")}
                  >
                    Edit
                  </button>
                </div>
              )}

              {/* ── ORDERS TAB ── */}
              {panelTab === "orders" && (
                <>
                  <div style={s.panelLabel}>Seats</div>
                  <div style={s.seatRow}>
                    {(selectedBs.attendees || []).map((att, idx) => {
                      const ord = selectedBs.orders?.find(
                        (o) => o.attendee_id === att.id,
                      );
                      const items = (selectedBs.order_items || []).filter(
                        (i) => i.order_id === ord?.id,
                      );
                      const isThisSelected = selectedAttendeeId === att.id;
                      const seatColor = !ord
                        ? "#bbb"
                        : ord.status === "fulfilled"
                          ? "#2e7d32"
                          : ord.status === "fired"
                            ? "#e06820"
                            : items.length > 0
                              ? "#d4a017"
                              : "#e53935";

                      return (
                        <button
                          key={att.id}
                          onClick={() =>
                            setSelectedAttendeeId(
                              isThisSelected ? null : att.id,
                            )
                          }
                          style={{
                            ...s.seatDot,
                            borderColor: seatColor,
                            background: isThisSelected ? seatColor : "white",
                            color: isThisSelected ? "white" : "#333",
                          }}
                        >
                          <div style={{ fontSize: "9px", fontWeight: 900 }}>
                            {idx + 1}
                          </div>
                          <div style={{ fontSize: "9px" }}>
                            {getName(att).split(" ")[0].slice(0, 6)}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedAttendee && (
                    <div style={s.attendeePanel}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "10px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: "Playfair Display, serif",
                              fontSize: "14px",
                              fontWeight: 900,
                              color: "var(--text)",
                            }}
                          >
                            {getName(selectedAttendee)}
                          </div>
                          {selectedOrder && (
                            <span
                              style={{
                                ...s.statusBadge,
                                color:
                                  selectedOrder.status === "fired"
                                    ? "#e06820"
                                    : selectedOrder.status === "fulfilled"
                                      ? "#2e7d32"
                                      : "#888",
                                borderColor:
                                  selectedOrder.status === "fired"
                                    ? "#e06820"
                                    : selectedOrder.status === "fulfilled"
                                      ? "#2e7d32"
                                      : "#888",
                              }}
                            >
                              {selectedOrder.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedAttendee.dietary_restrictions?.length > 0 && (
                        <div style={{ marginBottom: "10px" }}>
                          <div style={s.panelLabel}>Dietary</div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "3px",
                            }}
                          >
                            {selectedAttendee.dietary_restrictions.map((d) => (
                              <span key={d} style={s.dietTag}>
                                {d.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ marginBottom: "10px" }}>
                        <div style={s.panelLabel}>Order</div>
                        {selectedItems.length === 0 ? (
                          <div
                            style={{ fontSize: "12px", color: "var(--muted)" }}
                          >
                            No items yet
                          </div>
                        ) : (
                          selectedItems.map((item) => (
                            <div key={item.id} style={s.itemRow}>
                              <div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: "var(--text)",
                                  }}
                                >
                                  {item.name_snapshot}
                                </div>
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--muted)",
                                  }}
                                >
                                  {formatPrice(item.price_cents_snapshot)} ×{" "}
                                  {item.quantity}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 900,
                                    color: "var(--text)",
                                  }}
                                >
                                  {formatPrice(
                                    (item.price_cents_snapshot || 0) *
                                      item.quantity,
                                  )}
                                </span>
                                {!isLocked && (
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    style={s.removeBtn}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {selectedOrder && selectedItems.length > 0 && (
                          <div
                            style={{
                              textAlign: "right",
                              fontSize: "12px",
                              paddingTop: "6px",
                              borderTop: "1px solid var(--border-dim)",
                              marginTop: "6px",
                              color: "var(--text)",
                            }}
                          >
                            <strong>
                              {formatPrice(
                                selectedBs.order_totals?.[selectedOrder.id] ||
                                  0,
                              )}
                            </strong>
                          </div>
                        )}
                      </div>

                      {!isLocked && selectedOrder && (
                        <div style={{ marginBottom: "10px" }}>
                          <div style={s.panelLabel}>Add</div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            {menuItems.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => addItem(selectedOrder.id, m.id)}
                                style={s.addItemBtn}
                              >
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text)",
                                  }}
                                >
                                  {m.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    color: "var(--text)",
                                  }}
                                >
                                  {formatPrice(m.price_cents)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isLocked &&
                        selectedOrder &&
                        selectedItems.length > 0 && (
                          <button
                            onClick={() => fireOrder(selectedOrder.id)}
                            disabled={firing === selectedOrder.id}
                            style={s.fireBtn}
                          >
                            {firing === selectedOrder.id
                              ? "Firing..."
                              : "🔥 Fire Order"}
                          </button>
                        )}
                      {isLocked && selectedOrder && (
                        <button
                          style={s.ghostBtn}
                          onClick={() =>
                            window.open(
                              `${API_BASE}/api/orders/${selectedOrder.id}/chit`,
                              "_blank",
                            )
                          }
                        >
                          Print Chit
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── EDIT TAB ── */}
              {panelTab === "edit" && isAdmin && (
                <ReservationEditPanel
                  bootstrap={selectedBs}
                  allTables={tables}
                  onSaved={loadFloor}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── RESERVATION EDIT PANEL ────────────────────────────────────────────────────

function ReservationEditPanel({ bootstrap, allTables, onSaved }) {
  const res = bootstrap.reservation;
  const [form, setForm] = useState({
    date: res.date || "",
    start_time: res.start_time || "",
    status: res.status || "draft",
    notes: res.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState(null);

  const saveReservation = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/reservations/${res.id}`, form);
      toast.success("Saved");
      onSaved();
    } catch (err) {
      const msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveAttendee = async (id, patch) => {
    try {
      await api.patch(`/api/admin/attendees/${id}`, patch);
      toast.success("Attendee saved");
      onSaved();
      setEditingAttendee(null);
    } catch (err) {
      const _msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed";
      toast.error(_msg);
    }
  };

  const removeAttendee = async (id) => {
    try {
      await api.delete(`/api/admin/attendees/${id}`);
      toast.success("Removed");
      onSaved();
    } catch (err) {
      const _msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed";
      toast.error(_msg);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Res fields */}
      <div>
        <div style={s.panelLabel}>Reservation #{res.id}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <div style={s.fieldLabel}>Date</div>
            <input
              style={s.fieldInput}
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <div style={s.fieldLabel}>Time</div>
            <input
              style={s.fieldInput}
              type="time"
              value={form.start_time}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_time: e.target.value }))
              }
            />
          </div>
          <div>
            <div style={s.fieldLabel}>Status</div>
            <select
              style={s.fieldInput}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <div style={s.fieldLabel}>Notes</div>
            <textarea
              style={{ ...s.fieldInput, resize: "vertical" }}
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <button onClick={saveReservation} disabled={saving} style={s.saveBtn}>
            {saving ? "Saving..." : "Save Reservation"}
          </button>
        </div>
      </div>

      {/* Attendees */}
      <div
        style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "14px" }}
      >
        <div style={s.panelLabel}>Attendees</div>
        {(bootstrap.attendees || []).map((att) => (
          <div
            key={att.id}
            style={{
              marginBottom: "8px",
              padding: "8px",
              background: "var(--panel-2)",
              borderRadius: "var(--radius-sm)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--border-dim)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {att.member?.name || att.guest_name || "Guest"}
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  style={s.tinyBtn}
                  onClick={() =>
                    setEditingAttendee(
                      editingAttendee === att.id ? null : att.id,
                    )
                  }
                >
                  {editingAttendee === att.id ? "Close" : "Edit"}
                </button>
                <button
                  style={s.tinyDeleteBtn}
                  onClick={() => removeAttendee(att.id)}
                >
                  Del
                </button>
              </div>
            </div>
            {(att.dietary_restrictions || []).length > 0 && (
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--muted)",
                  marginTop: "3px",
                }}
              >
                {att.dietary_restrictions.join(", ")}
              </div>
            )}
            {editingAttendee === att.id && (
              <AttendeeEditInline
                attendee={att}
                onSave={(patch) => saveAttendee(att.id, patch)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendeeEditInline({ attendee, onSave }) {
  const [form, setForm] = useState({
    guest_name: attendee.guest_name || "",
    dietary_restrictions: attendee.dietary_restrictions || [],
  });
  const toggleDiet = (val) =>
    setForm((f) => ({
      ...f,
      dietary_restrictions: f.dietary_restrictions.includes(val)
        ? f.dietary_restrictions.filter((d) => d !== val)
        : [...f.dietary_restrictions, val],
    }));

  return (
    <div
      style={{
        marginTop: "10px",
        paddingTop: "10px",
        borderTop: "1px solid var(--border-dim)",
      }}
    >
      <div style={s.fieldLabel}>Name</div>
      <input
        style={{ ...s.fieldInput, marginBottom: "8px" }}
        value={form.guest_name}
        onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
      />
      <div style={s.fieldLabel}>Dietary</div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px",
          marginBottom: "8px",
        }}
      >
        {DIETARY_OPTIONS.map((opt) => {
          const on = form.dietary_restrictions.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleDiet(opt)}
              style={{
                padding: "2px 7px",
                fontSize: "9px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                borderRadius: "2px",
                boxShadow: "none",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: on ? "var(--accent)" : "var(--border-dim)",
                background: on ? "var(--accent)" : "white",
                color: on ? "white" : "var(--muted)",
              }}
            >
              {opt.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
      <button style={s.saveBtn} onClick={() => onSave(form)}>
        Save Attendee
      </button>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = {
  root: { display: "flex", height: "100vh", overflow: "hidden" },
  floor: { flex: 1, overflowY: "auto", padding: "32px 24px" },
  floorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  floorTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "28px",
    fontWeight: 900,
    margin: 0,
    lineHeight: 1.1,
  },
  datePicker: {
    fontSize: "13px",
    padding: "6px 10px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
    background: "white",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "28px",
  },
  roomBlock: { marginBottom: "32px" },
  roomLabel: {
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
  },
  tableGrid: { display: "grid", gap: "12px" },
  tableBtn: {
    padding: "16px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.15s",
    minHeight: "100px",
  },
  tableName: {
    fontFamily: "Playfair Display, serif",
    fontSize: "14px",
    fontWeight: 900,
  },
  panel: {
    width: "300px",
    flexShrink: 0,
    borderLeftWidth: "2px",
    borderLeftStyle: "solid",
    borderLeftColor: "var(--border)",
    overflowY: "auto",
    padding: "24px",
    background: "white",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  panelTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "20px",
    fontWeight: 900,
    color: "var(--text)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    boxShadow: "none",
    color: "var(--muted)",
    fontSize: "16px",
    cursor: "pointer",
    padding: 0,
  },
  resInfo: {
    padding: "12px",
    background: "var(--panel-2)",
    borderRadius: "var(--radius-sm)",
    marginBottom: "14px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-dim)",
  },
  statusBadge: {
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "2px 8px",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderRadius: "2px",
    display: "inline-block",
  },
  panelTabs: {
    display: "flex",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    marginBottom: "16px",
  },
  panelTab: {
    flex: 1,
    padding: "6px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    background: "none",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    boxShadow: "none",
    cursor: "pointer",
    color: "var(--muted)",
    marginBottom: "-2px",
  },
  panelTabActive: { color: "var(--text)", borderBottomColor: "var(--accent)" },
  panelLabel: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: "6px",
  },
  seatRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginBottom: "16px",
  },
  seatDot: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    borderWidth: "2px",
    borderStyle: "solid",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
    boxShadow: "none",
  },
  attendeePanel: {
    background: "var(--panel-2)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-dim)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
  },
  dietTag: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 5px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--muted)",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid var(--border-dim)",
  },
  removeBtn: {
    background: "none",
    border: "none",
    boxShadow: "none",
    color: "var(--muted)",
    fontSize: "11px",
    cursor: "pointer",
    padding: 0,
  },
  addItemBtn: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 10px",
    background: "white",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-dim)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    boxShadow: "none",
    width: "100%",
  },
  fireBtn: {
    width: "100%",
    padding: "8px",
    fontSize: "12px",
    fontWeight: 700,
    background: "#c8783c",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "#fff",
    boxShadow: "none",
    marginBottom: "6px",
  },
  ghostBtn: {
    width: "100%",
    padding: "7px",
    fontSize: "11px",
    fontWeight: 700,
    background: "transparent",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "var(--text)",
    boxShadow: "none",
  },
  fieldLabel: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "var(--muted)",
    marginBottom: "3px",
  },
  fieldInput: {
    width: "100%",
    padding: "6px 8px",
    fontSize: "12px",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
    background: "white",
    boxSizing: "border-box",
  },
  saveBtn: {
    width: "100%",
    padding: "7px",
    fontSize: "12px",
    fontWeight: 700,
    background: "var(--accent)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "#fff",
    boxShadow: "none",
  },
  tinyBtn: {
    padding: "2px 8px",
    fontSize: "10px",
    fontWeight: 700,
    background: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "2px",
    cursor: "pointer",
    color: "var(--text)",
    boxShadow: "none",
  },
  tinyDeleteBtn: {
    padding: "2px 8px",
    fontSize: "10px",
    fontWeight: 700,
    background: "transparent",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#c0392b",
    borderRadius: "2px",
    cursor: "pointer",
    color: "#c0392b",
    boxShadow: "none",
  },
};
