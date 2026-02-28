// src/pages/mobile/MobileHub.jsx
// Self-contained mobile experience. No routing to desktop pages.
// 4 screens: Book, My Reservations, Members, Messages
// Big buttons. Nothing moves. Real API calls.

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../../utils/api";
import { useData } from "../../hooks/useData";
import { useAuth } from "../../hooks/useAuth";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const TODAY = new Date().toISOString().split("T")[0];

const NAV = [
  { key: "book", label: "Book", icon: "✦" },
  { key: "manage", label: "My Trips", icon: "▦" },
  { key: "members", label: "Members", icon: "◉" },
  { key: "messages", label: "Messages", icon: "◈" },
];

// ─── Time slots (mirrors ReservationFormPage logic) ───────────────────────────

function getTimeSlots(mealType, dateStr) {
  if (!dateStr) return [];
  const day = new Date(dateStr + "T12:00:00").getDay();
  if (mealType === "dinner" && ![4, 5, 6].includes(day)) return [];
  const ranges = {
    lunch: { start: [11, 0], end: [14, 45] },
    dinner: { start: [15, 0], end: [18, 45] },
  };
  const { start, end } = ranges[mealType];
  const slots = [];
  let [h, m] = start;
  while (h < end[0] || (h === end[0] && m <= end[1])) {
    const label = `${h % 12 === 0 ? 12 : h % 12}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
    slots.push({
      label,
      value: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
    });
    m += 15;
    if (m >= 60) {
      m = 0;
      h++;
    }
  }
  return slots;
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
}

// ─── Root component ────────────────────────────────────────────────────────────

export function MobileHub() {
  const [screen, setScreen] = useState("book");
  const [pillOpen, setPillOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const activeNav = NAV.find((n) => n.key === screen);

  const go = (key) => {
    setDetailId(null);
    setScreen(key);
    setPillOpen(false);
  };

  const openDetail = (id) => {
    setDetailId(id);
    setScreen("detail");
    setPillOpen(false);
  };

  return (
    <div style={r.root}>
      {/* ── Main content area ─────────────────── */}
      <div style={r.body}>
        {screen === "book" && <BookScreen />}
        {screen === "manage" && <ManageScreen onDetail={openDetail} />}
        {screen === "members" && <MembersScreen />}
        {screen === "messages" && <MessagesScreen />}
        {screen === "detail" && (
          <DetailScreen id={detailId} onBack={() => go("manage")} />
        )}
      </div>

      {/* ── Pill nav ──────────────────────────── */}
      {pillOpen && (
        <div style={r.backdrop} onClick={() => setPillOpen(false)} />
      )}

      <div style={r.pillWrap}>
        {/* Expanded world switcher */}
        {pillOpen && (
          <div style={r.switcher}>
            {NAV.map((n) => (
              <button
                key={n.key}
                style={{
                  ...r.switchBtn,
                  ...(screen === n.key ? r.switchBtnActive : {}),
                }}
                onClick={() => go(n.key)}
              >
                <span style={r.switchIcon}>{n.icon}</span>
                <span style={r.switchLabel}>{n.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* The pill itself */}
        <button style={r.pill} onClick={() => setPillOpen((o) => !o)}>
          <span style={r.pillIcon}>{activeNav?.icon || "✦"}</span>
          <span style={r.pillLabel}>{activeNav?.label || "Menu"}</span>
          <span style={r.pillCaret}>{pillOpen ? "▲" : "▼"}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Screen: Book a reservation ───────────────────────────────────────────────

function BookScreen() {
  const { user } = useAuth();
  const { members, diningRooms, refresh, schema } = useData();
  const MAX_PARTY = schema?._config?.max_party_size ?? 4;

  const [step, setStep] = useState(1); // 1 = when/where, 2 = who, 3 = confirm
  const [form, setForm] = useState({
    date: TODAY,
    meal_type: "lunch",
    start_time: "",
    room_id: "",
    notes: "",
  });
  const [attendees, setAttendees] = useState([]);
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const timeSlots = getTimeSlots(form.meal_type, form.date);
  const dinnerUnavailable =
    form.meal_type === "dinner" && timeSlots.length === 0;
  const activeRooms = (diningRooms || []).filter(
    (r) => r.is_active && ALLOWED_ROOMS.includes(r.name),
  );
  const addedIds = attendees.filter((a) => a.member_id).map((a) => a.member_id);
  const myMembers = (members || []).filter(
    (m) => m.user_id === user?.id && !addedIds.includes(m.id),
  );

  const addMember = (m) => {
    if (attendees.length >= MAX_PARTY) return;
    setAttendees((prev) => [
      ...prev,
      {
        member_id: m.id,
        guest_name: m.name,
        dietary_restrictions: [...(m.dietary_restrictions || [])],
      },
    ]);
  };

  const addGuest = () => {
    if (!guestName.trim() || attendees.length >= MAX_PARTY) return;
    setAttendees((prev) => [
      ...prev,
      {
        member_id: null,
        guest_name: guestName.trim(),
        dietary_restrictions: [],
      },
    ]);
    setGuestName("");
  };

  const removeAttendee = (i) =>
    setAttendees((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (attendees.length === 0) {
      toast.error("Add at least one person");
      return;
    }
    if (!form.start_time) {
      toast.error("Select a time");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/reservations", {
        date: form.date,
        start_time: form.start_time,
        notes: form.notes || null,
        status: "confirmed",
        dining_room_id: form.room_id ? parseInt(form.room_id) : null,
      });
      await Promise.all(
        attendees.map((a) =>
          api.post("/api/reservation-attendees", {
            reservation_id: res.id,
            member_id: a.member_id || null,
            guest_name: a.member_id ? null : a.guest_name,
            dietary_restrictions: a.dietary_restrictions,
          }),
        ),
      );
      await refresh();
      toast.success("Reservation confirmed!");
      setStep(1);
      setForm({
        date: TODAY,
        meal_type: "lunch",
        start_time: "",
        room_id: "",
        notes: "",
      });
      setAttendees([]);
    } catch (err) {
      toast.error(err?.detail || "Failed to create reservation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={sc.root}>
      <div style={sc.head}>
        <div style={sc.eyebrow}>Book a Table</div>
        <div style={sc.title}>New Reservation</div>
        <div style={sc.steps}>
          {["When & Where", "Who's Coming", "Confirm"].map((s, i) => (
            <button
              key={i}
              style={{
                ...sc.stepBtn,
                ...(step === i + 1 ? sc.stepBtnActive : {}),
              }}
              onClick={() => setStep(i + 1)}
            >
              <span style={sc.stepNum}>{i + 1}</span>
              <span style={sc.stepTxt}>{s}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={sc.body}>
        {/* ── Step 1: When & Where ── */}
        {step === 1 && (
          <div style={sc.stepPane}>
            <Field label="Date">
              <input
                style={inp.base}
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
              />
            </Field>

            <Field label="Meal">
              <div style={inp.row}>
                {["lunch", "dinner"].map((m) => (
                  <button
                    key={m}
                    style={{
                      ...inp.toggle,
                      ...(form.meal_type === m ? inp.toggleOn : {}),
                    }}
                    onClick={() =>
                      setForm((f) => ({ ...f, meal_type: m, start_time: "" }))
                    }
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            {dinnerUnavailable && (
              <div style={sc.warn}>Dinner is only available Thu – Sat.</div>
            )}

            {!dinnerUnavailable && (
              <Field label="Time">
                <select
                  style={inp.base}
                  value={form.start_time}
                  onChange={set("start_time")}
                >
                  <option value="">Select a time...</option>
                  {timeSlots.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Room (optional)">
              <select
                style={inp.base}
                value={form.room_id}
                onChange={set("room_id")}
              >
                <option value="">Any available room</option>
                {activeRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes (optional)">
              <input
                style={inp.base}
                placeholder="Any special requests..."
                value={form.notes}
                onChange={set("notes")}
              />
            </Field>

            <BigBtn
              onClick={() => setStep(2)}
              disabled={!form.start_time || dinnerUnavailable}
            >
              Next: Who's Coming →
            </BigBtn>
          </div>
        )}

        {/* ── Step 2: Who's Coming ── */}
        {step === 2 && (
          <div style={sc.stepPane}>
            <div style={sc.sectionLabel}>
              Party ({attendees.length}/{MAX_PARTY})
            </div>

            {attendees.length > 0 && (
              <div style={sc.attendeeList}>
                {attendees.map((a, i) => (
                  <div key={i} style={sc.attendeeRow}>
                    <span style={sc.attendeeName}>{a.guest_name}</span>
                    {a.member_id ? (
                      <span style={sc.memberTag}>Member</span>
                    ) : (
                      <span style={sc.guestTag}>Guest</span>
                    )}
                    <button
                      style={sc.removeBtn}
                      onClick={() => removeAttendee(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attendees.length < MAX_PARTY && myMembers.length > 0 && (
              <>
                <div style={sc.sectionLabel} className="mt">
                  Add from your household
                </div>
                {myMembers.map((m) => (
                  <button
                    key={m.id}
                    style={sc.addRow}
                    onClick={() => addMember(m)}
                  >
                    <span>{m.name}</span>
                    <span style={sc.addPlus}>+</span>
                  </button>
                ))}
              </>
            )}

            {attendees.length < MAX_PARTY && (
              <>
                <div style={sc.sectionLabel}>Add a guest</div>
                <div style={inp.row}>
                  <input
                    style={{ ...inp.base, flex: 1 }}
                    placeholder="Guest name..."
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addGuest()}
                  />
                  <button style={sc.addGuestBtn} onClick={addGuest}>
                    Add
                  </button>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <BigBtn ghost onClick={() => setStep(1)}>
                ← Back
              </BigBtn>
              <BigBtn
                onClick={() => setStep(3)}
                disabled={attendees.length === 0}
              >
                Review →
              </BigBtn>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div style={sc.stepPane}>
            <div style={sc.confirmCard}>
              <div style={sc.confirmRow}>
                <span style={sc.confirmLabel}>Date</span>
                <span style={sc.confirmVal}>{fmtDate(form.date)}</span>
              </div>
              <div style={sc.confirmRow}>
                <span style={sc.confirmLabel}>Time</span>
                <span style={sc.confirmVal}>{fmtTime(form.start_time)}</span>
              </div>
              <div style={sc.confirmRow}>
                <span style={sc.confirmLabel}>Meal</span>
                <span style={sc.confirmVal}>
                  {form.meal_type.charAt(0).toUpperCase() +
                    form.meal_type.slice(1)}
                </span>
              </div>
              {form.room_id && (
                <div style={sc.confirmRow}>
                  <span style={sc.confirmLabel}>Room</span>
                  <span style={sc.confirmVal}>
                    {activeRooms.find((r) => r.id === parseInt(form.room_id))
                      ?.name || "—"}
                  </span>
                </div>
              )}
              <div style={sc.confirmRow}>
                <span style={sc.confirmLabel}>Party</span>
                <span style={sc.confirmVal}>
                  {attendees.map((a) => a.guest_name).join(", ")}
                </span>
              </div>
              {form.notes && (
                <div style={sc.confirmRow}>
                  <span style={sc.confirmLabel}>Notes</span>
                  <span style={sc.confirmVal}>{form.notes}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <BigBtn ghost onClick={() => setStep(2)}>
                ← Back
              </BigBtn>
              <BigBtn onClick={submit} disabled={loading}>
                {loading ? "Booking..." : "Confirm Reservation ✓"}
              </BigBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen: My Reservations ──────────────────────────────────────────────────

function ManageScreen({ onDetail }) {
  const { reservations, loading } = useData();
  const [tab, setTab] = useState("upcoming");

  const TODAY = new Date().toISOString().split("T")[0];

  const filtered = (reservations || [])
    .filter((r) => (tab === "upcoming" ? r.date >= TODAY : r.date < TODAY))
    .sort((a, b) =>
      tab === "upcoming"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
    );

  const STATUS_DOT = {
    confirmed: "#2e7d32",
    draft: "#888",
    cancelled: "#c0392b",
  };

  return (
    <div style={sc.root}>
      <div style={sc.head}>
        <div style={sc.eyebrow}>Your Bookings</div>
        <div style={sc.title}>My Reservations</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {["upcoming", "past"].map((t) => (
            <button
              key={t}
              style={{
                ...inp.toggle,
                ...(tab === t ? inp.toggleOn : {}),
                flex: 1,
              }}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={sc.body}>
        {loading && <div style={sc.empty}>Loading...</div>}

        {!loading && filtered.length === 0 && (
          <div style={sc.emptyCard}>
            <div style={sc.emptyIcon}>📅</div>
            <div style={sc.emptyText}>No {tab} reservations.</div>
          </div>
        )}

        {filtered.map((r) => (
          <button key={r.id} style={sc.resCard} onClick={() => onDetail(r.id)}>
            <div style={sc.resTop}>
              <span
                style={{
                  ...sc.resDot,
                  background: STATUS_DOT[r.status] || "#888",
                }}
              />
              <span style={sc.resDate}>{fmtDate(r.date)}</span>
              <span style={sc.resTime}>{fmtTime(r.start_time)}</span>
            </div>
            <div style={sc.resMeal}>
              {(r.meal_type || "lunch").charAt(0).toUpperCase() +
                (r.meal_type || "lunch").slice(1)}
              {r.dining_room?.name ? ` · ${r.dining_room.name}` : ""}
            </div>
            {r.notes && <div style={sc.resNotes}>{r.notes}</div>}
            <div style={sc.resStatus}>{r.status.toUpperCase()} →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Screen: Reservation Detail ───────────────────────────────────────────────

function DetailScreen({ id, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/reservations/${id}/bootstrap`);
      setData(res);
    } catch {
      try {
        const res = await api.get(`/api/reservations/${id}`);
        setData({
          reservation: res,
          attendees: res.attendees || [],
          orders: res.orders || [],
          messages: res.messages || [],
        });
      } catch {
        toast.error("Could not load reservation");
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const sendMsg = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await api.post("/api/messages", { reservation_id: id, body: msg.trim() });
      setMsg("");
      load();
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return (
      <div
        style={{ ...sc.root, justifyContent: "center", alignItems: "center" }}
      >
        <div style={sc.empty}>Loading...</div>
      </div>
    );

  const r = data?.reservation || data || {};
  const attendees = data?.attendees || r.attendees || [];
  const messages = data?.messages || r.messages || [];

  const STATUS_COLOR = {
    confirmed: "#2e7d32",
    draft: "#888",
    cancelled: "#c0392b",
  };

  return (
    <div style={{ ...sc.root, paddingBottom: 0 }}>
      <div style={sc.head}>
        <button style={sc.backBtn} onClick={onBack}>
          ← My Reservations
        </button>
        <div style={sc.title}>{fmtDate(r.date)}</div>
        <div style={sc.eyebrow}>
          {fmtTime(r.start_time)} · {(r.meal_type || "").toUpperCase()}
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 8,
            padding: "3px 10px",
            borderRadius: 4,
            background: STATUS_COLOR[r.status] || "#888",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {r.status}
        </div>
      </div>

      <div style={{ ...sc.body, paddingBottom: 0 }}>
        {/* Attendees */}
        {attendees.length > 0 && (
          <div style={sc.detailSection}>
            <div style={sc.detailSectionTitle}>Party</div>
            {attendees.map((a, i) => (
              <div key={i} style={sc.detailRow}>
                <span>
                  {a.member?.name || a.guest_name || `Guest #${a.id}`}
                </span>
                {(a.dietary_restrictions || []).length > 0 && (
                  <span style={sc.guestTag}>
                    {a.dietary_restrictions.join(", ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Room */}
        {r.dining_room?.name && (
          <div style={sc.detailSection}>
            <div style={sc.detailSectionTitle}>Room</div>
            <div style={sc.detailRow}>{r.dining_room.name}</div>
          </div>
        )}

        {/* Notes */}
        {r.notes && (
          <div style={sc.detailSection}>
            <div style={sc.detailSectionTitle}>Notes</div>
            <div style={{ ...sc.detailRow, fontStyle: "italic" }}>
              {r.notes}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={sc.detailSection}>
          <div style={sc.detailSectionTitle}>Messages with Staff</div>
          {messages.length === 0 && (
            <div style={sc.empty}>No messages yet. Send one below.</div>
          )}
          {messages.map((m, i) => {
            const mine = m.sender_id === user?.id;
            return (
              <div
                key={i}
                style={{
                  ...sc.bubble,
                  alignSelf: mine ? "flex-end" : "flex-start",
                  background: mine ? "#1B2D45" : "#f0f0f0",
                  color: mine ? "#fff" : "#1a1a1a",
                }}
              >
                {!mine && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      marginBottom: 3,
                      opacity: 0.6,
                    }}
                  >
                    {m.sender?.email || "Staff"}
                  </div>
                )}
                <div>{m.body}</div>
              </div>
            );
          })}

          <div style={sc.msgRow}>
            <input
              style={{ ...inp.base, flex: 1, marginBottom: 0 }}
              placeholder="Message to staff..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMsg()}
            />
            <button style={sc.sendBtn} onClick={sendMsg} disabled={sending}>
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Members ──────────────────────────────────────────────────────────

function MembersScreen() {
  const { members, setMembers } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    relation: "",
    dietary_restrictions: [],
  });
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const emptyForm = { name: "", relation: "", dietary_restrictions: [] };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEdit = (m) => {
    setEditing(m.id);
    setForm({
      name: m.name,
      relation: m.relation || "",
      dietary_restrictions: m.dietary_restrictions || [],
    });
    setShowForm(true);
  };
  const cancel = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const toggleDiet = (val) =>
    setForm((f) => ({
      ...f,
      dietary_restrictions: f.dietary_restrictions.includes(val)
        ? f.dietary_restrictions.filter((d) => d !== val)
        : [...f.dietary_restrictions, val],
    }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        const updated = await api.patch(`/api/members/${editing}`, {
          name: form.name.trim(),
          relation: form.relation || null,
          dietary_restrictions: form.dietary_restrictions,
        });
        setMembers((prev) => prev.map((m) => (m.id === editing ? updated : m)));
        toast.success("Member updated");
      } else {
        const created = await api.post("/api/members", {
          name: form.name.trim(),
          relation: form.relation || null,
          dietary_restrictions: form.dietary_restrictions,
        });
        setMembers((prev) => [...prev, created]);
        toast.success("Member added");
      }
      cancel();
    } catch (err) {
      toast.error(err?.detail || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const deleteMember = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/api/members/${id}`);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Member removed");
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err?.detail || "Failed to remove");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={sc.root}>
      <div style={sc.head}>
        <div style={sc.eyebrow}>Household</div>
        <div style={sc.title}>Members</div>
      </div>

      <div style={sc.body}>
        {(members || []).length === 0 && !showForm && (
          <div style={sc.emptyCard}>
            <div style={sc.emptyIcon}>👥</div>
            <div style={sc.emptyText}>No household members yet.</div>
          </div>
        )}

        {(members || []).map((m) => (
          <div key={m.id} style={sc.memberCard}>
            <div style={sc.memberTop}>
              <div>
                <div style={sc.memberName}>{m.name}</div>
                {m.relation && (
                  <div style={sc.memberRelation}>{m.relation}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {confirmDelete === m.id ? (
                  <>
                    <button
                      style={sc.dangerBtn}
                      onClick={() => deleteMember(m.id)}
                      disabled={loading}
                    >
                      Confirm Remove
                    </button>
                    <button
                      style={sc.ghostBtn}
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button style={sc.ghostBtn} onClick={() => openEdit(m)}>
                      Edit
                    </button>
                    <button
                      style={sc.dangerBtn}
                      onClick={() => setConfirmDelete(m.id)}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
            {(m.dietary_restrictions || []).length > 0 && (
              <div style={sc.dietTags}>
                {m.dietary_restrictions.map((d) => (
                  <span key={d} style={sc.dietTag}>
                    {d.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {!showForm && <BigBtn onClick={openNew}>+ Add Household Member</BigBtn>}

        {showForm && (
          <div style={sc.formCard}>
            <div style={sc.formTitle}>
              {editing ? "Edit Member" : "New Member"}
            </div>
            <Field label="Full Name">
              <input
                style={inp.base}
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />
            </Field>
            <Field label="Relation (optional)">
              <input
                style={inp.base}
                placeholder="Spouse, Child, Parent..."
                value={form.relation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relation: e.target.value }))
                }
              />
            </Field>
            <Field label="Dietary Restrictions">
              <div style={sc.dietGrid}>
                {DIETARY_OPTIONS.map((opt) => {
                  const on = form.dietary_restrictions.includes(opt);
                  return (
                    <button
                      key={opt}
                      style={{ ...sc.dietChip, ...(on ? sc.dietChipOn : {}) }}
                      onClick={() => toggleDiet(opt)}
                    >
                      {opt.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <BigBtn ghost onClick={cancel}>
                Cancel
              </BigBtn>
              <BigBtn onClick={save} disabled={loading}>
                {loading
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Add Member"}
              </BigBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen: Messages ─────────────────────────────────────────────────────────

function MessagesScreen() {
  const { reservations } = useData();
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [threads, setThreads] = useState({});
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const upcoming = (reservations || [])
    .filter((r) => r.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date));

  const loadThread = useCallback(async (resId) => {
    setLoading(true);
    try {
      let data;
      try {
        data = await api.get(`/api/reservations/${resId}/bootstrap`);
      } catch {
        data = await api.get(`/api/reservations/${resId}`);
      }
      const msgs = data?.messages || data?.reservation?.messages || [];
      setThreads((t) => ({ ...t, [resId]: msgs }));
    } catch {
      toast.error("Could not load messages");
    }
    setLoading(false);
  }, []);

  const selectRes = (r) => {
    setSelected(r);
    loadThread(r.id);
  };

  const sendMsg = async () => {
    if (!msg.trim() || !selected) return;
    setSending(true);
    try {
      await api.post("/api/messages", {
        reservation_id: selected.id,
        body: msg.trim(),
      });
      setMsg("");
      loadThread(selected.id);
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const messages = selected ? threads[selected.id] || [] : [];

  if (selected) {
    return (
      <div style={{ ...sc.root, paddingBottom: 0 }}>
        <div style={sc.head}>
          <button style={sc.backBtn} onClick={() => setSelected(null)}>
            ← All Reservations
          </button>
          <div style={sc.title}>Messages</div>
          <div style={sc.eyebrow}>
            {fmtDate(selected.date)} ·{" "}
            {(selected.meal_type || "").toUpperCase()}
          </div>
        </div>
        <div style={{ ...sc.body, paddingBottom: 0 }}>
          {loading && <div style={sc.empty}>Loading...</div>}
          {!loading && messages.length === 0 && (
            <div style={sc.empty}>
              No messages yet. Start the conversation below.
            </div>
          )}
          {messages.map((m, i) => {
            const mine = m.sender_id === user?.id;
            return (
              <div
                key={i}
                style={{
                  ...sc.bubble,
                  alignSelf: mine ? "flex-end" : "flex-start",
                  background: mine ? "#1B2D45" : "#f0f0f0",
                  color: mine ? "#fff" : "#1a1a1a",
                }}
              >
                {!mine && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      marginBottom: 3,
                      opacity: 0.6,
                    }}
                  >
                    {m.sender?.email || "Staff"}
                  </div>
                )}
                <div>{m.body}</div>
              </div>
            );
          })}
          <div style={sc.msgRow}>
            <input
              style={{ ...inp.base, flex: 1, marginBottom: 0 }}
              placeholder="Message to staff..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMsg()}
            />
            <button style={sc.sendBtn} onClick={sendMsg} disabled={sending}>
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={sc.root}>
      <div style={sc.head}>
        <div style={sc.eyebrow}>Contact Staff</div>
        <div style={sc.title}>Messages</div>
      </div>
      <div style={sc.body}>
        {upcoming.length === 0 && (
          <div style={sc.emptyCard}>
            <div style={sc.emptyIcon}>💬</div>
            <div style={sc.emptyText}>
              No active reservations to message about.
            </div>
          </div>
        )}
        <div style={sc.sectionLabel}>
          Select a reservation to message about:
        </div>
        {upcoming.map((r) => (
          <button key={r.id} style={sc.resCard} onClick={() => selectRes(r)}>
            <div style={sc.resTop}>
              <span style={sc.resDate}>{fmtDate(r.date)}</span>
              <span style={sc.resTime}>{fmtTime(r.start_time)}</span>
            </div>
            <div style={sc.resMeal}>
              {(r.meal_type || "lunch").charAt(0).toUpperCase() +
                (r.meal_type || "lunch").slice(1)}
              {r.dining_room?.name ? ` · ${r.dining_room.name}` : ""}
            </div>
            <div style={{ ...sc.resStatus, marginTop: 4 }}>
              Tap to view messages →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#666",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function BigBtn({ onClick, disabled, children, ghost }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "18px 20px",
        fontSize: 16,
        fontWeight: 700,
        borderRadius: 8,
        border: ghost ? "2px solid #1B2D45" : "none",
        background: disabled ? "#ccc" : ghost ? "transparent" : "#1B2D45",
        color: disabled ? "#999" : ghost ? "#1B2D45" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        marginBottom: 8,
        letterSpacing: "0.01em",
        // reset global styles
        boxShadow: "none",
        textTransform: "none",
        boxSizing: "border-box",
      }}
    >
      {children}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Root layout
const r = {
  root: {
    position: "fixed",
    inset: 0,
    background: "#F5F3EF",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 100, // space for pill
  },
  backdrop: { position: "fixed", inset: 0, zIndex: 40 },
  pillWrap: {
    position: "fixed",
    bottom: "max(20px, env(safe-area-inset-bottom, 20px))",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  switcher: {
    background: "rgba(20,18,15,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
    padding: 8,
    display: "flex",
    gap: 4,
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  switchBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    minWidth: 64,
    // global resets
    boxShadow: "none",
    textTransform: "none",
    letterSpacing: "normal",
    fontWeight: "normal",
  },
  switchBtnActive: { background: "rgba(255,255,255,0.12)" },
  switchIcon: { fontSize: 18, color: "rgba(255,255,255,0.7)" },
  switchLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(20,18,15,0.9)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 100,
    padding: "13px 22px",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
    cursor: "pointer",
    // global resets
    boxSizing: "border-box",
    textTransform: "none",
    letterSpacing: "normal",
    fontWeight: "normal",
    fontSize: "inherit",
    color: "inherit",
    outline: "none",
  },
  pillIcon: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
  pillLabel: {
    fontFamily: "-apple-system, sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: "0.01em",
    userSelect: "none",
  },
  pillCaret: { fontSize: 9, color: "rgba(255,255,255,0.3)" },
};

// Screen-level styles
const sc = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100%",
  },
  head: {
    padding: "52px 20px 20px",
    background: "#fff",
    borderBottom: "1px solid #e8e5e0",
    flexShrink: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#888",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: "#1a1a1a",
    lineHeight: 1.1,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  steps: {
    display: "flex",
    gap: 0,
    marginTop: 16,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #ddd",
  },
  stepBtn: {
    flex: 1,
    padding: "10px 4px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    border: "none",
    borderRight: "1px solid #ddd",
    background: "#f8f7f5",
    cursor: "pointer",
    boxShadow: "none",
    textTransform: "none",
  },
  stepBtnActive: { background: "#1B2D45" },
  stepNum: { fontSize: 12, fontWeight: 800, color: "#fff" },
  stepTxt: {
    fontSize: 9,
    fontWeight: 600,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  body: {
    flex: 1,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  stepPane: { display: "flex", flexDirection: "column" },
  warn: {
    background: "#fff3cd",
    border: "1px solid #ffc107",
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
    color: "#856404",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#888",
    marginBottom: 10,
    marginTop: 16,
  },
  attendeeList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },
  attendeeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    borderRadius: 8,
    padding: "12px 14px",
    border: "1px solid #e8e5e0",
  },
  attendeeName: { flex: 1, fontSize: 15, fontWeight: 600 },
  memberTag: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "2px 7px",
    borderRadius: 4,
    background: "#e8f0fe",
    color: "#1a56db",
  },
  guestTag: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "2px 7px",
    borderRadius: 4,
    background: "#fef3c7",
    color: "#92400e",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#999",
    fontSize: 16,
    cursor: "pointer",
    padding: "2px 4px",
    boxShadow: "none",
  },
  addRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    borderRadius: 8,
    padding: "14px 16px",
    border: "1px solid #e8e5e0",
    marginBottom: 8,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    color: "#1a1a1a",
    width: "100%",
    textAlign: "left",
    boxShadow: "none",
    textTransform: "none",
    letterSpacing: "normal",
  },
  addPlus: { fontSize: 20, color: "#1B2D45", fontWeight: 300 },
  addGuestBtn: {
    padding: "14px 18px",
    borderRadius: 8,
    background: "#1B2D45",
    color: "#fff",
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "none",
    textTransform: "none",
    whiteSpace: "nowrap",
  },
  confirmCard: {
    background: "#fff",
    borderRadius: 10,
    border: "1px solid #e8e5e0",
    overflow: "hidden",
    marginBottom: 8,
  },
  confirmRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "14px 18px",
    borderBottom: "1px solid #f0ede8",
  },
  confirmLabel: {
    fontSize: 13,
    color: "#888",
    fontWeight: 600,
    flexShrink: 0,
    marginRight: 12,
  },
  confirmVal: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a1a1a",
    textAlign: "right",
  },
  resCard: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "#fff",
    borderRadius: 10,
    padding: "16px",
    border: "1px solid #e8e5e0",
    marginBottom: 10,
    cursor: "pointer",
    boxShadow: "none",
    textTransform: "none",
    letterSpacing: "normal",
    fontFamily: "-apple-system, sans-serif",
  },
  resTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  resDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  resDate: { fontSize: 16, fontWeight: 700, color: "#1a1a1a" },
  resTime: { fontSize: 13, color: "#888", marginLeft: "auto" },
  resMeal: { fontSize: 13, color: "#555", marginBottom: 4 },
  resNotes: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 4,
  },
  resStatus: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#1B2D45",
  },
  empty: {
    fontSize: 14,
    color: "#888",
    padding: "20px 0",
    textAlign: "center",
  },
  emptyCard: {
    textAlign: "center",
    background: "#fff",
    borderRadius: 12,
    padding: "40px 20px",
    border: "1px solid #e8e5e0",
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: "#888" },
  // Members
  memberCard: {
    background: "#fff",
    borderRadius: 10,
    padding: "16px",
    border: "1px solid #e8e5e0",
    marginBottom: 10,
  },
  memberTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  memberName: {
    fontSize: 17,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  memberRelation: { fontSize: 12, color: "#888" },
  dietTags: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 },
  dietTag: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    padding: "3px 8px",
    borderRadius: 4,
    background: "#f0f7ff",
    color: "#1a56db",
    border: "1px solid #c3d9ff",
  },
  ghostBtn: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "1.5px solid #1B2D45",
    background: "transparent",
    color: "#1B2D45",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "none",
    textTransform: "none",
    letterSpacing: "normal",
  },
  dangerBtn: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    background: "#fee2e2",
    color: "#c0392b",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "none",
    textTransform: "none",
    letterSpacing: "normal",
  },
  formCard: {
    background: "#fff",
    borderRadius: 10,
    padding: 20,
    border: "1px solid #e8e5e0",
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 16,
    color: "#1a1a1a",
  },
  dietGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  dietChip: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1.5px solid #ddd",
    background: "#f8f7f5",
    color: "#555",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    textTransform: "capitalize",
    boxShadow: "none",
    letterSpacing: "normal",
  },
  dietChipOn: {
    background: "#1B2D45",
    border: "1.5px solid #1B2D45",
    color: "#fff",
  },
  // Detail + Messages
  backBtn: {
    background: "none",
    border: "none",
    color: "#1B2D45",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 0 12px 0",
    display: "block",
    boxShadow: "none",
  },
  detailSection: {
    background: "#fff",
    borderRadius: 10,
    border: "1px solid #e8e5e0",
    padding: 16,
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#888",
    marginBottom: 6,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 15,
    color: "#1a1a1a",
  },
  bubble: {
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 14,
    maxWidth: "78%",
    marginBottom: 8,
  },
  msgRow: {
    display: "flex",
    gap: 8,
    marginTop: 8,
  },
  sendBtn: {
    padding: "14px 18px",
    borderRadius: 8,
    background: "#1B2D45",
    color: "#fff",
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "none",
    textTransform: "none",
    flexShrink: 0,
  },
};

// Input styles
const inp = {
  base: {
    width: "100%",
    padding: "14px 14px",
    fontSize: 16,
    color: "#1a1a1a",
    background: "#fff",
    border: "1.5px solid #ddd",
    borderRadius: 8,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 0,
    fontFamily: "-apple-system, sans-serif",
    WebkitAppearance: "none",
    appearance: "none",
    // reset globals
    boxShadow: "none",
  },
  row: { display: "flex", gap: 8 },
  toggle: {
    flex: 1,
    padding: "14px 10px",
    borderRadius: 8,
    border: "1.5px solid #ddd",
    background: "#fff",
    color: "#555",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "none",
    textTransform: "none",
    letterSpacing: "normal",
  },
  toggleOn: {
    background: "#1B2D45",
    border: "1.5px solid #1B2D45",
    color: "#fff",
  },
};
