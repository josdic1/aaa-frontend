// src/components/ReservationThermometer.jsx

const STAGES = [
  { key: "created", label: "Created" },
  { key: "attendees", label: "Attendees" },
  { key: "orders", label: "Orders" },
  { key: "seated", label: "Seated" },
  { key: "fired", label: "Fired" },
  { key: "fulfilled", label: "Fulfilled" },
];

// Returns how far along each stage is: "done" | "partial" | "pending" | "blocked"
function computeStages(reservation, adminData, detailData, seatAssignment) {
  const status = reservation?.status;
  const isCancelled = status === "cancelled";

  // ── CREATED ──────────────────────────────────────────────
  const created = isCancelled
    ? "blocked"
    : reservation?.id || status === "confirmed"
      ? "done"
      : "pending";

  // ── ATTENDEES ─────────────────────────────────────────────
  let attendees = "pending";
  if (isCancelled) {
    attendees = "blocked";
  } else if (detailData?.attendees?.length > 0) {
    attendees = "done";
  } else if (adminData?.party_size > 0) {
    attendees = "done";
  } else if (status === "confirmed") {
    attendees = "done";
  }

  // ── ORDERS ────────────────────────────────────────────────
  let orders = "pending";
  if (isCancelled) {
    orders = "blocked";
  } else if (detailData?.orders?.length > 0) {
    // Best/precise logic when detail payload includes orders + items
    const allOrders = detailData.orders;
    const allItems = detailData.order_items || [];

    const anyHasItems = allOrders.some(
      (o) => allItems.filter((i) => i.order_id === o.id).length > 0,
    );
    const allHaveItems = allOrders.every(
      (o) => allItems.filter((i) => i.order_id === o.id).length > 0,
    );

    if (allHaveItems) orders = "done";
    else if (anyHasItems) orders = "partial";
    else orders = "partial"; // orders exist but items not linked/loaded
  } else if (attendees === "done") {
    orders = "pending";
  }

  // ── SEATED ────────────────────────────────────────────────
  let seated = "pending";
  if (isCancelled) {
    seated = "blocked";
  } else {
    const hasExplicitSeat =
      Boolean(seatAssignment) ||
      (seatAssignment?.table_id ?? 0) > 0 ||
      (seatAssignment?.table?.id ?? 0) > 0;

    const hasAdminSeat =
      Boolean(adminData?.table) ||
      (adminData?.table_id ?? 0) > 0 ||
      Boolean(adminData?.seat_assignment) ||
      (adminData?.seat_assignment_id ?? 0) > 0;

    const hasDetailSeat =
      Boolean(detailData?.seat_assignment) ||
      Boolean(detailData?.reservation?.seat_assignment) ||
      (Array.isArray(detailData?.seat_assignments) &&
        detailData.seat_assignments.length > 0) ||
      (detailData?.reservation?.table_id ?? 0) > 0;

    if (hasExplicitSeat || hasAdminSeat || hasDetailSeat) seated = "done";
  }

  // ── FIRED ─────────────────────────────────────────────────
  let fired = "pending";
  if (isCancelled) {
    fired = "blocked";
  } else if (detailData?.orders?.length > 0) {
    const allOrders = detailData.orders;
    const allFiredOrFulfilled = allOrders.every(
      (o) => o.status === "fired" || o.status === "fulfilled",
    );
    const anyFiredOrFulfilled = allOrders.some(
      (o) => o.status === "fired" || o.status === "fulfilled",
    );
    if (allFiredOrFulfilled) fired = "done";
    else if (anyFiredOrFulfilled) fired = "partial";
  }

  // ── FULFILLED ─────────────────────────────────────────────
  let fulfilled = "pending";
  if (isCancelled) {
    fulfilled = "blocked";
  } else if (detailData?.orders?.length > 0) {
    const allFulfilled = detailData.orders.every(
      (o) => o.status === "fulfilled",
    );
    const anyFulfilled = detailData.orders.some(
      (o) => o.status === "fulfilled",
    );
    if (allFulfilled) fulfilled = "done";
    else if (anyFulfilled) fulfilled = "partial";
  }

  return { created, attendees, orders, seated, fired, fulfilled };
}

const STATE_COLORS = {
  done: { bg: "var(--accent)", tick: "#fff", label: "var(--text)" },
  partial: { bg: "#f5c97a", tick: "#a06020", label: "var(--text)" },
  pending: {
    bg: "var(--border)",
    tick: "var(--border-dim)",
    label: "var(--muted)",
  },
  blocked: { bg: "#f0e0e0", tick: "#c0392b", label: "#c0392b" },
};

export function ReservationThermometer({
  reservation,
  adminData = null,
  detailData = null,
  seatAssignment = null,
  size = "default",
}) {
  const stageState = computeStages(
    reservation,
    adminData,
    detailData,
    seatAssignment,
  );
  const isCancelled = reservation?.status === "cancelled";
  const isCompact = size === "compact";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        width: "100%",
        opacity: isCancelled ? 0.5 : 1,
        position: "relative",
      }}
    >
      {STAGES.map((stage, idx) => {
        const state = stageState[stage.key];
        const colors = STATE_COLORS[state];
        const isLast = idx === STAGES.length - 1;
        const isFirst = idx === 0;

        return (
          <div
            key={stage.key}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {!isFirst && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: isCompact ? 7 : 9,
                  width: "50%",
                  height: "2px",
                  background:
                    stageState[STAGES[idx - 1].key] === "done"
                      ? "var(--accent)"
                      : "var(--border)",
                  zIndex: 0,
                }}
              />
            )}

            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: isCompact ? 7 : 9,
                  width: "50%",
                  height: "2px",
                  background:
                    stageState[stage.key] === "done"
                      ? "var(--accent)"
                      : "var(--border)",
                  zIndex: 0,
                }}
              />
            )}

            <div
              style={{
                width: isCompact ? 14 : 18,
                height: isCompact ? 14 : 18,
                borderRadius: "50%",
                background: colors.bg,
                border: `2px solid ${state === "pending" ? "var(--border)" : colors.bg}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              {state === "done" && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M1.5 4L3 5.5L6.5 2"
                    stroke={colors.tick}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {state === "partial" && (
                <div
                  style={{
                    width: isCompact ? 4 : 5,
                    height: isCompact ? 4 : 5,
                    borderRadius: "50%",
                    background: colors.tick,
                  }}
                />
              )}
              {state === "blocked" && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M2 2L6 6M6 2L2 6"
                    stroke="#c0392b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            {!isCompact && (
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: colors.label,
                  marginTop: "5px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {stage.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
