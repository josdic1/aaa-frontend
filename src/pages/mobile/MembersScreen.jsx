// src/pages/mobile/MembersScreen.jsx
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../utils/api";
import { useData } from "../../hooks/useData";
import { SubNav } from "./shared/SubNav";

export function MembersScreen({ onBack }) {
  const { members, refresh } = useData();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dietary_restrictions: [],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/members/", {
        name: form.name.trim(),
        dietary_restrictions: form.dietary_restrictions,
        notes: form.notes,
      });
      toast.success("Member inscribed");
      refresh();
      setAdding(false);
      setForm({ name: "", dietary_restrictions: [], notes: "" });
    } catch (err) {
      toast.error(err?.detail || "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const initials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div style={s.root}>
      <SubNav
        onBack={onBack}
        eyebrow="Member Registry"
        title={
          <>
            The <em style={{ fontStyle: "italic", fontWeight: 400 }}>Book</em>
          </>
        }
        eyebrowColor="rgba(196,169,106,0.7)"
        titleColor="#fff"
        backColor="rgba(255,255,255,0.45)"
        borderColor="rgba(255,255,255,0.06)"
      />

      {/* Decorative rule */}
      <div style={s.divider}>
        <div style={s.divLine} />
        <div style={s.divDot} />
        <div style={s.divLine} />
      </div>

      {/* Member list */}
      <div style={s.list}>
        {members.length === 0 && (
          <p style={s.empty}>No members yet. Add the first one below.</p>
        )}
        {members.map((m, i) => (
          <div key={m.id} style={{ ...s.row, animationDelay: `${i * 0.05}s` }}>
            <div style={s.mono}>{initials(m.name)}</div>
            <div style={s.info}>
              <div style={s.name}>{m.name}</div>
              <div
                style={{
                  ...s.note,
                  color:
                    m.dietary_restrictions?.length > 0
                      ? "rgba(248,113,113,0.75)"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                {m.dietary_restrictions?.length > 0
                  ? `⚠ ${m.dietary_restrictions.join(", ")}`
                  : m.notes || "No dietary restrictions"}
              </div>
            </div>
            <div style={s.role}>{m.role || "Member"}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding ? (
        <div style={s.addForm}>
          <div style={s.formField}>
            <label style={s.label}>Full Name</label>
            <input
              style={s.input}
              placeholder="Jane Smith"
              value={form.name}
              onChange={set("name")}
              autoFocus
            />
          </div>
          <div style={s.formField}>
            <label style={s.label}>Notes</label>
            <input
              style={s.input}
              placeholder="Any notes..."
              value={form.notes}
              onChange={set("notes")}
            />
          </div>
          <div style={s.formRow}>
            <button style={s.cancelBtn} onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button
              style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }}
              onClick={submit}
              disabled={saving}
            >
              {saving ? "Saving..." : "Inscribe"}
            </button>
          </div>
        </div>
      ) : (
        <button style={s.addBtn} onClick={() => setAdding(true)}>
          + Inscribe New Member
        </button>
      )}
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#0D1B2A",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 24px 16px",
  },
  divLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.07)" },
  divDot: {
    width: 4,
    height: 4,
    background: "rgba(196,169,106,0.4)",
    transform: "rotate(45deg)",
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    padding: "0 24px",
  },
  empty: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    fontStyle: "italic",
    paddingTop: 20,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    cursor: "pointer",
    animation: "riseIn 0.45s ease both",
  },
  mono: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid rgba(196,169,106,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Playfair Display, serif",
    fontStyle: "italic",
    fontSize: 13,
    color: "rgba(196,169,106,0.8)",
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: {
    fontFamily: "Playfair Display, serif",
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
  },
  note: { fontSize: 11, fontStyle: "italic" },
  role: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(196,169,106,0.5)",
    border: "1px solid rgba(196,169,106,0.2)",
    padding: "3px 6px",
    borderRadius: 2,
    flexShrink: 0,
  },
  addBtn: {
    margin: "20px 24px 28px",
    width: "calc(100% - 48px)",
    padding: 14,
    background: "transparent",
    border: "2px solid rgba(196,169,106,0.3)",
    color: "rgba(196,169,106,0.8)",
    fontFamily: "Playfair Display, serif",
    fontSize: 15,
    fontStyle: "italic",
    cursor: "pointer",
    borderRadius: 2,
  },
  addForm: {
    padding: "16px 24px 28px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  formField: { marginBottom: 14 },
  label: {
    display: "block",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.3)",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "10px 12px",
    color: "#fff",
    fontSize: 15,
    fontFamily: "Playfair Display, serif",
    outline: "none",
    borderRadius: 2,
    boxSizing: "border-box",
  },
  formRow: { display: "flex", gap: 10 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    cursor: "pointer",
    borderRadius: 2,
  },
  saveBtn: {
    flex: 2,
    padding: 12,
    background: "rgba(196,169,106,0.85)",
    border: "none",
    color: "#1a1a1a",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    borderRadius: 2,
  },
};
