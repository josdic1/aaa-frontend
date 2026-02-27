import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../utils/api";
import { ReservationDetailModal } from "../components/ReservationEditPanel";
import { formatTime } from "../utils/format";
import { MONTHS, DAYS } from "../constants/calendar";

const STATUS_COLOR = {
  confirmed: {
    bg: "#e8f5e9",
    border: "#2e7d32",
    dot: "#2e7d32",
    text: "#1a4d1c",
  },
  draft: { bg: "#fff8e1", border: "#c8920a", dot: "#c8920a", text: "#7a5500" },
  cancelled: {
    bg: "#fce4ec",
    border: "#c0392b",
    dot: "#c0392b",
    text: "#7a1a1a",
  },
};

function buildCalendarDays(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells = [];

  // trailing days from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, current: false });
  }
  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  // leading days from next month
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false });
  }

  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [reservationsByDate, setReservationsByDate] = useState({});
  const [loadedMonths, setLoadedMonths] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailResId, setDetailResId] = useState(null);

  const monthKey = `${viewYear}-${viewMonth}`;

  const loadMonth = async (year, month) => {
    const key = `${year}-${month}`;
    if (loadedMonths.has(key)) return;
    setLoading(true);
    try {
      // Load all days in the month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      // Fetch the whole month by querying each day — or use a range endpoint if available.
      // We'll fetch per-day in parallel (max 31 calls, fast)
      const dates = Array.from({ length: daysInMonth }, (_, i) =>
        toDateStr(year, month, i + 1),
      );
      const results = await Promise.all(
        dates.map((d) =>
          api
            .get(`/api/admin/daily?date=${d}`)
            .catch(() => ({ reservations: [] })),
        ),
      );
      const map = {};
      dates.forEach((d, i) => {
        const resos = results[i]?.reservations || [];
        if (resos.length > 0) map[d] = resos;
      });
      setReservationsByDate((prev) => ({ ...prev, ...map }));
      setLoadedMonths((prev) => new Set([...prev, key]));
    } catch {
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonth(viewYear, viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const cells = buildCalendarDays(viewYear, viewMonth);
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const selectedResos = selectedDate
    ? reservationsByDate[selectedDate] || []
    : [];

  return (
    <div style={s.root}>
      {/* LEFT: Calendar */}
      <div style={s.calendarCol}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.monthTitle}>
            <span style={s.monthName}>{MONTHS[viewMonth]}</span>
            <span style={s.yearLabel}>{viewYear}</span>
          </div>
          <div style={s.navBtns}>
            <button style={s.navBtn} onClick={prevMonth}>
              ‹
            </button>
            <button
              style={{
                ...s.navBtn,
                fontSize: "11px",
                padding: "6px 12px",
                fontWeight: 700,
              }}
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setSelectedDate(todayStr);
              }}
            >
              Today
            </button>
            <button style={s.navBtn} onClick={nextMonth}>
              ›
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div style={s.dayHeaders}>
          {DAYS.map((d) => (
            <div key={d} style={s.dayHeaderCell}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={s.grid}>
          {cells.map((cell, idx) => {
            const dateStr = cell.current
              ? toDateStr(viewYear, viewMonth, cell.day)
              : null;
            const resos = dateStr ? reservationsByDate[dateStr] || [] : [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const confirmed = resos.filter(
              (r) => r.status === "confirmed",
            ).length;
            const draft = resos.filter((r) => r.status === "draft").length;

            return (
              <div
                key={idx}
                style={{
                  ...s.cell,
                  background: isSelected
                    ? "var(--accent)"
                    : isToday
                      ? "#f0f7f0"
                      : cell.current
                        ? "white"
                        : "#fafafa",
                  borderColor: isSelected
                    ? "var(--accent)"
                    : isToday
                      ? "#4a7c59"
                      : "#e8e8e4",
                  cursor: cell.current ? "pointer" : "default",
                  opacity: cell.current ? 1 : 0.35,
                }}
                onClick={() => cell.current && setSelectedDate(dateStr)}
              >
                <div
                  style={{
                    ...s.cellDay,
                    color: isSelected
                      ? "white"
                      : isToday
                        ? "#2e7d32"
                        : cell.current
                          ? "var(--text)"
                          : "#aaa",
                    fontWeight: isToday || isSelected ? 900 : 500,
                  }}
                >
                  {cell.day}
                </div>

                {resos.length > 0 && (
                  <div style={s.cellDots}>
                    {confirmed > 0 && (
                      <div
                        style={{
                          ...s.dot,
                          background: isSelected
                            ? "rgba(255,255,255,0.9)"
                            : "#2e7d32",
                        }}
                        title={`${confirmed} confirmed`}
                      />
                    )}
                    {draft > 0 && (
                      <div
                        style={{
                          ...s.dot,
                          background: isSelected
                            ? "rgba(255,255,255,0.6)"
                            : "#c8920a",
                        }}
                        title={`${draft} draft`}
                      />
                    )}
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: isSelected
                          ? "rgba(255,255,255,0.9)"
                          : "var(--muted)",
                        marginLeft: "2px",
                      }}
                    >
                      {resos.length}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "12px",
              fontSize: "12px",
              color: "var(--muted)",
            }}
          >
            Loading...
          </div>
        )}

        {/* Legend */}
        <div style={s.legend}>
          <div style={s.legendItem}>
            <div style={{ ...s.dot, background: "#2e7d32" }} />
            <span>Confirmed</span>
          </div>
          <div style={s.legendItem}>
            <div style={{ ...s.dot, background: "#c8920a" }} />
            <span>Draft</span>
          </div>
          <div style={s.legendItem}>
            <div style={{ ...s.dot, background: "#c0392b" }} />
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Day Detail */}
      <div style={s.detailCol}>
        {!selectedDate ? (
          <div style={s.noSelection}>
            <div style={s.noSelectionIcon}>📅</div>
            <div style={s.noSelectionText}>
              Select a day to view reservations
            </div>
          </div>
        ) : (
          <>
            <div style={s.detailHeader}>
              <div style={s.detailDate}>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginTop: "2px",
                }}
              >
                {selectedResos.length === 0
                  ? "No reservations"
                  : `${selectedResos.length} reservation${selectedResos.length !== 1 ? "s" : ""}`}
              </div>
            </div>

            {selectedResos.length === 0 ? (
              <div style={s.emptyDay}>
                <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                  Clear day.
                </div>
              </div>
            ) : (
              <div style={s.resoList}>
                {selectedResos
                  .slice()
                  .sort((a, b) => (a.start_time > b.start_time ? 1 : -1))
                  .map((r) => {
                    const colors = STATUS_COLOR[r.status] || STATUS_COLOR.draft;
                    return (
                      <div
                        key={r.reservation_id}
                        style={{
                          ...s.resoCard,
                          background: colors.bg,
                          borderColor: colors.border,
                        }}
                      >
                        <div style={s.resoCardTop}>
                          <div style={s.resoTime}>
                            {formatTime(r.start_time)}
                          </div>
                          <span
                            style={{
                              ...s.badge,
                              color: colors.text,
                              borderColor: colors.border,
                            }}
                          >
                            {r.status}
                          </span>
                        </div>

                        <div style={s.resoMeta}>
                          <span style={s.metaItem}>#{r.reservation_id}</span>
                          <span style={s.metaDot}>·</span>
                          <span style={s.metaItem}>
                            {r.party_size} guest{r.party_size !== 1 ? "s" : ""}
                          </span>
                          {r.dining_room_name && (
                            <>
                              <span style={s.metaDot}>·</span>
                              <span style={s.metaItem}>
                                {r.dining_room_name}
                              </span>
                            </>
                          )}
                        </div>

                        {r.primary_member && (
                          <div
                            style={{
                              ...s.metaItem,
                              marginTop: "4px",
                              fontWeight: 700,
                              color: colors.text,
                            }}
                          >
                            {r.primary_member}
                          </div>
                        )}

                        {r.notes && <div style={s.resoNotes}>{r.notes}</div>}

                        <button
                          style={{
                            ...s.detailBtn,
                            borderColor: colors.border,
                            color: colors.text,
                          }}
                          onClick={() => setDetailResId(r.reservation_id)}
                        >
                          Details →
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailResId && (
        <ReservationDetailModal
          reservationId={detailResId}
          onClose={() => setDetailResId(null)}
          onSaved={() => {
            // Invalidate the selected date so it reloads
            setReservationsByDate((prev) => {
              const next = { ...prev };
              delete next[selectedDate];
              return next;
            });
            setLoadedMonths((prev) => {
              const next = new Set(prev);
              next.delete(monthKey);
              return next;
            });
            loadMonth(viewYear, viewMonth);
          }}
        />
      )}
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    height: "calc(100vh - 60px)",
    overflow: "hidden",
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  calendarCol: {
    width: "520px",
    flexShrink: 0,
    borderRight: "2px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    padding: "28px 24px",
    overflowY: "auto",
    background: "white",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "20px",
  },
  monthTitle: {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
  },
  monthName: {
    fontFamily: "Playfair Display, serif",
    fontSize: "28px",
    fontWeight: 900,
    color: "var(--text)",
    lineHeight: 1,
  },
  yearLabel: {
    fontSize: "16px",
    fontWeight: 400,
    color: "var(--muted)",
    fontFamily: "Georgia, serif",
  },
  navBtns: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  navBtn: {
    padding: "6px 14px",
    fontSize: "18px",
    background: "none",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: "var(--text)",
    fontWeight: 700,
    lineHeight: 1,
    boxShadow: "none",
  },
  dayHeaders: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: "4px",
  },
  dayHeaderCell: {
    textAlign: "center",
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    padding: "6px 0",
    fontFamily: "Georgia, serif",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "3px",
    flex: 1,
  },
  cell: {
    border: "1.5px solid #e8e8e4",
    borderRadius: "4px",
    padding: "6px 5px 5px",
    minHeight: "58px",
    display: "flex",
    flexDirection: "column",
    transition: "all 0.1s",
    position: "relative",
  },
  cellDay: {
    fontSize: "13px",
    lineHeight: 1,
    marginBottom: "4px",
    fontFamily: "Playfair Display, serif",
  },
  cellDots: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    flexWrap: "wrap",
    marginTop: "auto",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  legend: {
    display: "flex",
    gap: "16px",
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid var(--border-dim)",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "10px",
    color: "var(--muted)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  detailCol: {
    flex: 1,
    overflowY: "auto",
    padding: "28px 32px",
    background: "#fafaf8",
  },
  noSelection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "12px",
  },
  noSelectionIcon: {
    fontSize: "48px",
    opacity: 0.3,
  },
  noSelectionText: {
    fontSize: "14px",
    color: "var(--muted)",
    fontFamily: "Georgia, serif",
  },
  detailHeader: {
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "2px solid var(--border)",
  },
  detailDate: {
    fontFamily: "Playfair Display, serif",
    fontSize: "22px",
    fontWeight: 900,
    color: "var(--text)",
  },
  emptyDay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "60px",
  },
  resoList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  resoCard: {
    border: "1.5px solid",
    borderRadius: "var(--radius-sm)",
    padding: "14px 16px",
    background: "white",
    boxShadow: "1px 1px 0 rgba(0,0,0,0.04)",
  },
  resoCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "6px",
  },
  resoTime: {
    fontFamily: "Playfair Display, serif",
    fontSize: "20px",
    fontWeight: 900,
    color: "var(--text)",
    lineHeight: 1,
  },
  badge: {
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "3px 8px",
    border: "1.5px solid",
    borderRadius: "2px",
  },
  resoMeta: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    flexWrap: "wrap",
    marginBottom: "2px",
  },
  metaItem: {
    fontSize: "12px",
    color: "var(--muted)",
  },
  metaDot: {
    fontSize: "12px",
    color: "var(--border)",
  },
  resoNotes: {
    fontSize: "11px",
    color: "var(--muted)",
    marginTop: "6px",
    fontStyle: "italic",
  },
  detailBtn: {
    marginTop: "12px",
    padding: "5px 12px",
    fontSize: "11px",
    fontWeight: 700,
    background: "transparent",
    border: "1.5px solid",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    boxShadow: "none",
    letterSpacing: "0.04em",
  },
};
