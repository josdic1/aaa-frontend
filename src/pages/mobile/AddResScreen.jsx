// src/pages/mobile/AddResScreen.jsx
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../utils/api";
import { useData } from "../../hooks/useData";
import { useAuth } from "../../hooks/useAuth";
import { SubNav } from "./shared/SubNav";

export function AddResScreen({ onBack }) {
  const { members, diningRooms, refresh } = useData();
  const { user } = useAuth();
  const [form, setForm] = useState({
    member_id: "",
    dining_room_id: "",
    date: "",
    start_time: "",
    meal_type: "dinner",
    party_size: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!form.member_id) {
      toast.error("Select a member");
      return;
    }
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/reservations/", {
        member_id: parseInt(form.member_id),
        dining_room_id: form.dining_room_id
          ? parseInt(form.dining_room_id)
          : undefined,
        date: form.date,
        start_time: form.start_time || undefined,
        meal_type: form.meal_type,
        party_size: form.party_size ? parseInt(form.party_size) : undefined,
        notes: form.notes || undefined,
        status: "confirmed",
      });
      toast.success("Reservation confirmed");
      refresh();
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setForm({
          member_id: "",
          dining_room_id: "",
          date: "",
          start_time: "",
          meal_type: "dinner",
          party_size: "",
          notes: "",
        });
      }, 2000);
    } catch (err) {
      const msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // generate reservation number from date
  const resNo = form.date
    ? `${form.date.replace(/-/g, "").slice(2)}`
    : String(Math.floor(Math.random() * 9000) + 1000);

  return (
    <div style={s.root}>
      <SubNav
        onBack={onBack}
        eyebrow="New Reservation"
        title={
          <>
            <em style={{ fontStyle: "italic", fontWeight: 400 }}>Booking</em>{" "}
            Card
          </>
        }
        eyebrowColor="var(--muted, #888)"
        titleColor="var(--accent, #1a1a1a)"
        backColor="rgba(26,26,26,0.45)"
        borderColor="rgba(26,26,26,0.08)"
      />

      <div style={s.cardWrap}>
        <div style={s.card}>
          {/* card header band */}
          <div style={s.cardHead}>
            <div style={s.cardBrand}>Abeyton Lodge</div>
            <div style={s.cardNo}>
              No. {resNo}
              <br />
              <span style={{ fontSize: 8, opacity: 0.5 }}>RESERVATION</span>
            </div>
          </div>

          <div style={s.cardBody}>
            <Field label="Member">
              <select
                style={s.input}
                value={form.member_id}
                onChange={set("member_id")}
              >
                <option value="">Select member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Dining Room">
              <select
                style={s.input}
                value={form.dining_room_id}
                onChange={set("dining_room_id")}
              >
                <option value="">Any available</option>
                {diningRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date of Dining">
              <input
                style={s.input}
                type="date"
                value={form.date}
                onChange={set("date")}
              />
            </Field>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <Field label="Meal Service">
                  <select
                    style={s.input}
                    value={form.meal_type}
                    onChange={set("meal_type")}
                  >
                    <option value="dinner">Dinner</option>
                    <option value="lunch">Luncheon</option>
                    <option value="brunch">Sunday Brunch</option>
                    <option value="breakfast">Breakfast</option>
                  </select>
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Party Size">
                  <input
                    style={s.input}
                    type="number"
                    min="1"
                    max="20"
                    placeholder="2"
                    value={form.party_size}
                    onChange={set("party_size")}
                  />
                </Field>
              </div>
            </div>

            <Field label="Notes (optional)">
              <input
                style={s.input}
                placeholder="Any special requests..."
                value={form.notes}
                onChange={set("notes")}
              />
            </Field>
          </div>

          {/* perforated bottom */}
          <div style={s.perf}>
            <div style={s.perfText}>Retain for records</div>
            <div style={s.stamp}>Abeyton Lodge</div>
          </div>

          <button
            style={{ ...s.confirmBtn, opacity: saving || done ? 0.7 : 1 }}
            onClick={submit}
            disabled={saving || done}
          >
            {done
              ? "✓ Reservation Confirmed"
              : saving
                ? "Confirming..."
                : "Confirm Reservation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8,
          fontWeight: 500,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--muted, #888)",
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#F5F0E6",
  },
  cardWrap: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    padding: "20px 20px 40px",
  },
  card: {
    background: "#fff",
    border: "2px solid var(--border, #1a1a1a)",
    boxShadow: "4px 4px 0 var(--border, #1a1a1a)",
    borderRadius: 2,
  },
  cardHead: {
    background: "#1B2D45",
    padding: "16px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBrand: {
    fontFamily: "Playfair Display, serif",
    fontSize: 17,
    color: "#fff",
    letterSpacing: "0.06em",
  },
  cardNo: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    textAlign: "right",
    lineHeight: 1.7,
  },
  cardBody: { padding: 22 },
  input: {
    width: "100%",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid rgba(26,26,26,0.12)",
    padding: "4px 0 9px",
    fontFamily: "Playfair Display, serif",
    fontSize: 18,
    color: "var(--accent, #1a1a1a)",
    outline: "none",
    WebkitAppearance: "none",
    appearance: "none",
    boxSizing: "border-box",
  },
  perf: {
    borderTop: "1px dashed rgba(26,26,26,0.15)",
    margin: "16px 22px 0",
    padding: "14px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  perfText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    color: "rgba(26,26,26,0.3)",
    letterSpacing: "0.1em",
  },
  stamp: {
    fontFamily: "Playfair Display, serif",
    fontSize: 9,
    fontStyle: "italic",
    color: "rgba(26,26,26,0.2)",
    border: "1px solid rgba(26,26,26,0.15)",
    padding: "3px 8px",
    transform: "rotate(-2deg)",
    display: "inline-block",
  },
  confirmBtn: {
    display: "block",
    width: "calc(100% - 44px)",
    margin: "16px 22px 22px",
    padding: 14,
    background: "var(--accent, #1a1a1a)",
    color: "#F5F0E6",
    border: "2px solid var(--border, #1a1a1a)",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "2px 2px 0 var(--border, #1a1a1a)",
    borderRadius: 0,
  },
};
