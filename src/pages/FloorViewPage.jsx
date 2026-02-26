import { useEffect, useMemo, useState } from "react";
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

const stepDate = (dateStr, days) => {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export function FloorViewPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "staff";

  const [rooms, setRooms] = useState([]);
  const [tables, setTables] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [bootstraps, setBootstraps] = useState({});
  const [dailyReservations, setDailyReservations] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [firing, setFiring] = useState(null);
  const [panelTab, setPanelTab] = useState("orders");

  // Seat mode (pick unseated reservation -> click available table)
  const [seatingReservation, setSeatingReservation] = useState(null);

  // Reseat mode
  const [reseating, setReseating] = useState(null);

  // Order ensuring state
  const [ensuring, setEnsuring] = useState(false);

  const loadFloor = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [roomsData, tablesData, assignmentsData, menuData, dailyData] =
        await Promise.all([
          api.get("/api/dining-rooms/"),
          api.get("/api/tables"),
          api.get("/api/admin/seat-assignments", { params: { date } }),
          api.get("/api/menu-items"),
          api.get("/api/admin/daily", { params: { date } }),
        ]);

      setRooms(roomsData);
      setTables(tablesData);
      setAssignments(assignmentsData);
      setMenuItems(menuData.filter((m) => m.is_active));
      setDailyReservations(dailyData?.reservations || []);

      const reservationIds = [
        ...new Set(assignmentsData.map((a) => a.reservation_id)),
      ];
      const results = await Promise.all(
        reservationIds.map((rid) =>
          api.get(`/api/admin/reservations/${rid}/bootstrap`).catch(() => null),
        ),
      );
      const bsMap = {};
      reservationIds.forEach((rid, i) => {
        if (results[i]) bsMap[rid] = results[i];
      });
      setBootstraps(bsMap);
    } catch {
      setLoadError(true);
      toast.error("Failed to load floor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ---- NEW: Ensure order exists for an attendee ----
  const ensureOrderForAttendee = async (attendeeId) => {
    if (!attendeeId) return null;
    setEnsuring(true);
    try {
      const order = await api.post("/api/orders/ensure", {
        attendee_id: attendeeId,
      });
      await loadFloor();
      return order;
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed to ensure order",
      );
      return null;
    } finally {
      setEnsuring(false);
    }
  };

  const fireOrder = async (orderId) => {
    setFiring(orderId);
    try {
      await api.post(`/api/orders/${orderId}/fire`);
      await loadFloor();
      toast.success("Order fired");
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed",
      );
    } finally {
      setFiring(null);
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/api/order-items/${itemId}`);
      await loadFloor();
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed",
      );
    }
  };

  // ---- NEW: Update item (quantity/status) ----
  const patchItem = async (itemId, patch) => {
    try {
      await api.patch(`/api/order-items/${itemId}`, patch);
      await loadFloor();
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed",
      );
    }
  };

  // ---- UPDATED: Add item will ensure an order exists first ----
  const addItem = async (menuItemId) => {
    if (!selectedAttendee) return;

    let orderId = selectedOrder?.id;

    if (!orderId) {
      const ensured = await ensureOrderForAttendee(selectedAttendee.id);
      if (!ensured?.id) return;
      orderId = ensured.id;
    }

    try {
      await api.post(`/api/order-items/by-order/${orderId}`, {
        menu_item_id: menuItemId,
        quantity: 1,
        status: "selected",
      });
      await loadFloor();
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed",
      );
    }
  };

  const tablesByRoom = rooms.reduce((acc, room) => {
    acc[room.id] = {
      room,
      tables: tables.filter((t) => t.dining_room_id === room.id && t.is_active),
    };
    return acc;
  }, {});

  const assignedReservationIds = new Set(
    assignments.map((a) => a.reservation_id),
  );
  const unseatedReservations = (dailyReservations || []).filter(
    (r) => !r?.table?.table_id && !assignedReservationIds.has(r.reservation_id),
  );

  const isTableAvailable = (tableId) =>
    !assignments.some((a) => a.table_id === tableId);

  const seatReservationToTable = async (reservationId, table) => {
    const partySize = seatingReservation?.party_size ?? null;

    if (partySize && table?.seat_count && partySize > table.seat_count) {
      toast.error(
        `Party size (${partySize}) exceeds ${table.name} (${table.seat_count} seats)`,
      );
      return;
    }

    try {
      await api.post("/api/seat-assignments", {
        reservation_id: reservationId,
        table_id: table.id,
        notes: "Seated from Floor View",
      });

      toast.success(`Seated #${reservationId} at ${table.name}`);
      setSeatingReservation(null);
      setSelectedTable(null);
      setSelectedAttendeeId(null);
      await loadFloor();
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed to seat reservation",
      );
    }
  };

  const reseatReservationToTable = async (targetTable) => {
    if (!reseating) return;

    const { reservation_id, party_size, assignment_id } = reseating;

    if (
      party_size &&
      targetTable?.seat_count &&
      party_size > targetTable.seat_count
    ) {
      toast.error(
        `Party size (${party_size}) exceeds ${targetTable.name} (${targetTable.seat_count} seats)`,
      );
      return;
    }

    if (!isTableAvailable(targetTable.id)) {
      toast.error("That table is not available");
      return;
    }

    try {
      if (assignment_id != null) {
        await api.patch(`/api/seat-assignments/${assignment_id}`, {
          table_id: targetTable.id,
          notes: "Moved from Floor View",
        });
      } else {
        throw new Error("Missing assignment_id");
      }

      toast.success(`Moved #${reservation_id} to ${targetTable.name}`);
      setReseating(null);
      setSelectedTable(null);
      setSelectedAttendeeId(null);
      await loadFloor();
      return;
    } catch {
      try {
        if (assignment_id != null) {
          await api.delete(`/api/seat-assignments/${assignment_id}`);
        }
        await api.post("/api/seat-assignments", {
          reservation_id,
          table_id: targetTable.id,
          notes: "Moved from Floor View (recreate)",
        });

        toast.success(`Moved #${reservation_id} to ${targetTable.name}`);
        setReseating(null);
        setSelectedTable(null);
        setSelectedAttendeeId(null);
        await loadFloor();
        return;
      } catch (err2) {
        toast.error(
          Array.isArray(err2?.detail)
            ? err2.detail.map((e) => e.msg).join(", ")
            : err2?.detail || "Failed to move reservation (reseat)",
        );
      }
    }
  };

  const modeBanner = useMemo(() => {
    if (seatingReservation) {
      return {
        kind: "seat",
        title: `Seating mode: #${seatingReservation.reservation_id} · ${seatingReservation.start_time?.slice(
          0,
          5,
        )} · party ${seatingReservation.party_size}`,
        sub: "Click an Available table to seat.",
        onCancel: () => setSeatingReservation(null),
      };
    }
    if (reseating) {
      return {
        kind: "move",
        title: `Move mode: #${reseating.reservation_id} · party ${reseating.party_size}`,
        sub: "Click an Available table to move this reservation.",
        onCancel: () => setReseating(null),
      };
    }
    return null;
  }, [seatingReservation, reseating]);

  const isInAnyMode = Boolean(seatingReservation || reseating);

  if (loading)
    return (
      <div className="page">
        <p className="muted">Loading floor...</p>
      </div>
    );

  if (loadError)
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: "80px" }}>
        <p style={{ fontWeight: 700, marginBottom: "8px" }}>
          Failed to load floor view.
        </p>
        <p className="muted" style={{ marginBottom: "20px" }}>
          Check your connection and try again.
        </p>
        <button className="primary" onClick={loadFloor}>
          Retry
        </button>
      </div>
    );

  return (
    <div style={s.root}>
      <div style={s.floor}>
        <div style={s.floorHeader}>
          <h1 style={s.floorTitle}>
            Floor
            <br />
            View
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              className="ghost"
              style={{ fontSize: "18px", padding: "4px 10px", lineHeight: 1 }}
              onClick={() => {
                setDate(stepDate(date, -1));
                setSelectedTable(null);
                setSelectedAttendeeId(null);
                setSeatingReservation(null);
                setReseating(null);
              }}
            >
              ‹
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedTable(null);
                setSelectedAttendeeId(null);
                setSeatingReservation(null);
                setReseating(null);
              }}
              style={s.datePicker}
            />
            <button
              className="ghost"
              style={{ fontSize: "18px", padding: "4px 10px", lineHeight: 1 }}
              onClick={() => {
                setDate(stepDate(date, 1));
                setSelectedTable(null);
                setSelectedAttendeeId(null);
                setSeatingReservation(null);
                setReseating(null);
              }}
            >
              ›
            </button>
            <button
              className="ghost"
              style={{ fontSize: "11px", fontWeight: 700 }}
              onClick={() => {
                setDate(new Date().toISOString().split("T")[0]);
                setSelectedTable(null);
                setSelectedAttendeeId(null);
                setSeatingReservation(null);
                setReseating(null);
              }}
            >
              Today
            </button>
          </div>
        </div>

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
                  border: `2px solid ${border}`,
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

        {modeBanner && (
          <div
            style={{
              marginBottom: "14px",
              border: "1px solid var(--border-dim)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#333" }}>
              {modeBanner.title}
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginTop: 2,
                }}
              >
                {modeBanner.sub}
              </div>
            </div>
            <button
              type="button"
              className="ghost"
              style={{
                fontSize: "11px",
                fontWeight: 800,
                padding: "6px 10px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={modeBanner.onCancel}
            >
              Cancel
            </button>
          </div>
        )}

        {unseatedReservations.length > 0 && (
          <div style={{ marginBottom: "22px" }}>
            <div style={{ ...s.roomLabel, marginBottom: "10px" }}>
              <span
                style={{
                  borderLeft: "3px solid #888",
                  paddingLeft: "10px",
                  color: "#444",
                }}
              >
                Unseated
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginLeft: "8px",
                }}
              >
                {unseatedReservations.length} reservation
                {unseatedReservations.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              {unseatedReservations.map((r) => {
                const isPicked =
                  seatingReservation?.reservation_id === r.reservation_id;

                return (
                  <div
                    key={r.reservation_id}
                    style={{
                      border: isPicked
                        ? "2px solid var(--accent)"
                        : "1px solid var(--border-dim)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                      background: "white",
                      opacity: reseating ? 0.6 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "var(--text)",
                        }}
                      >
                        #{r.reservation_id} · {r.start_time?.slice(0, 5)} ·
                        party {r.party_size}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            fontWeight: 800,
                          }}
                        >
                          {r.status}
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            disabled={Boolean(reseating)}
                            onClick={() =>
                              setSeatingReservation(isPicked ? null : r)
                            }
                            style={{
                              padding: "6px 10px",
                              fontSize: "11px",
                              fontWeight: 900,
                              borderRadius: "8px",
                              border: `1px solid ${isPicked ? "var(--accent)" : "var(--border)"}`,
                              background: isPicked ? "var(--accent)" : "white",
                              color: isPicked ? "white" : "#333",
                              cursor: reseating ? "not-allowed" : "pointer",
                              opacity: reseating ? 0.6 : 1,
                            }}
                          >
                            {isPicked ? "Picked" : "Seat"}
                          </button>
                        )}
                      </div>
                    </div>

                    {r.notes ? (
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "11px",
                          color: "var(--muted)",
                        }}
                      >
                        {r.notes}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {Object.values(tablesByRoom).map(({ room, tables: rt }) => {
          if (rt.length === 0) return null;
          const cfg = ROOM_CONFIG[room.name] || { cols: 3, accent: "#444" };

          return (
            <div key={room.id} style={s.roomBlock}>
              <div style={s.roomLabel}>
                <span
                  style={{
                    borderLeft: `3px solid ${cfg.accent}`,
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
                  const assignment = getAssignment(table.id);
                  const failed = assignment && !bs && !loading;
                  const isSelected = selectedTable?.id === table.id;

                  const available = isTableAvailable(table.id);

                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        if (seatingReservation) {
                          if (!available) {
                            toast.error("That table is not available");
                            return;
                          }
                          seatReservationToTable(
                            seatingReservation.reservation_id,
                            table,
                          );
                          return;
                        }

                        if (reseating) {
                          if (!available) {
                            toast.error("That table is not available");
                            return;
                          }
                          reseatReservationToTable(table);
                          return;
                        }

                        setSelectedTable(isSelected ? null : table);
                        setSelectedAttendeeId(null);
                        setPanelTab("orders");
                      }}
                      style={{
                        ...s.tableBtn,
                        background: failed ? "#fff0f0" : bg,
                        borderColor: isSelected
                          ? "var(--accent)"
                          : failed
                            ? "#c0392b"
                            : border,
                        boxShadow: isInAnyMode
                          ? available
                            ? "0 0 0 3px rgba(46, 125, 50, 0.25)"
                            : "2px 2px 0 rgba(0,0,0,0.06)"
                          : isSelected
                            ? "0 0 0 3px var(--accent)"
                            : "2px 2px 0 rgba(0,0,0,0.06)",
                        opacity: isInAnyMode && !available ? 0.55 : 1,
                        cursor:
                          isInAnyMode && !available ? "not-allowed" : "pointer",
                      }}
                      title={
                        isInAnyMode
                          ? available
                            ? "Click to place reservation here"
                            : "Not available"
                          : undefined
                      }
                    >
                      <div
                        style={{
                          ...s.tableName,
                          color: failed ? "#c0392b" : text,
                        }}
                      >
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

                      {failed ? (
                        <div
                          style={{
                            fontSize: "16px",
                            marginTop: "8px",
                            color: "#c0392b",
                          }}
                        >
                          ?
                        </div>
                      ) : bs ? (
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

          {isAdmin && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {(() => {
                const a = getAssignment(selectedTable.id);
                const bs = selectedBs;
                if (!a || !bs) return null;

                const isThisReseating =
                  reseating?.reservation_id === a.reservation_id;

                return (
                  <button
                    type="button"
                    onClick={() => {
                      setSeatingReservation(null);

                      if (isThisReseating) {
                        setReseating(null);
                        return;
                      }

                      setReseating({
                        reservation_id: a.reservation_id,
                        party_size: bs.party_size,
                        from_table_id: selectedTable.id,
                        assignment_id: a.id ?? a.assignment_id ?? null,
                        start_time: bs.reservation?.start_time ?? null,
                      });

                      toast.message(
                        "Move mode: click an available table to move.",
                      );
                    }}
                    style={{
                      ...s.ghostBtn,
                      borderColor: isThisReseating
                        ? "var(--accent)"
                        : "var(--border)",
                      color: isThisReseating ? "var(--accent)" : "var(--text)",
                      fontWeight: 900,
                    }}
                  >
                    {isThisReseating ? "Cancel Move" : "Move Table"}
                  </button>
                );
              })()}
            </div>
          )}

          {!selectedBs ? (
            <div
              style={{
                color: "var(--muted)",
                fontSize: "13px",
                padding: "16px 0",
              }}
            >
              {getAssignment(selectedTable.id)
                ? "Failed to load reservation data. Try refreshing."
                : "No reservation assigned to this table today."}
            </div>
          ) : (
            <>
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
                          onClick={async () => {
                            const next = isThisSelected ? null : att.id;
                            setSelectedAttendeeId(next);
                            if (!next) return;

                            // NEW: if staff/admin selects seat with no order, auto-ensure it
                            const existing = selectedBs.orders?.some(
                              (o) => o.attendee_id === att.id,
                            );
                            if (!existing && isAdmin) {
                              await ensureOrderForAttendee(att.id);
                            }
                          }}
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
                          {!selectedOrder && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--muted)",
                                marginTop: "4px",
                              }}
                            >
                              {ensuring ? "Creating order..." : "No order yet"}
                            </div>
                          )}
                        </div>
                        {!selectedOrder && isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              ensureOrderForAttendee(selectedAttendee.id)
                            }
                            disabled={ensuring}
                            style={s.tinyBtn}
                          >
                            {ensuring ? "..." : "Create Order"}
                          </button>
                        )}
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
                                  gap: "8px",
                                }}
                              >
                                {!isLocked && (
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "6px",
                                      alignItems: "center",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      style={s.qtyBtn}
                                      onClick={() =>
                                        patchItem(item.id, {
                                          quantity: Math.max(
                                            1,
                                            (item.quantity || 1) - 1,
                                          ),
                                        })
                                      }
                                    >
                                      −
                                    </button>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 900,
                                        width: 18,
                                        textAlign: "center",
                                      }}
                                    >
                                      {item.quantity}
                                    </div>
                                    <button
                                      type="button"
                                      style={s.qtyBtn}
                                      onClick={() =>
                                        patchItem(item.id, {
                                          quantity: (item.quantity || 1) + 1,
                                        })
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                )}

                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 900,
                                    color: "var(--text)",
                                  }}
                                >
                                  {formatPrice(
                                    (item.price_cents_snapshot || 0) *
                                      (item.quantity || 0),
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

                      {!isLocked && isAdmin && (
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
                                onClick={() => addItem(m.id)}
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
      const normalized = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );

      const original = {
        date: res.date ?? null,
        start_time: res.start_time ?? null,
        status: res.status ?? null,
        notes: res.notes ?? null,
      };

      const payload = {};
      for (const [k, v] of Object.entries(normalized)) {
        if (k === "date") continue;
        if (v !== original[k]) payload[k] = v;
      }

      await api.patch(`/api/admin/reservations/${res.id}`, payload);

      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed to save",
      );
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
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed",
      );
    }
  };

  const removeAttendee = async (id) => {
    try {
      await api.delete(`/api/admin/attendees/${id}`);
      toast.success("Removed");
      onSaved();
    } catch (err) {
      toast.error(
        Array.isArray(err?.detail)
          ? err.detail.map((e) => e.msg).join(", ")
          : err?.detail || "Failed",
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              border: "1px solid var(--border-dim)",
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
                border: `1px solid ${on ? "var(--accent)" : "var(--border-dim)"}`,
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
    border: "2px solid var(--border)",
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
    border: "2px solid transparent",
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
    borderLeft: "2px solid var(--border)",
    overflowY: "auto",
    padding: "24px",
    background: "white",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
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
    border: "1px solid var(--border-dim)",
  },
  statusBadge: {
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "2px 8px",
    border: "1.5px solid currentColor",
    borderRadius: "2px",
    display: "inline-block",
  },
  panelTabs: {
    display: "flex",
    borderBottom: "2px solid var(--border)",
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
    borderBottom: "2px solid transparent",
    boxShadow: "none",
    cursor: "pointer",
    color: "var(--muted)",
    marginBottom: "-2px",
  },
  panelTabActive: {
    color: "var(--text)",
    borderBottom: "2px solid var(--accent)",
  },
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
    border: "2px solid transparent",
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
    border: "1px solid var(--border-dim)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
  },
  dietTag: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "2px 5px",
    border: "1px solid var(--border-dim)",
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
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "1px solid var(--border-dim)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
    lineHeight: 1,
    boxShadow: "none",
  },
  addItemBtn: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 10px",
    background: "white",
    border: "1px solid var(--border-dim)",
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
    border: "1.5px solid var(--border)",
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
    border: "1.5px solid var(--border)",
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
    border: "1px solid var(--border)",
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
    border: "1px solid #c0392b",
    borderRadius: "2px",
    cursor: "pointer",
    color: "#c0392b",
    boxShadow: "none",
  },
};
