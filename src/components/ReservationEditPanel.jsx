// src/components/ReservationEditPanel.jsx
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../utils/api";
import { useData } from "../hooks/useData";
import { DIETARY_OPTIONS } from "../constants/dietary";

export function ReservationEditPanel({ bootstrap, onSaved }) {
  const res = bootstrap.reservation;
  const { diningRooms } = useData();

  const [form, setForm] = useState({
    date: res.date || "",
    start_time: res.start_time || "",
    status: res.status || "draft",
    notes: res.notes || "",
    dining_room_id: res.dining_room_id ? String(res.dining_room_id) : "",
  });
  const [saving, setSaving] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState(null);

  const saveReservation = async () => {
    setSaving(true);
    try {
      const original = {
        date: res.date ?? null,
        start_time: res.start_time ?? null,
        status: res.status ?? null,
        notes: res.notes ?? null,
        dining_room_id: res.dining_room_id ? String(res.dining_room_id) : "",
      };

      const payload = {};
      for (const [k, v] of Object.entries(form)) {
        if (k === "date") continue;
        const normalized = v === "" ? null : v;
        const origNormalized = original[k] === "" ? null : original[k];
        if (String(normalized) !== String(origNormalized)) {
          payload[k] =
            k === "dining_room_id" && normalized
              ? parseInt(normalized)
              : normalized;
        }
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save");
        return;
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

  const activeRooms = (diningRooms || []).filter((r) => r.is_active);
  const messages = (bootstrap.messages || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* RESERVATION FIELDS */}
      <div>
        <div style={s.sectionLabel}>Reservation #{res.id}</div>
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
            <div style={s.fieldLabel}>Dining Room Preference</div>
            <select
              style={s.fieldInput}
              value={form.dining_room_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, dining_room_id: e.target.value }))
              }
            >
              <option value="">No preference</option>
              {activeRooms.map((room) => (
                <option key={room.id} value={String(room.id)}>
                  {room.name}
                </option>
              ))}
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

      {/* ATTENDEES */}
      <div
        style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "16px" }}
      >
        <div style={s.sectionLabel}>Attendees</div>
        {(bootstrap.attendees || []).length === 0 && (
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            No attendees yet.
          </div>
        )}
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

      {/* MESSAGES */}
      <div
        style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "16px" }}
      >
        <div style={s.sectionLabel}>
          Messages
          {messages.length > 0 && <span style={s.pill}>{messages.length}</span>}
        </div>
        {messages.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            No messages.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={s.messageBubble}>
                <div style={s.messageMeta}>
                  <span style={s.messageAuthor}>
                    User #{msg.sender_user_id}
                  </span>
                  <span style={s.messageTime}>
                    {new Date(msg.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div style={s.messageBody}>{msg.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AttendeeEditInline({ attendee, onSave }) {
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

export function ReservationDetailModal({ reservationId, onClose, onSaved }) {
  const [bootstrap, setBootstrap] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBootstrap = async () => {
    try {
      const data = await api.get(
        `/api/admin/reservations/${reservationId}/bootstrap`,
      );
      setBootstrap(data);
    } catch {
      toast.error("Failed to load reservation details");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, [reservationId]);

  const handleSaved = async () => {
    setLoading(true);
    await fetchBootstrap();
    onSaved?.();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={(e) => e.stopPropagation()}>
        <div style={ms.modalHeader}>
          <div style={ms.modalTitle}>Reservation #{reservationId}</div>
          <button onClick={onClose} style={ms.closeBtn}>
            ✕
          </button>
        </div>
        <div style={ms.modalBody}>
          {loading ? (
            <p style={{ color: "var(--muted)", fontSize: "13px" }}>
              Loading...
            </p>
          ) : bootstrap ? (
            <ReservationEditPanel bootstrap={bootstrap} onSaved={handleSaved} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

const s = {
  sectionLabel: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  pill: {
    fontSize: "9px",
    fontWeight: 700,
    background: "var(--border-dim)",
    color: "var(--muted)",
    borderRadius: "10px",
    padding: "1px 6px",
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
  messageBubble: {
    padding: "8px 10px",
    background: "var(--panel-2)",
    border: "1px solid var(--border-dim)",
    borderRadius: "var(--radius-sm)",
  },
  messageMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  messageAuthor: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted)",
  },
  messageTime: {
    fontSize: "10px",
    color: "var(--muted)",
  },
  messageBody: {
    fontSize: "12px",
    color: "var(--text)",
    lineHeight: 1.5,
  },
};

const ms = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    border: "2px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    width: "480px",
    maxWidth: "92vw",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 4px 0 var(--border)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px 16px",
    borderBottom: "1px solid var(--border-dim)",
    flexShrink: 0,
  },
  modalTitle: {
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
    fontSize: "18px",
    cursor: "pointer",
    padding: 0,
  },
  modalBody: {
    overflowY: "auto",
    padding: "20px 24px",
    flex: 1,
  },
};
