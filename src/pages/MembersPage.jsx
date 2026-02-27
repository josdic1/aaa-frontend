import { useState } from "react";
import { useData } from "../hooks/useData";
import { toast } from "sonner";
import { api } from "../utils/api";
import { DIETARY_OPTIONS } from "../constants/dietary";

const emptyForm = { name: "", relation: "", dietary_restrictions: [] };

export function MembersPage() {
  const { members, setMembers } = useData();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (member) => {
    setEditing(member.id);
    setForm({
      name: member.name,
      relation: member.relation || "",
      dietary_restrictions: member.dietary_restrictions || [],
    });
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const toggleDiet = (val) => {
    setForm((f) => ({
      ...f,
      dietary_restrictions: f.dietary_restrictions.includes(val)
        ? f.dietary_restrictions.filter((d) => d !== val)
        : [...f.dietary_restrictions, val],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const updated = await api.patch(`/api/members/${editing}`, form);
        setMembers((prev) => prev.map((m) => (m.id === editing ? updated : m)));
        toast.success("Member updated");
      } else {
        const created = await api.post("/api/members", form);
        setMembers((prev) => [...prev, created]);
        toast.success("Member added");
      }
      cancel();
    } catch (err) {
      toast.error(err.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/members/${id}`);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setConfirmDeleteId(null); // Clear confirmation state
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div className="page">
      <div style={s.header}>
        <div>
          <h1 style={{ fontSize: "28px", marginBottom: "4px" }}>
            Family Members
          </h1>
          <p className="muted">People you can add to your reservations.</p>
        </div>
        <button className="primary" onClick={openNew}>
          + Add Member
        </button>
      </div>

      {showForm && (
        <div className="card" style={s.formCard}>
          <h3 style={s.formTitle}>{editing ? "Edit Member" : "New Member"}</h3>
          <form onSubmit={handleSubmit}>
            <div style={s.formGrid}>
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="field">
                <label>Relation</label>
                <input
                  type="text"
                  value={form.relation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, relation: e.target.value }))
                  }
                  placeholder="Spouse, Child, Guest..."
                />
              </div>
            </div>

            <div className="field">
              <label>Dietary Restrictions</label>
              <div style={s.dietGrid}>
                {DIETARY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleDiet(opt)}
                    style={{
                      ...s.dietBtn,
                      background: form.dietary_restrictions.includes(opt)
                        ? "var(--accent)"
                        : "white",
                      color: form.dietary_restrictions.includes(opt)
                        ? "white"
                        : "var(--text)",
                      borderColor: form.dietary_restrictions.includes(opt)
                        ? "var(--accent)"
                        : "var(--border)",
                    }}
                  >
                    {opt.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.formActions}>
              <button type="button" className="ghost" onClick={cancel}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Add Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={s.list}>
        {members.map((m) => (
          <div key={m.id} className="card" style={s.memberCard}>
            <div>
              <div style={s.memberName}>{m.name}</div>
              {m.relation && <div className="muted">{m.relation}</div>}
              {m.dietary_restrictions?.length > 0 && (
                <div style={s.dietTags}>
                  {m.dietary_restrictions.map((d) => (
                    <span key={d} style={s.dietTag}>
                      {d.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={s.actions}>
              <button className="ghost" onClick={() => openEdit(m)}>
                Edit
              </button>

              {confirmDeleteId === m.id ? (
                <div style={s.confirmWrapper}>
                  <span style={s.confirmLabel}>Remove?</span>
                  <button
                    className="ghost"
                    style={s.yesBtn}
                    onClick={() => handleDelete(m.id)}
                  >
                    Yes
                  </button>
                  <button
                    className="ghost"
                    style={s.noBtn}
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="danger"
                  onClick={() => setConfirmDeleteId(m.id)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
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
  formCard: { marginBottom: "32px" },
  formTitle: {
    fontSize: "16px",
    fontWeight: 900,
    marginBottom: "24px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  dietGrid: { display: "flex", flexWrap: "wrap", gap: "8px" },
  dietBtn: {
    padding: "6px 12px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    border: "1.5px solid",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "all 0.1s",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "24px",
  },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  memberCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberName: {
    fontFamily: "Playfair Display, serif",
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "4px",
  },
  dietTags: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" },
  dietTag: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 8px",
    border: "1px solid var(--border-dim)",
    borderRadius: "2px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--muted)",
  },
  actions: { display: "flex", gap: "8px", alignItems: "center" },
  confirmWrapper: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    background: "var(--panel-2)",
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid var(--border-dim)",
  },
  confirmLabel: {
    fontSize: "11px",
    fontWeight: 800,
    color: "var(--muted)",
    textTransform: "uppercase",
  },
  yesBtn: {
    fontSize: "11px",
    color: "var(--red)",
    fontWeight: 900,
    padding: "2px 6px",
  },
  noBtn: {
    fontSize: "11px",
    color: "var(--text)",
    fontWeight: 900,
    padding: "2px 6px",
  },
};
