// src/pages/ReservationDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { api } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function ReservationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { menuItems } = useData();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firing, setFiring] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [view, setView] = useState("orders");

  const fetchBootstrap = async () => {
    try {
      const result = await api.get(`/api/reservations/${id}/bootstrap`);
      setData(result);
    } catch {
      toast.error("Failed to load reservation");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // IMPORTANT:
  // - api.patch(/api/reservations/:id) returns ReservationRead (ReservationRead)
  // - Bootstrap endpoint is what drives your pill, so we refresh bootstrap
  // - But to avoid the UI “sticking” when bootstrap fetch is cached/slow,
  //   we also update local state immediately from the PATCH response.
  const patchReservationStatus = async (nextStatus, successMsg) => {
    try {
      const updated = await api.patch(`/api/reservations/${id}`, {
        status: nextStatus,
      });

      // optimistic local update so the pill changes immediately
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reservation: {
            ...prev.reservation,
            status: updated.status,
          },
        };
      });

      // hard refresh from server
      await fetchBootstrap();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(err?.detail || "Failed to update reservation");
      // re-sync in case optimistic update was wrong
      await fetchBootstrap().catch(() => {});
    }
  };

  const confirmReservation = async () => {
    setConfirming(true);
    try {
      await patchReservationStatus("confirmed", "Reservation confirmed");
    } finally {
      setConfirming(false);
    }
  };

  const cancelReservation = async () => {
    await patchReservationStatus("cancelled", "Reservation cancelled");
  };

  const restoreDraft = async () => {
    await patchReservationStatus("draft", "Restored to draft");
  };

  const addItem = async (orderId, menuItemId) => {
    try {
      await api.post(`/api/order-items/by-order/${orderId}`, {
        menu_item_id: menuItemId,
        quantity: 1,
        status: "selected",
      });
      await fetchBootstrap();
    } catch (err) {
      toast.error(err?.detail || "Failed to add item");
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/api/order-items/${itemId}`);
      await fetchBootstrap();
    } catch (err) {
      toast.error(err?.detail || "Failed to remove item");
    }
  };

  const fireOrder = async (orderId) => {
    setFiring(orderId);
    try {
      await api.post(`/api/orders/${orderId}/fire`);
      await fetchBootstrap();
      toast.success("Order fired to kitchen");
    } catch (err) {
      toast.error(err?.detail || "Failed to fire order");
    } finally {
      setFiring(null);
    }
  };

  const fireAllUnfired = async () => {
    if (!data) return;

    const unfired = data.orders.filter((o) => {
      const items = data.order_items.filter((i) => i.order_id === o.id);
      return o.status === "open" && items.length > 0;
    });

    if (unfired.length === 0) {
      toast.error("No unfired orders with items");
      return;
    }

    for (const order of unfired) {
      // eslint-disable-next-line no-await-in-loop
      await fireOrder(order.id);
    }

    toast.success(
      `Fired ${unfired.length} order${unfired.length !== 1 ? "s" : ""}`,
    );
  };

  const openChit = (orderId) =>
    window.open(`${API_BASE}/api/orders/${orderId}/chit`, "_blank");

  if (loading)
    return (
      <div className="page">
        <p className="muted">Loading...</p>
      </div>
    );

  if (!data) return null;

  const {
    reservation,
    attendees,
    orders,
    order_items,
    order_totals,
    reservation_total,
    messages,
  } = data;

  const getOrderForAttendee = (aId) =>
    orders.find((o) => o.attendee_id === aId);

  const getItemsForOrder = (oId) =>
    order_items.filter((i) => i.order_id === oId);

  const getAttendeeName = (a) => a.member?.name || a.guest_name || "Guest";

  const formatTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
  };

  const formatPrice = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  const unfiredWithItems = orders.filter((o) => {
    const items = getItemsForOrder(o.id);
    return o.status === "open" && items.length > 0;
  });

  const isDraft = reservation.status === "draft";
  const isConfirmed = reservation.status === "confirmed";
  const isCancelled = reservation.status === "cancelled";

  const statusColors = {
    draft: "#888",
    confirmed: "#2e7d32",
    cancelled: "#c0392b",
    fired: "#c8783c",
    fulfilled: "#2e7d32",
    open: "#888",
  };

  return (
    <div className="page" style={{ maxWidth: "860px" }}>
      {/* HEADER */}
      <div style={s.header}>
        <div>
          <button
            className="ghost"
            onClick={() => navigate("/")}
            style={{ marginBottom: "12px", fontSize: "11px" }}
          >
            ← Back
          </button>

          <h1 style={{ fontSize: "28px", marginBottom: "4px" }}>
            {new Date(reservation.date + "T12:00:00").toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              },
            )}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "14px", color: "var(--muted)" }}>
              {formatTime(reservation.start_time)}
              {reservation.end_time
                ? ` — ${formatTime(reservation.end_time)}`
                : ""}
            </span>

            <span
              style={{
                ...s.badge,
                color: statusColors[reservation.status] || "var(--muted)",
                borderColor: statusColors[reservation.status] || "var(--muted)",
              }}
            >
              {reservation.status}
            </span>

            <span className="muted" style={{ fontSize: "11px" }}>
              #{reservation.id}
            </span>
          </div>

          {reservation.notes && (
            <p className="muted" style={{ marginTop: "8px" }}>
              {reservation.notes}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            {isDraft && (
              <>
                <button
                  onClick={confirmReservation}
                  disabled={confirming}
                  style={s.confirmBtn}
                >
                  {confirming ? "Confirming..." : "✓ Confirm Reservation"}
                </button>
                <button onClick={cancelReservation} style={s.cancelBtn}>
                  Cancel
                </button>
              </>
            )}

            {isConfirmed && (
              <button onClick={cancelReservation} style={s.cancelBtn}>
                Cancel Reservation
              </button>
            )}

            {isCancelled && (
              <button onClick={restoreDraft} style={s.ghostActionBtn}>
                Restore to Draft
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="muted" style={{ fontSize: "12px" }}>
            Est. Total
          </div>
          <div style={{ fontSize: "24px", fontWeight: 900 }}>
            {formatPrice(reservation_total)}
          </div>
          <div className="muted" style={{ fontSize: "10px", marginTop: "2px" }}>
            selected items only
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={s.tabs}>
        <button
          style={{ ...s.tab, ...(view === "orders" ? s.tabActive : {}) }}
          onClick={() => setView("orders")}
        >
          Orders
        </button>
        <button
          style={{ ...s.tab, ...(view === "floor" ? s.tabActive : {}) }}
          onClick={() => setView("floor")}
        >
          Table View
        </button>
      </div>

      {/* FIRE ALL BANNER */}
      {unfiredWithItems.length > 0 && (
        <div style={s.fireBanner}>
          <span>
            {unfiredWithItems.length} order
            {unfiredWithItems.length !== 1 ? "s" : ""} ready to fire
          </span>
          <button onClick={fireAllUnfired} style={s.fireBtn}>
            🔥 Fire All Unfired
          </button>
        </div>
      )}

      {/* ORDERS VIEW */}
      {view === "orders" && (
        <div>
          {attendees.map((attendee) => {
            const order = getOrderForAttendee(attendee.id);
            const items = order ? getItemsForOrder(order.id) : [];
            const orderTotal = order ? order_totals[order.id] || 0 : 0;
            const isLocked =
              order?.status === "fired" || order?.status === "fulfilled";
            const name = getAttendeeName(attendee);

            const rowAccent = !order
              ? "var(--border)"
              : isLocked
                ? "#2e7d32"
                : items.length === 0
                  ? "#c0392b"
                  : "#c8783c";

            return (
              <div
                key={attendee.id}
                className="card"
                style={{
                  ...s.attendeeCard,
                  borderLeft: `4px solid ${rowAccent}`,
                }}
              >
                <div style={s.attendeeHeader}>
                  <div>
                    <div style={s.attendeeName}>{name}</div>
                    {attendee.dietary_restrictions?.length > 0 && (
                      <div style={s.dietTags}>
                        {attendee.dietary_restrictions.map((d) => (
                          <span key={d} style={s.dietTag}>
                            {d.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    {order && (
                      <>
                        <span
                          style={{
                            ...s.badge,
                            color: statusColors[order.status] || "#888",
                            borderColor: statusColors[order.status] || "#888",
                          }}
                        >
                          {order.status}
                        </span>
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: 900,
                            marginTop: "4px",
                          }}
                        >
                          {formatPrice(orderTotal)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {items.length > 0 && (
                  <div style={s.itemList}>
                    {items.map((item) => (
                      <div key={item.id} style={s.itemRow}>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {item.name_snapshot}
                          </div>
                          <div className="muted" style={{ fontSize: "11px" }}>
                            {formatPrice(item.price_cents_snapshot)} ×{" "}
                            {item.quantity}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {formatPrice(
                              (item.price_cents_snapshot || 0) * item.quantity,
                            )}
                          </div>
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
                    ))}
                    <div style={s.orderTotal}>
                      Subtotal: <strong>{formatPrice(orderTotal)}</strong>
                    </div>
                  </div>
                )}

                {!isLocked && order && (
                  <div style={s.menuSection}>
                    <div style={s.menuTitle}>Add Items</div>
                    <div style={s.menuGrid}>
                      {menuItems
                        .filter((m) => m.is_active)
                        .map((menuItem) => (
                          <button
                            key={menuItem.id}
                            type="button"
                            onClick={() => addItem(order.id, menuItem.id)}
                            style={s.menuBtn}
                          >
                            <div style={{ fontWeight: 700 }}>
                              {menuItem.name}
                            </div>
                            <div style={{ fontSize: "11px", opacity: 0.7 }}>
                              {formatPrice(menuItem.price_cents)}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                  }}
                >
                  {!isLocked && order && items.length > 0 && (
                    <button
                      onClick={() => fireOrder(order.id)}
                      disabled={firing === order.id}
                      style={s.fireBtn}
                    >
                      {firing === order.id ? "Firing..." : "🔥 Fire Order"}
                    </button>
                  )}
                  {isLocked && order && (
                    <button
                      onClick={() => openChit(order.id)}
                      style={s.ghostActionBtn}
                    >
                      Print Chit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === "floor" && (
        <TableStatusView
          attendees={attendees}
          orders={orders}
          orderItems={order_items}
          orderTotals={order_totals}
          reservationTotal={reservation_total}
          getOrderForAttendee={(aId) =>
            orders.find((o) => o.attendee_id === aId)
          }
          getItemsForOrder={(oId) =>
            order_items.filter((i) => i.order_id === oId)
          }
          getAttendeeName={getAttendeeName}
          formatPrice={formatPrice}
          onFire={fireOrder}
          onRemoveItem={removeItem}
          onAddItem={addItem}
          menuItems={menuItems}
          firing={firing}
          openChit={openChit}
        />
      )}

      {/* MESSAGES */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div style={s.sectionTitle}>Messages</div>
        {messages.length === 0 && <p className="muted">No messages yet.</p>}
        <div style={s.messageList}>
          {messages.map((msg) => (
            <div key={msg.id} style={s.messageRow}>
              <div style={s.messageSender}>{msg.sender?.email || "Staff"}</div>
              <div style={s.messageBody}>{msg.body}</div>
              <div className="muted" style={{ fontSize: "10px" }}>
                {new Date(msg.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <MessageComposer
          reservationId={reservation.id}
          onSent={fetchBootstrap}
        />
      </div>
    </div>
  );
}

// ── TABLE STATUS VIEW ─────────────────────────────────────────────────────────

function TableStatusView({
  attendees,
  orders,
  orderItems,
  orderTotals,
  reservationTotal,
  getOrderForAttendee,
  getItemsForOrder,
  getAttendeeName,
  formatPrice,
  onFire,
  onRemoveItem,
  onAddItem,
  menuItems,
  firing,
  openChit,
}) {
  const [selected, setSelected] = useState(null);

  const selectedAttendee = selected
    ? attendees.find((a) => a.id === selected)
    : null;
  const selectedOrder = selectedAttendee
    ? getOrderForAttendee(selectedAttendee.id)
    : null;
  const selectedItems = selectedOrder ? getItemsForOrder(selectedOrder.id) : [];
  const isLocked =
    selectedOrder?.status === "fired" || selectedOrder?.status === "fulfilled";

  return (
    <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={s.tableLabel}>
          Table — {attendees.length} seat{attendees.length !== 1 ? "s" : ""}
        </div>
        <div
          className="muted"
          style={{ fontSize: "11px", marginBottom: "16px" }}
        >
          Click a seat to view order
        </div>

        <div style={s.seatGrid}>
          {attendees.map((attendee, idx) => {
            const order = getOrderForAttendee(attendee.id);
            const items = getItemsForOrder(order?.id);
            const isSelected = selected === attendee.id;

            const seatColor = !order
              ? "#aaa"
              : order.status === "fired" || order.status === "fulfilled"
                ? "#2e7d32"
                : items.length === 0
                  ? "#c0392b"
                  : "#c8783c";

            return (
              <button
                key={attendee.id}
                onClick={() => setSelected(isSelected ? null : attendee.id)}
                style={{
                  ...s.seatBtn,
                  border: `2px solid ${seatColor}`,
                  background: isSelected ? seatColor : "white",
                  color: isSelected ? "white" : "#333",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {idx + 1}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    marginTop: "4px",
                  }}
                >
                  {getAttendeeName(attendee).split(" ")[0]}
                </div>
                <div
                  style={{ fontSize: "9px", marginTop: "2px", opacity: 0.8 }}
                >
                  {order?.status || "no order"}
                </div>
              </button>
            );
          })}
        </div>

        <div style={s.legend}>
          {[
            { color: "#2e7d32", label: "Fired / Fulfilled" },
            { color: "#c8783c", label: "Open — items selected" },
            { color: "#c0392b", label: "Open — no items" },
            { color: "#aaa", label: "No order" },
          ].map(({ color, label }) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <div style={s.summaryRow}>
          {orders.map((o) => {
            const att = attendees.find((a) => a.id === o.attendee_id);
            const items = getItemsForOrder(o.id);
            return (
              <div key={o.id} style={s.summaryCell}>
                <div style={{ fontWeight: 700, fontSize: "12px" }}>
                  {getAttendeeName(att)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontWeight: 900, fontSize: "13px" }}>
                  {formatPrice(orderTotals[o.id] || 0)}
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color:
                      o.status === "fired"
                        ? "#c8783c"
                        : o.status === "fulfilled"
                          ? "#2e7d32"
                          : "var(--muted)",
                  }}
                >
                  {o.status}
                </div>
              </div>
            );
          })}

          <div
            style={{ ...s.summaryCell, borderLeft: "2px solid var(--border)" }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: "11px",
                color: "var(--muted)",
              }}
            >
              EST. TOTAL
            </div>
            <div style={{ fontWeight: 900, fontSize: "20px" }}>
              {formatPrice(reservationTotal)}
            </div>
          </div>
        </div>
      </div>

      {selectedAttendee && (
        <div style={s.sidePanel}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <div>
              <div style={s.attendeeName}>
                {getAttendeeName(selectedAttendee)}
              </div>
              {selectedOrder && (
                <span
                  style={{
                    ...s.badge,
                    color:
                      selectedOrder.status === "fired"
                        ? "#c8783c"
                        : selectedOrder.status === "fulfilled"
                          ? "#2e7d32"
                          : "#888",
                    borderColor:
                      selectedOrder.status === "fired"
                        ? "#c8783c"
                        : selectedOrder.status === "fulfilled"
                          ? "#2e7d32"
                          : "#888",
                  }}
                >
                  {selectedOrder.status}
                </span>
              )}
            </div>
            <button onClick={() => setSelected(null)} style={s.removeBtn}>
              ✕
            </button>
          </div>

          {selectedAttendee.dietary_restrictions?.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={s.panelLabel}>Dietary</div>
              <div style={s.dietTags}>
                {selectedAttendee.dietary_restrictions.map((d) => (
                  <span key={d} style={s.dietTag}>
                    {d.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <div style={s.panelLabel}>Order</div>
            {selectedItems.length === 0 ? (
              <div className="muted" style={{ fontSize: "12px" }}>
                No items selected
              </div>
            ) : (
              selectedItems.map((item) => (
                <div key={item.id} style={s.panelItem}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px" }}>
                      {item.name_snapshot}
                    </div>
                    <div className="muted" style={{ fontSize: "11px" }}>
                      {formatPrice(item.price_cents_snapshot)} × {item.quantity}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontWeight: 900, fontSize: "13px" }}>
                      {formatPrice(
                        (item.price_cents_snapshot || 0) * item.quantity,
                      )}
                    </span>
                    {!isLocked && (
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        style={s.removeBtn}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {selectedOrder && (
              <div
                style={{
                  textAlign: "right",
                  fontSize: "13px",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--border-dim)",
                  marginTop: "8px",
                }}
              >
                <strong>
                  {formatPrice(orderTotals[selectedOrder.id] || 0)}
                </strong>
              </div>
            )}
          </div>

          {!isLocked && selectedOrder && (
            <div>
              <div style={s.panelLabel}>Add Items</div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {menuItems
                  .filter((m) => m.is_active)
                  .map((menuItem) => (
                    <button
                      key={menuItem.id}
                      type="button"
                      onClick={() => onAddItem(selectedOrder.id, menuItem.id)}
                      style={s.panelMenuBtn}
                    >
                      <span>{menuItem.name}</span>
                      <span style={{ fontWeight: 900 }}>
                        {formatPrice(menuItem.price_cents)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
            {!isLocked && selectedOrder && selectedItems.length > 0 && (
              <button
                style={{ ...s.fireBtn, width: "100%" }}
                onClick={() => onFire(selectedOrder.id)}
                disabled={firing === selectedOrder.id}
              >
                {firing === selectedOrder.id ? "Firing..." : "🔥 Fire Order"}
              </button>
            )}

            {isLocked && selectedOrder && (
              <button
                style={{ ...s.ghostActionBtn, width: "100%" }}
                onClick={() => openChit(selectedOrder.id)}
              >
                Print Chit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MESSAGE COMPOSER ──────────────────────────────────────────────────────────

function MessageComposer({ reservationId, onSent }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.post("/api/messages", { reservation_id: reservationId, body });
      setBody("");
      await onSent();
    } catch (err) {
      toast.error(err?.detail || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Send a message to staff..."
        onKeyDown={(e) => e.key === "Enter" && send()}
      />
      <button
        className="primary"
        onClick={send}
        disabled={sending}
        style={{ whiteSpace: "nowrap" }}
      >
        {sending ? "..." : "Send"}
      </button>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const s = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
  },
  tabs: {
    display: "flex",
    borderBottom: "2px solid var(--border)",
    marginBottom: "24px",
  },
  tab: {
    padding: "8px 20px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    boxShadow: "none",
    cursor: "pointer",
    color: "var(--muted)",
    marginBottom: "-2px",
  },
  tabActive: { color: "var(--text)", borderBottom: "2px solid var(--accent)" },
  badge: {
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 10px",
    border: "1.5px solid currentColor",
    borderRadius: "2px",
    display: "inline-block",
  },
  confirmBtn: {
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 700,
    background: "#2e7d32",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "#fff",
    boxShadow: "none",
  },
  cancelBtn: {
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 700,
    background: "transparent",
    border: "1.5px solid #c0392b",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "#c0392b",
    boxShadow: "none",
  },
  ghostActionBtn: {
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 700,
    background: "transparent",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "var(--text)",
    boxShadow: "none",
  },
  fireBtn: {
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 700,
    background: "#c8783c",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "#fff",
    boxShadow: "none",
  },
  fireBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#fff7e6",
    border: "2px solid #c8783c",
    borderRadius: "var(--radius-sm)",
    marginBottom: "20px",
    fontSize: "13px",
    fontWeight: 700,
  },
  attendeeCard: { marginBottom: "16px" },
  attendeeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  attendeeName: {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "4px",
  },
  dietTags: { display: "flex", flexWrap: "wrap", gap: "4px" },
  dietTag: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 6px",
    border: "1px solid var(--border-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted)",
  },
  itemList: {
    borderTop: "1px solid var(--border-dim)",
    paddingTop: "12px",
    marginBottom: "16px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid var(--border-dim)",
  },
  orderTotal: {
    textAlign: "right",
    padding: "8px 0",
    fontSize: "13px",
    color: "var(--muted)",
  },
  removeBtn: {
    background: "none",
    border: "none",
    boxShadow: "none",
    color: "var(--muted)",
    fontSize: "13px",
    cursor: "pointer",
    padding: "0",
  },
  menuSection: { borderTop: "1px solid var(--border-dim)", paddingTop: "16px" },
  menuTitle: {
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: "10px",
  },
  menuGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  menuBtn: {
    padding: "8px 14px",
    background: "white",
    border: "2px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    boxShadow: "2px 2px 0 var(--border)",
    textAlign: "left",
    fontSize: "12px",
    color: "var(--text)",
  },
  sectionTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "16px",
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "16px",
  },
  messageRow: {
    padding: "12px",
    background: "var(--panel-2)",
    border: "1px solid var(--border-dim)",
    borderRadius: "var(--radius-sm)",
  },
  messageSender: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--accent)",
    marginBottom: "4px",
  },
  messageBody: { fontSize: "14px", lineHeight: 1.5 },
  tableLabel: {
    fontFamily: "Playfair Display, serif",
    fontSize: "20px",
    fontWeight: 900,
    marginBottom: "4px",
  },
  seatGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px",
  },
  seatBtn: {
    width: "80px",
    height: "80px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
    boxShadow: "none",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
  },
  summaryRow: {
    display: "flex",
    flexWrap: "wrap",
    border: "2px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
  },
  summaryCell: {
    flex: 1,
    minWidth: "80px",
    padding: "12px",
    borderRight: "1px solid var(--border-dim)",
  },
  sidePanel: {
    width: "280px",
    flexShrink: 0,
    border: "2px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "20px",
    background: "white",
    position: "sticky",
    top: "20px",
  },
  panelLabel: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: "8px",
  },
  panelItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid var(--border-dim)",
  },
  panelMenuBtn: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    background: "var(--panel-2)",
    border: "1px solid var(--border-dim)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "12px",
    width: "100%",
    boxShadow: "none",
    color: "var(--text)",
  },
};
