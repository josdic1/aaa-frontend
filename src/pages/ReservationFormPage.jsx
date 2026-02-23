// src/pages/ReservationFormPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useData } from "../hooks/useData";
import { useSchema } from "../hooks/useSchema";
import { useAuth } from "../hooks/useAuth";
import { api } from "../utils/api";

const TODAY = new Date().toISOString().split("T")[0];

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

const ALLOWED_ROOMS = [
  "Breakfast Nook",
  "Card Room",
  "Croquet Court",
  "Living Room",
  "Pool",
];

function getTimeSlots(mealType, dateStr) {
  if (!dateStr) return [];
  const day = new Date(dateStr + "T12:00:00").getDay();
  const dinnerDays = [4, 5, 6];
  if (mealType === "dinner" && !dinnerDays.includes(day)) return [];

  const ranges = {
    lunch: { start: [11, 0], end: [14, 45] },
    dinner: { start: [15, 0], end: [18, 45] },
  };

  const { start, end } = ranges[mealType];
  const slots = [];
  let [h, m] = start;
  while (h < end[0] || (h === end[0] && m <= end[1])) {
    const label = `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
    const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    slots.push({ label, value });
    m += 15;
    if (m >= 60) {
      m = 0;
      h++;
    }
  }
  return slots;
}

export function ReservationFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, diningRooms, refresh } = useData();
  const { schema } = useSchema();

  const MAX_PARTY = schema?._config?.max_party_size ?? 4;

  const [form, setForm] = useState({
    date: TODAY,
    meal_type: "lunch",
    start_time: "",
    room_id: "",
    notes: "",
  });

  const [confirmNow, setConfirmNow] = useState(true);
  const [attendees, setAttendees] = useState([]);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const timeSlots = getTimeSlots(form.meal_type, form.date);
  const dinnerUnavailable =
    form.meal_type === "dinner" && timeSlots.length === 0;

  const activeRooms = (diningRooms || []).filter(
    (r) => r.is_active && ALLOWED_ROOMS.includes(r.name),
  );

  const addedMemberIds = attendees
    .filter((a) => a.member_id)
    .map((a) => a.member_id);

  const availableMembers = (members || []).filter(
    (m) => m.user_id === user?.id && !addedMemberIds.includes(m.id),
  );

  const canAddMore = attendees.length < MAX_PARTY;

  const addMember = (member) => {
    if (!canAddMore) return;
    setAttendees((prev) => [
      ...prev,
      {
        member_id: member.id,
        guest_name: member.name,
        dietary_restrictions: [...(member.dietary_restrictions || [])],
        isBooker: false,
        _source_dietary: [...(member.dietary_restrictions || [])],
      },
    ]);
  };

  const addGuest = () => {
    if (!guestName.trim() || !canAddMore) return;
    setAttendees((prev) => [
      ...prev,
      {
        member_id: null,
        guest_name: guestName.trim(),
        dietary_restrictions: [],
        isBooker: false,
        _source_dietary: [],
      },
    ]);
    setGuestName("");
    setShowGuestInput(false);
  };

  const removeAttendee = (idx) => {
    setAttendees((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAttendeeDiet = (idx, val) => {
    setAttendees((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        const has = a.dietary_restrictions.includes(val);
        return {
          ...a,
          dietary_restrictions: has
            ? a.dietary_restrictions.filter((d) => d !== val)
            : [...a.dietary_restrictions, val],
        };
      }),
    );
  };

  const revertDietary = (idx) => {
    setAttendees((prev) =>
      prev.map((a, i) =>
        i !== idx ? a : { ...a, dietary_restrictions: [...a._source_dietary] },
      ),
    );
  };

  const isDirtyDietary = (attendee) => {
    const src = attendee._source_dietary;
    const cur = attendee.dietary_restrictions;
    if (src.length !== cur.length) return true;
    return (
      src.some((d) => !cur.includes(d)) || cur.some((d) => !src.includes(d))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (attendees.length === 0) {
      toast.error("At least one attendee required");
      return;
    }
    if (!form.start_time) {
      toast.error("Please select a time");
      return;
    }
    if (dinnerUnavailable) {
      toast.error("Dinner is only available Thu–Sat");
      return;
    }
    if (!form.room_id) {
      toast.error("Please select a room");
      return;
    }

    setLoading(true);
    try {
      const reservation = await api.post("/api/reservations", {
        date: form.date,
        start_time: form.start_time,
        notes: form.notes || null,
        status: confirmNow ? "confirmed" : "draft",
      });

      await Promise.all(
        attendees.map((a) =>
          api.post("/api/reservation-attendees", {
            reservation_id: reservation.id,
            member_id: a.member_id || null,
            guest_name: a.member_id ? null : a.guest_name,
            dietary_restrictions: a.dietary_restrictions,
          }),
        ),
      );

      await refresh();
      toast.success(
        confirmNow ? "Reservation confirmed" : "Reservation saved as draft",
      );
      navigate(`/reservations/${reservation.id}`);
    } catch (err) {
      toast.error(
        typeof err.detail === "string"
          ? err.detail
          : Array.isArray(err.detail)
            ? err.detail.map((e) => e.msg).join(", ")
            : "Failed to create reservation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: "720px" }}>
      <div style={s.header}>
        <div>
          <h1 style={{ fontSize: "28px", marginBottom: "4px" }}>
            New Reservation
          </h1>
          <p className="muted">Book a table at Abeyton Lodge.</p>
        </div>
        <button className="ghost" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* WHEN + WHERE */}
        <div className="card" style={s.section}>
          <div style={s.sectionTitle}>When &amp; Where</div>
          <div style={s.grid2}>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                min={TODAY}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    date: e.target.value,
                    start_time: "",
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label>Meal</label>
              <select
                value={form.meal_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    meal_type: e.target.value,
                    start_time: "",
                  }))
                }
              >
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>
          </div>

          {dinnerUnavailable && (
            <div style={s.warning}>
              Dinner service is only available Thursday–Saturday.
            </div>
          )}

          {!dinnerUnavailable && (
            <div className="field">
              <label>Arrival Time</label>
              <select
                value={form.start_time}
                onChange={set("start_time")}
                required
              >
                <option value="">Select a time...</option>
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <div className="muted" style={{ marginTop: "6px" }}>
                {form.meal_type === "lunch"
                  ? "Last seating 2:45 PM"
                  : "Last seating 6:45 PM"}
              </div>
            </div>
          )}

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Room Preference</label>
            <select value={form.room_id} onChange={set("room_id")} required>
              <option value="">Select a room...</option>
              {activeRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <div
              className="muted"
              style={{ marginTop: "6px", fontSize: "12px" }}
            >
              Staff will assign your table based on availability.
            </div>
          </div>
        </div>

        {/* ATTENDEES */}
        <div className="card" style={s.section}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div style={s.sectionTitle}>
              Who's Coming{" "}
              <span
                className="muted"
                style={{
                  fontSize: "13px",
                  fontFamily: "inherit",
                  fontWeight: 400,
                }}
              >
                ({attendees.length}/{MAX_PARTY})
              </span>
            </div>
          </div>

          {attendees.length === 0 && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "13px",
                border: "2px dashed var(--border-dim)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "16px",
              }}
            >
              Add at least one attendee to continue.
            </div>
          )}

          <div style={s.attendeeList}>
            {attendees.map((a, idx) => (
              <div key={idx} style={s.attendeeCard}>
                <div style={s.attendeeHeader}>
                  <div>
                    <div style={s.attendeeName}>{a.guest_name}</div>
                    <div className="muted" style={{ fontSize: "10px" }}>
                      {a.member_id ? "saved member" : "guest"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {a.member_id && isDirtyDietary(a) && (
                      <button
                        type="button"
                        onClick={() => revertDietary(idx)}
                        style={s.revertBtn}
                      >
                        ↺ Revert
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttendee(idx)}
                      style={s.removeBtn}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <div style={s.dietLabel}>
                    Dietary
                    {a.member_id && isDirtyDietary(a) && (
                      <span
                        style={{
                          marginLeft: "8px",
                          color: "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        — modified for this session
                      </span>
                    )}
                  </div>
                  <div style={s.dietGrid}>
                    {DIETARY_OPTIONS.map((opt) => {
                      const active = a.dietary_restrictions.includes(opt);
                      const wasInSource = a._source_dietary.includes(opt);
                      const isRemovedFromSource = wasInSource && !active;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleAttendeeDiet(idx, opt)}
                          style={{
                            ...s.dietBtn,
                            background: active ? "var(--accent)" : "white",
                            color: active
                              ? "white"
                              : isRemovedFromSource
                                ? "var(--muted)"
                                : "var(--text)",
                            borderColor: "var(--border-dim)",
                            opacity: isRemovedFromSource ? 0.5 : 1,
                            textDecoration: isRemovedFromSource
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {opt.replace(/_/g, " ")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add household members */}
          {canAddMore && availableMembers.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div style={s.subLabel}>Add Household Member</div>
              <div style={s.memberGrid}>
                {availableMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addMember(m)}
                    style={s.addMemberBtn}
                  >
                    <div style={{ fontWeight: 700 }}>+ {m.name}</div>
                    {m.relation && (
                      <div style={{ fontSize: "10px", opacity: 0.6 }}>
                        {m.relation}
                      </div>
                    )}
                    {m.dietary_restrictions?.length > 0 && (
                      <div
                        style={{
                          fontSize: "9px",
                          opacity: 0.6,
                          marginTop: "2px",
                        }}
                      >
                        {m.dietary_restrictions
                          .slice(0, 2)
                          .map((d) => d.replace(/_/g, " "))
                          .join(", ")}
                        {m.dietary_restrictions.length > 2
                          ? ` +${m.dietary_restrictions.length - 2}`
                          : ""}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add guest */}
          {canAddMore && (
            <div style={{ marginTop: "12px" }}>
              {!showGuestInput ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowGuestInput(true)}
                  style={{ fontSize: "12px" }}
                >
                  + Add Guest
                </button>
              ) : (
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Guest name"
                    style={{ maxWidth: "240px" }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addGuest())
                    }
                    autoFocus
                  />
                  <button type="button" className="primary" onClick={addGuest}>
                    Add
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setShowGuestInput(false);
                      setGuestName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {!canAddMore && (
            <div
              className="muted"
              style={{ marginTop: "12px", fontSize: "12px" }}
            >
              Maximum {MAX_PARTY} guests reached.
            </div>
          )}
        </div>

        {/* NOTES */}
        <div className="card" style={s.section}>
          <div style={s.sectionTitle}>Notes</div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Special requests or additional info</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any special requests, occasion, or notes for staff..."
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>

        {/* SUBMIT */}
        <div style={s.submitRow}>
          <label style={s.confirmToggle}>
            <input
              type="checkbox"
              checked={confirmNow}
              onChange={(e) => setConfirmNow(e.target.checked)}
            />
            Confirm reservation now
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="muted" style={{ fontSize: "12px" }}>
              {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
            </div>
            <button
              type="submit"
              className="primary"
              disabled={loading || dinnerUnavailable || attendees.length === 0}
            >
              {loading
                ? "Creating..."
                : confirmNow
                  ? "Confirm Reservation"
                  : "Save as Draft"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const s = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
  },
  section: { marginBottom: "20px" },
  sectionTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "20px",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  warning: {
    background: "#fef2f2",
    border: "2px solid var(--red)",
    padding: "12px 16px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#b91c1c",
    borderRadius: "var(--radius-sm)",
    marginBottom: "16px",
  },
  attendeeList: { display: "flex", flexDirection: "column", gap: "12px" },
  attendeeCard: {
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border-dim)",
    padding: "16px",
    borderRadius: "var(--radius-sm)",
    background: "var(--panel-2)",
  },
  attendeeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  attendeeName: {
    fontWeight: 900,
    fontSize: "15px",
    fontFamily: "Playfair Display, serif",
  },
  removeBtn: {
    background: "none",
    border: "none",
    boxShadow: "none",
    color: "var(--muted)",
    fontSize: "14px",
    cursor: "pointer",
    padding: "0",
    lineHeight: 1,
  },
  revertBtn: {
    background: "none",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border-dim)",
    boxShadow: "none",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
    padding: "3px 8px",
    borderRadius: "2px",
    color: "var(--muted)",
  },
  dietLabel: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: "8px",
  },
  dietGrid: { display: "flex", flexWrap: "wrap", gap: "6px" },
  dietBtn: {
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderWidth: "1.5px",
    borderStyle: "solid",
    borderRadius: "2px",
    cursor: "pointer",
    boxShadow: "none",
    transition: "all 0.1s",
  },
  subLabel: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: "8px",
  },
  memberGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  addMemberBtn: {
    padding: "10px 14px",
    fontSize: "12px",
    background: "white",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    boxShadow: "2px 2px 0 var(--border)",
    textAlign: "left",
    minWidth: "120px",
  },
  submitRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
  },
  confirmToggle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
