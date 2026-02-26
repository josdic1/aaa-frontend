// src/pages/AdminOverlord.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { api } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

const TABS = [
  { key: "reservations", label: "Reservations" },
  { key: "attendees", label: "Attendees" },
  { key: "orders", label: "Orders" },
  { key: "messages", label: "Messages" },
  { key: "members", label: "Members" },
  { key: "users", label: "Users" },
  { key: "tables", label: "Tables" },
  { key: "rooms", label: "Rooms" },
  { key: "menu", label: "Menu" },
];

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

const ROLES = ["member", "staff", "admin"];

function extractError(err) {
  if (!err) return "Something went wrong";
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail)) return err.detail.map((e) => e.msg).join(", ");
  return "Something went wrong";
}

function Badge({ children, color }) {
  return (
    <span
      style={{
        fontSize: "10px", // Slightly larger
        fontWeight: 900,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "2px 8px",
        border: `2px solid ${color || "#aaa"}`, // Thicker border
        color: color || "#aaa",
        background: "rgba(0,0,0,0.3)", // Subtle backing
        borderRadius: "2px",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={os.overlay} onClick={onCancel}>
      <div
        style={{ ...os.modal, maxWidth: "360px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px" }}
        >
          {message}
        </div>
        <div
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <button style={os.ghostBtn} onClick={onCancel}>
            Cancel
          </button>
          <button style={os.deleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ title, children, onClose }) {
  return (
    <div style={os.overlay} onClick={onClose}>
      <div style={os.modal} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div style={os.modalTitle}>{title}</div>
          <button onClick={onClose} style={os.iconBtn}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminOverlord() {
  const [tab, setTab] = useState("reservations");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Cache of members for name resolution when admin attendee endpoints
  // don't embed member objects.
  const [membersById, setMembersById] = useState({});
  const [membersLoaded, setMembersLoaded] = useState(false);

  // All endpoints use /api/admin/... for proper staff-gated access
  const endpoints = {
    reservations: "/api/admin/reservations",
    attendees: "/api/admin/attendees",
    orders: "/api/admin/orders",
    messages: "/api/admin/messages",
    members: "/api/admin/members",
    users: "/api/admin/users",
    tables: "/api/admin/tables",
    rooms: "/api/admin/dining-rooms",
    menu: "/api/admin/menu-items",
  };

  const ensureMembersIndex = useCallback(async () => {
    if (membersLoaded) return;
    try {
      const result = await api.get(endpoints.members);
      const rows = Array.isArray(result)
        ? result
        : result.members || result.items || [];
      const map = {};
      for (const m of rows) map[m.id] = m;
      setMembersById(map);
      setMembersLoaded(true);
    } catch {
      // Don't hard fail the whole UI just because this enrichment failed.
      // Names will fallback to guest_name/Guest.
    }
  }, [membersLoaded]);

  const hydrateAttendees = useCallback(
    (rows) => {
      if (!Array.isArray(rows)) return [];
      return rows.map((a) => {
        if (a?.member?.name) return a;
        const m = a?.member_id ? membersById[a.member_id] : null;
        if (!m) return a;
        return { ...a, member: m };
      });
    },
    [membersById],
  );

  const normalizeListPayload = (result) => {
    if (Array.isArray(result)) return result;
    // common shapes across admin endpoints
    return (
      result.reservations ||
      result.attendees ||
      result.orders ||
      result.messages ||
      result.members ||
      result.users ||
      result.tables ||
      result.rooms ||
      result.menu_items ||
      result.items ||
      []
    );
  };

  const load = useCallback(
    async (section) => {
      setLoading(true);
      try {
        // If we’re loading anything that needs attendee/member names,
        // warm the member index first.
        if (section === "attendees" || section === "reservations") {
          await ensureMembersIndex();
        }

        const result = await api.get(endpoints[section]);
        let rows = normalizeListPayload(result);

        if (section === "attendees") {
          rows = hydrateAttendees(rows);
        }

        setData((prev) => ({
          ...prev,
          [section]: rows,
        }));
      } catch {
        toast.error(`Failed to load ${section}`);
      } finally {
        setLoading(false);
      }
    },
    [ensureMembersIndex, hydrateAttendees],
  );

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  // If user navigates to Attendees/Reservations, prefetch members so names resolve fast.
  useEffect(() => {
    if (tab === "attendees" || tab === "reservations") ensureMembersIndex();
  }, [tab, ensureMembersIndex]);

  const deleteRow = (section, id, label) => {
    setConfirm({
      message: `Delete ${label}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`${endpoints[section]}/${id}`);
          await load(section);
          toast.success("Deleted");
        } catch (err) {
          toast.error(extractError(err));
        }
      },
    });
  };

  const rows = data[tab] || [];

  return (
    <div style={os.root}>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div style={os.sidebar}>
        <div style={os.sidebarTitle}>⚡ Overlord</div>
        {TABS.map((t) => (
          <button
            key={t.key}
            style={{
              ...os.sidebarBtn,
              ...(tab === t.key ? os.sidebarActive : {}),
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={os.main}>
        <div style={os.mainHeader}>
          <h2 style={os.mainTitle}>{TABS.find((t) => t.key === tab)?.label}</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={os.ghostBtn} onClick={() => load(tab)}>
              ↻ Refresh
            </button>
            {tab === "menu" && <NewMenuItemBtn onSaved={() => load("menu")} />}
            {tab === "tables" && <NewTableBtn onSaved={() => load("tables")} />}
            {tab === "rooms" && <NewRoomBtn onSaved={() => load("rooms")} />}
            {tab === "members" && (
              <NewMemberBtn onSaved={() => load("members")} />
            )}
          </div>
        </div>

        {loading && (
          <p style={{ color: "#888", padding: "20px 0" }}>Loading...</p>
        )}

        {!loading && tab === "reservations" && (
          <ReservationsTable
            rows={rows}
            membersById={membersById}
            onRefresh={() => load("reservations")}
            onDelete={(id) =>
              deleteRow("reservations", id, `Reservation #${id}`)
            }
          />
        )}
        {!loading && tab === "attendees" && (
          <AttendeesTable
            rows={rows}
            membersById={membersById}
            onRefresh={() => load("attendees")}
            onDelete={(id) => deleteRow("attendees", id, `Attendee #${id}`)}
          />
        )}
        {!loading && tab === "orders" && (
          <OrdersTable
            rows={rows}
            onRefresh={() => load("orders")}
            onDelete={(id) => deleteRow("orders", id, `Order #${id}`)}
          />
        )}
        {!loading && tab === "messages" && (
          <MessagesTable
            rows={rows}
            onRefresh={() => load("messages")}
            onDelete={(id) => deleteRow("messages", id, `Message #${id}`)}
          />
        )}
        {!loading && tab === "members" && (
          <MembersTable
            rows={rows}
            onRefresh={() => load("members")}
            onDelete={(id) => deleteRow("members", id, `Member #${id}`)}
          />
        )}
        {!loading && tab === "users" && (
          <UsersTable rows={rows} onRefresh={() => load("users")} />
        )}
        {!loading && tab === "tables" && (
          <TablesTable
            rows={rows}
            onRefresh={() => load("tables")}
            onDelete={(id) => deleteRow("tables", id, `Table #${id}`)}
          />
        )}
        {!loading && tab === "rooms" && (
          <RoomsTable
            rows={rows}
            onRefresh={() => load("rooms")}
            onDelete={(id) => deleteRow("rooms", id, `Room #${id}`)}
          />
        )}
        {!loading && tab === "menu" && (
          <MenuTable
            rows={rows}
            onRefresh={() => load("menu")}
            onDelete={(id) => deleteRow("menu", id, `Menu item #${id}`)}
          />
        )}
      </div>
    </div>
  );
}

// ── RESERVATIONS ─────────────────────────────────────────────────────────────

function ReservationsTable({ rows, membersById, onRefresh, onDelete }) {
  const [detail, setDetail] = useState(null);
  const statusColor = {
    draft: "#888",
    confirmed: "#2e7d32",
    cancelled: "#c0392b",
  };

  return (
    <>
      {detail && (
        <ReservationDetailModal
          reservationId={detail}
          membersById={membersById}
          onClose={() => {
            setDetail(null);
            onRefresh();
          }}
        />
      )}
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Date", "Time", "Status", "Notes", "Actions"].map((h) => (
                <th key={h} style={os.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>{r.date}</td>
                <td style={os.td}>{r.start_time?.slice(0, 5)}</td>
                <td style={os.td}>
                  <Badge color={statusColor[r.status]}>{r.status}</Badge>
                </td>
                <td
                  style={{
                    ...os.td,
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.notes || "—"}
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    <button
                      style={os.accentBtn}
                      onClick={() => setDetail(r.id)}
                    >
                      Detail
                    </button>
                    <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No reservations.</p>}
    </>
  );
}

function ReservationDetailModal({ reservationId, membersById, onClose }) {
  const { user: currentUser } = useAuth();
  const [bootstrap, setBootstrap] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const hydrateAttendeesWithMembers = useCallback(
    (atts) => {
      if (!Array.isArray(atts)) return [];
      return atts.map((a) => {
        if (a?.member?.name) return a;
        const m = a?.member_id ? membersById[a.member_id] : null;
        if (!m) return a;
        return { ...a, member: m };
      });
    },
    [membersById],
  );

  const load = async () => {
    try {
      const [res, msgs, atts, tbls] = await Promise.all([
        api.get(`/api/admin/reservations/${reservationId}`),
        api.get(`/api/admin/messages?reservation_id=${reservationId}`),
        api.get(`/api/admin/attendees?reservation_id=${reservationId}`),
        api.get("/api/admin/tables"),
      ]);
      setBootstrap(res);
      setMessages(
        Array.isArray(msgs) ? msgs : msgs.messages || msgs.items || [],
      );
      const fixedAtts = hydrateAttendeesWithMembers(
        Array.isArray(atts) ? atts : atts.attendees || atts.items || [],
      );
      setAttendees(fixedAtts);
      setTables(Array.isArray(tbls) ? tbls : tbls.tables || tbls.items || []);
      setForm({
        date: res.date || "",
        start_time: res.start_time || "",
        status: res.status || "draft",
        notes: res.notes || "",
      });
    } catch (err) {
      toast.error("Failed to load reservation detail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reservationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveReservation = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/reservations/${reservationId}`, form);
      toast.success("Reservation saved");
      await load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveAttendee = async (id, patch) => {
    try {
      await api.patch(`/api/admin/attendees/${id}`, patch);
      toast.success("Attendee saved");
      await load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const deleteAttendee = async (id) => {
    try {
      await api.delete(`/api/admin/attendees/${id}`);
      toast.success("Attendee removed");
      await load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const deleteMessage = async (id) => {
    try {
      await api.delete(`/api/admin/messages/${id}`);
      await load();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      await api.post("/api/messages", {
        reservation_id: reservationId,
        body: replyBody,
      });
      setReplyBody("");
      await load();
      toast.success("Message sent");
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSending(false);
    }
  };

  const statusColor = {
    draft: "#888",
    confirmed: "#2e7d32",
    cancelled: "#c0392b",
  };

  return (
    <div
      style={{
        ...os.overlay,
        alignItems: "flex-start",
        paddingTop: "40px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...os.modal,
          width: "720px",
          maxWidth: "95vw",
          maxHeight: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={os.modalTitle}>Reservation #{reservationId}</div>
          <button onClick={onClose} style={os.iconBtn}>
            ✕
          </button>
        </div>

        {loading && <p style={{ color: "#888" }}>Loading...</p>}

        {!loading && form && (
          <>
            <div style={os.detailSection}>
              <div style={os.detailSectionTitle}>Reservation Details</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div style={os.formField}>
                  <label style={os.label}>Date</label>
                  <input
                    style={os.input}
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div style={os.formField}>
                  <label style={os.label}>Start Time</label>
                  <input
                    style={os.input}
                    type="time"
                    value={form.start_time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_time: e.target.value }))
                    }
                  />
                </div>
                <div style={os.formField}>
                  <label style={os.label}>Status</label>
                  <select
                    style={os.input}
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
                <div style={os.formField}>
                  <label style={os.label}>Notes</label>
                  <input
                    style={os.input}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              <button
                style={{ ...os.primaryBtn, marginTop: "12px" }}
                onClick={saveReservation}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div style={os.detailSection}>
              <div style={os.detailSectionTitle}>
                Attendees ({attendees.length})
              </div>
              {attendees.length === 0 && (
                <p style={{ color: "#666", fontSize: "13px" }}>No attendees.</p>
              )}
              {attendees.map((a) => (
                <AttendeeInlineEditor
                  key={a.id}
                  attendee={a}
                  membersById={membersById}
                  onSave={(patch) => saveAttendee(a.id, patch)}
                  onDelete={() => deleteAttendee(a.id)}
                />
              ))}
            </div>

            <div style={os.detailSection}>
              <div style={os.detailSectionTitle}>
                Messages ({messages.length})
              </div>
              {messages.length === 0 && (
                <p style={{ color: "#666", fontSize: "13px" }}>No messages.</p>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                {messages.map((msg) => (
                  <div key={msg.id} style={os.msgRow}>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          color: "#c8783c",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: "3px",
                        }}
                      >
                        {msg.sender?.email || currentUser?.email || "Staff"} ·{" "}
                        {new Date(msg.created_at).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#e8e8e4",
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.body}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      style={{
                        ...os.iconBtn,
                        fontSize: "12px",
                        color: "#c0392b",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  style={{ ...os.input, flex: 1 }}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Reply to this reservation..."
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                />
                <button
                  style={os.primaryBtn}
                  onClick={sendReply}
                  disabled={sending}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AttendeeInlineEditor({ attendee, membersById, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
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

  const resolvedMember = attendee.member?.name
    ? attendee.member
    : attendee.member_id
      ? membersById?.[attendee.member_id]
      : null;

  const name = resolvedMember?.name || attendee.guest_name || "Guest";

  return (
    <div style={os.attendeeRow}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: "13px", color: "#e8e8e4" }}>
            {name}
          </span>
          {(attendee.member_id || resolvedMember?.id) && (
            <span
              style={{ marginLeft: "8px", fontSize: "10px", color: "#555" }}
            >
              saved member
            </span>
          )}
          {(attendee.dietary_restrictions || []).length > 0 && (
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
              {attendee.dietary_restrictions.join(", ")}
            </div>
          )}
        </div>
        <div style={os.actions}>
          <button style={os.editBtn} onClick={() => setOpen(!open)}>
            {open ? "Close" : "Edit"}
          </button>
          <button style={os.deleteBtn} onClick={onDelete}>
            Del
          </button>
        </div>
      </div>
      {open && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid #2a2a26",
          }}
        >
          <div style={os.formField}>
            <label style={os.label}>Name</label>
            <input
              style={os.input}
              value={form.guest_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, guest_name: e.target.value }))
              }
            />
          </div>
          <div style={{ marginTop: "10px" }}>
            <div style={os.label}>Dietary</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "5px",
                marginTop: "6px",
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
                      ...os.chip,
                      background: on ? "#c8783c" : "#1a1a18",
                      color: on ? "#fff" : "#aaa",
                      borderColor: on ? "#c8783c" : "#444",
                    }}
                  >
                    {opt.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            style={{ ...os.primaryBtn, marginTop: "10px" }}
            onClick={() => {
              onSave(form);
              setOpen(false);
            }}
          >
            Save Attendee
          </button>
        </div>
      )}
    </div>
  );
}

// ── ATTENDEES ─────────────────────────────────────────────────────────────────

function AttendeesTable({ rows, membersById, onRefresh, onDelete }) {
  const [editing, setEditing] = useState(null);

  const resolveName = useCallback(
    (r) => {
      if (r?.member?.name) return r.member.name;
      if (r?.member_id && membersById?.[r.member_id]?.name)
        return membersById[r.member_id].name;
      return r?.guest_name || "—";
    },
    [membersById],
  );

  const save = async (id, patch) => {
    try {
      await api.patch(`/api/admin/attendees/${id}`, patch);
      onRefresh();
      setEditing(null);
      toast.success("Saved");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <>
      {editing && (
        <EditModal
          title={`Attendee #${editing.id}`}
          onClose={() => setEditing(null)}
        >
          <AttendeeEditForm
            attendee={editing}
            onSave={(patch) => save(editing.id, patch)}
          />
        </EditModal>
      )}
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Res", "Name", "Dietary", "Actions"].map((h) => (
                <th key={h} style={os.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>#{r.reservation_id}</td>
                <td style={os.td}>{resolveName(r)}</td>
                <td style={{ ...os.td, fontSize: "10px" }}>
                  {(r.dietary_restrictions || []).join(", ") || "none"}
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    <button style={os.editBtn} onClick={() => setEditing(r)}>
                      Edit
                    </button>
                    <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No attendees.</p>}
    </>
  );
}

function AttendeeEditForm({ attendee, onSave }) {
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
    <div style={os.formStack}>
      <div style={os.formField}>
        <label style={os.label}>Guest Name</label>
        <input
          style={os.input}
          value={form.guest_name}
          onChange={(e) =>
            setForm((f) => ({ ...f, guest_name: e.target.value }))
          }
        />
      </div>
      <div>
        <div style={os.label}>Dietary Restrictions</div>
        <div style={os.chipGrid}>
          {DIETARY_OPTIONS.map((opt) => {
            const on = form.dietary_restrictions.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleDiet(opt)}
                style={{
                  ...os.chip,
                  background: on ? "#c8783c" : "#1a1a18",
                  color: on ? "#fff" : "#aaa",
                  borderColor: on ? "#c8783c" : "#444",
                }}
              >
                {opt.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>
      <button style={os.primaryBtn} onClick={() => onSave(form)}>
        Save
      </button>
    </div>
  );
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

function OrdersTable({ rows, onRefresh, onDelete }) {
  const patchStatus = async (id, status) => {
    try {
      await api.patch(`/api/admin/orders/${id}`, { status });
      onRefresh();
      toast.success(`Order ${status}`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const statusColor = { open: "#888", fired: "#c8783c", fulfilled: "#2e7d32" };

  return (
    <>
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Attendee", "Status", "Actions"].map((h) => (
                <th key={h} style={os.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>#{r.attendee_id}</td>
                <td style={os.td}>
                  <Badge color={statusColor[r.status]}>{r.status}</Badge>
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    {r.status === "open" && (
                      <button
                        style={os.editBtn}
                        onClick={() => patchStatus(r.id, "fired")}
                      >
                        Fire
                      </button>
                    )}
                    {r.status === "fired" && (
                      <button
                        style={os.editBtn}
                        onClick={() => patchStatus(r.id, "fulfilled")}
                      >
                        Fulfill
                      </button>
                    )}
                    {r.status === "fulfilled" && (
                      <button
                        style={os.editBtn}
                        onClick={() => patchStatus(r.id, "open")}
                      >
                        Reopen
                      </button>
                    )}
                    <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No orders.</p>}
    </>
  );
}

// ── MESSAGES ──────────────────────────────────────────────────────────────────

function MessagesTable({ rows, onRefresh, onDelete }) {
  const { user: currentUser } = useAuth();
  return (
    <>
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Res", "Sender", "Body", "Sent", "Actions"].map((h) => (
                <th key={h} style={os.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>#{r.reservation_id}</td>
                <td style={os.td}>{r.sender?.email || "—"}</td>
                <td
                  style={{
                    ...os.td,
                    maxWidth: "300px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.body}
                </td>
                <td style={os.td}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={os.td}>
                  <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                    Del
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No messages.</p>}
    </>
  );
}

// ── MEMBERS ───────────────────────────────────────────────────────────────────

function MembersTable({ rows, onRefresh, onDelete }) {
  const [editing, setEditing] = useState(null);

  const save = async (id, patch) => {
    try {
      if (id) {
        await api.patch(`/api/admin/members/${id}`, patch);
      } else {
        await api.post("/api/admin/members", patch);
      }
      onRefresh();
      setEditing(null);
      toast.success("Saved");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <>
      {editing && (
        <EditModal
          title={editing.id ? `Member #${editing.id}` : "New Member"}
          onClose={() => setEditing(null)}
        >
          <MemberEditForm
            member={editing}
            onSave={(patch) => save(editing.id, patch)}
          />
        </EditModal>
      )}
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Name", "User ID", "Relation", "Dietary", "Actions"].map(
                (h) => (
                  <th key={h} style={os.th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>{r.name}</td>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.user_id}</span>
                </td>
                <td style={os.td}>{r.relation || "—"}</td>
                <td style={{ ...os.td, fontSize: "10px" }}>
                  {(r.dietary_restrictions || [])
                    .map((d) => d.replace(/_/g, " "))
                    .join(", ") || "none"}
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    <button style={os.editBtn} onClick={() => setEditing(r)}>
                      Edit
                    </button>
                    <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No members.</p>}
    </>
  );
}

function MemberEditForm({ member, onSave }) {
  const [form, setForm] = useState({
    name: member.name || "",
    relation: member.relation || "",
    dietary_restrictions: member.dietary_restrictions || [],
  });
  const toggleDiet = (val) =>
    setForm((f) => ({
      ...f,
      dietary_restrictions: f.dietary_restrictions.includes(val)
        ? f.dietary_restrictions.filter((d) => d !== val)
        : [...f.dietary_restrictions, val],
    }));
  return (
    <div style={os.formStack}>
      <div style={os.formField}>
        <label style={os.label}>Name</label>
        <input
          style={os.input}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div style={os.formField}>
        <label style={os.label}>Relation</label>
        <input
          style={os.input}
          value={form.relation}
          placeholder="e.g. Spouse, Parent"
          onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value }))}
        />
      </div>
      <div>
        <div style={os.label}>Dietary Restrictions</div>
        <div style={os.chipGrid}>
          {DIETARY_OPTIONS.map((opt) => {
            const on = form.dietary_restrictions.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleDiet(opt)}
                style={{
                  ...os.chip,
                  background: on ? "#c8783c" : "#1a1a18",
                  color: on ? "#fff" : "#aaa",
                  borderColor: on ? "#c8783c" : "#444",
                }}
              >
                {opt.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>
      <button style={os.primaryBtn} onClick={() => onSave(form)}>
        Save
      </button>
    </div>
  );
}

function NewMemberBtn({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const save = async (form) => {
    if (!userId) {
      toast.error("User ID is required");
      return;
    }
    try {
      await api.post(`/api/admin/members?user_id=${userId}`, form);
      onSaved();
      setOpen(false);
      setUserId("");
      toast.success("Member created");
    } catch (err) {
      toast.error(extractError(err));
    }
  };
  return (
    <>
      <button style={os.primaryBtn} onClick={() => setOpen(true)}>
        + New Member
      </button>
      {open && (
        <EditModal title="New Member" onClose={() => setOpen(false)}>
          <div style={os.formStack}>
            <div style={os.formField}>
              <label style={os.label}>User ID (required)</label>
              <input
                style={os.input}
                type="number"
                value={userId}
                placeholder="Link to user #"
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <MemberEditForm member={{}} onSave={save} />
          </div>
        </EditModal>
      )}
    </>
  );
}

// ── USERS ─────────────────────────────────────────────────────────────────────

function UsersTable({ rows, onRefresh }) {
  const setRole = async (id, role) => {
    try {
      await api.patch(`/api/admin/users/${id}`, { role });
      onRefresh();
      toast.success("Role updated");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const roleColor = { member: "#888", staff: "#c8783c", admin: "#2e7d32" };

  return (
    <>
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Email", "Role", "Change Role"].map((h) => (
                <th key={h} style={os.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>{r.email}</td>
                <td style={os.td}>
                  <Badge color={roleColor[r.role]}>{r.role}</Badge>
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    {ROLES.filter((rl) => rl !== r.role).map((rl) => (
                      <button
                        key={rl}
                        style={os.editBtn}
                        onClick={() => setRole(r.id, rl)}
                      >
                        → {rl}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No users.</p>}
    </>
  );
}

// ── TABLES ────────────────────────────────────────────────────────────────────

function TablesTable({ rows, onRefresh, onDelete }) {
  const [editing, setEditing] = useState(null);

  const save = async (id, patch) => {
    try {
      await api.patch(`/api/admin/tables/${id}`, patch);
      onRefresh();
      setEditing(null);
      toast.success("Saved");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const toggle = async (id, is_active) => {
    try {
      await api.patch(`/api/admin/tables/${id}`, { is_active });
      onRefresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <>
      {editing && (
        <EditModal
          title={`Table #${editing.id}`}
          onClose={() => setEditing(null)}
        >
          <TableEditForm
            table={editing}
            onSave={(patch) => save(editing.id, patch)}
          />
        </EditModal>
      )}
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Name", "Room ID", "Seats", "Active", "Actions"].map(
                (h) => (
                  <th key={h} style={os.th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>{r.name}</td>
                <td style={os.td}>{r.dining_room_id}</td>
                <td style={os.td}>{r.seat_count}</td>
                <td style={os.td}>
                  <button
                    onClick={() => toggle(r.id, !r.is_active)}
                    style={{
                      ...os.toggleBtn,
                      background: r.is_active ? "#2e7d32" : "#555",
                      color: "#fff",
                    }}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    <button style={os.editBtn} onClick={() => setEditing(r)}>
                      Edit
                    </button>
                    <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No tables.</p>}
    </>
  );
}

function TableEditForm({ table, onSave }) {
  const [form, setForm] = useState({
    name: table.name || "",
    seat_count: table.seat_count || 4,
    dining_room_id: table.dining_room_id || "",
    is_active: table.is_active ?? true,
  });
  return (
    <div style={os.formStack}>
      <div style={os.formField}>
        <label style={os.label}>Name</label>
        <input
          style={os.input}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div style={os.formField}>
        <label style={os.label}>Seats</label>
        <input
          style={os.input}
          type="number"
          value={form.seat_count}
          min={1}
          max={50}
          onChange={(e) =>
            setForm((f) => ({ ...f, seat_count: parseInt(e.target.value) }))
          }
        />
      </div>
      <div style={os.formField}>
        <label style={os.label}>Room ID</label>
        <input
          style={os.input}
          type="number"
          value={form.dining_room_id}
          onChange={(e) =>
            setForm((f) => ({ ...f, dining_room_id: parseInt(e.target.value) }))
          }
        />
      </div>
      <label
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          fontSize: "13px",
          color: "#ccc",
        }}
      >
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) =>
            setForm((f) => ({ ...f, is_active: e.target.checked }))
          }
        />
        Active
      </label>
      <button style={os.primaryBtn} onClick={() => onSave(form)}>
        Save
      </button>
    </div>
  );
}

function NewTableBtn({ onSaved }) {
  const [open, setOpen] = useState(false);
  const save = async (form) => {
    try {
      await api.post("/api/admin/tables", form);
      onSaved();
      setOpen(false);
      toast.success("Table created");
    } catch (err) {
      toast.error(extractError(err));
    }
  };
  return (
    <>
      <button style={os.primaryBtn} onClick={() => setOpen(true)}>
        + New Table
      </button>
      {open && (
        <EditModal title="New Table" onClose={() => setOpen(false)}>
          <TableEditForm table={{}} onSave={save} />
        </EditModal>
      )}
    </>
  );
}

// ── ROOMS ─────────────────────────────────────────────────────────────────────

function RoomsTable({ rows, onRefresh, onDelete }) {
  const [editing, setEditing] = useState(null);

  const save = async (id, patch) => {
    try {
      await api.patch(`/api/admin/dining-rooms/${id}`, patch);
      onRefresh();
      setEditing(null);
      toast.success("Saved");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const toggle = async (id, is_active) => {
    try {
      await api.patch(`/api/admin/dining-rooms/${id}`, { is_active });
      onRefresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <>
      {editing && (
        <EditModal
          title={`Room #${editing.id}`}
          onClose={() => setEditing(null)}
        >
          <RoomEditForm
            room={editing}
            onSave={(patch) => save(editing.id, patch)}
          />
        </EditModal>
      )}
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Name", "Active", "Actions"].map((h) => (
                <th key={h} style={os.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>{r.name}</td>
                <td style={os.td}>
                  <button
                    onClick={() => toggle(r.id, !r.is_active)}
                    style={{
                      ...os.toggleBtn,
                      background: r.is_active ? "#2e7d32" : "#555",
                      color: "#fff",
                    }}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    <button style={os.editBtn} onClick={() => setEditing(r)}>
                      Edit
                    </button>
                    <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No rooms.</p>}
    </>
  );
}

function RoomEditForm({ room, onSave }) {
  const [form, setForm] = useState({
    name: room.name || "",
    is_active: room.is_active ?? true,
  });
  return (
    <div style={os.formStack}>
      <div style={os.formField}>
        <label style={os.label}>Name</label>
        <input
          style={os.input}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <label
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          fontSize: "13px",
          color: "#ccc",
        }}
      >
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) =>
            setForm((f) => ({ ...f, is_active: e.target.checked }))
          }
        />
        Active
      </label>
      <button style={os.primaryBtn} onClick={() => onSave(form)}>
        Save
      </button>
    </div>
  );
}

function NewRoomBtn({ onSaved }) {
  const [open, setOpen] = useState(false);
  const save = async (form) => {
    try {
      await api.post("/api/admin/dining-rooms", form);
      onSaved();
      setOpen(false);
      toast.success("Room created");
    } catch (err) {
      toast.error(extractError(err));
    }
  };
  return (
    <>
      <button style={os.primaryBtn} onClick={() => setOpen(true)}>
        + New Room
      </button>
      {open && (
        <EditModal title="New Room" onClose={() => setOpen(false)}>
          <RoomEditForm room={{}} onSave={save} />
        </EditModal>
      )}
    </>
  );
}

// ── MENU ──────────────────────────────────────────────────────────────────────

function MenuTable({ rows, onRefresh, onDelete }) {
  const [editing, setEditing] = useState(null);

  const save = async (id, patch) => {
    try {
      if (id) {
        await api.patch(`/api/admin/menu-items/${id}`, patch);
      } else {
        await api.post("/api/admin/menu-items", patch);
      }
      onRefresh();
      setEditing(null);
      toast.success("Saved");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const toggle = async (id, is_active) => {
    try {
      await api.patch(`/api/admin/menu-items/${id}`, { is_active });
      onRefresh();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <>
      {editing && (
        <EditModal
          title={editing.id ? `Item #${editing.id}` : "New Item"}
          onClose={() => setEditing(null)}
        >
          <MenuEditForm
            item={editing}
            onSave={(patch) => save(editing.id, patch)}
          />
        </EditModal>
      )}
      <div style={os.tableWrap}>
        <table style={os.table}>
          <thead>
            <tr>
              {["ID", "Name", "Price", "Active", "Dietary", "Actions"].map(
                (h) => (
                  <th key={h} style={os.th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={os.tr}>
                <td style={os.td}>
                  <span style={os.dimText}>#{r.id}</span>
                </td>
                <td style={os.td}>{r.name}</td>
                <td style={os.td}>
                  ${((r.price_cents || 0) / 100).toFixed(2)}
                </td>
                <td style={os.td}>
                  <button
                    onClick={() => toggle(r.id, !r.is_active)}
                    style={{
                      ...os.toggleBtn,
                      background: r.is_active ? "#2e7d32" : "#555",
                      color: "#fff",
                    }}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td style={{ ...os.td, fontSize: "10px", maxWidth: "200px" }}>
                  {(r.dietary_restrictions || []).join(", ") || "—"}
                </td>
                <td style={os.td}>
                  <div style={os.actions}>
                    <button style={os.editBtn} onClick={() => setEditing(r)}>
                      Edit
                    </button>
                    <button style={os.deleteBtn} onClick={() => onDelete(r.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p style={os.empty}>No menu items.</p>}
    </>
  );
}

function MenuEditForm({ item, onSave }) {
  const [form, setForm] = useState({
    name: item.name || "",
    description: item.description || "",
    price_cents: item.price_cents || 0,
    is_active: item.is_active ?? true,
    dietary_restrictions: item.dietary_restrictions || [],
  });
  const toggleDiet = (val) =>
    setForm((f) => ({
      ...f,
      dietary_restrictions: f.dietary_restrictions.includes(val)
        ? f.dietary_restrictions.filter((d) => d !== val)
        : [...f.dietary_restrictions, val],
    }));
  return (
    <div style={os.formStack}>
      <div style={os.formField}>
        <label style={os.label}>Name</label>
        <input
          style={os.input}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div style={os.formField}>
        <label style={os.label}>Description</label>
        <textarea
          style={os.textarea}
          rows={2}
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
      </div>
      <div style={os.formField}>
        <label style={os.label}>Price (cents)</label>
        <input
          style={os.input}
          type="number"
          value={form.price_cents}
          min={0}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              price_cents: parseInt(e.target.value) || 0,
            }))
          }
        />
        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
          ${(form.price_cents / 100).toFixed(2)}
        </div>
      </div>
      <label
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          fontSize: "13px",
          color: "#ccc",
        }}
      >
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) =>
            setForm((f) => ({ ...f, is_active: e.target.checked }))
          }
        />
        Active
      </label>
      <div>
        <div style={os.label}>Dietary</div>
        <div style={os.chipGrid}>
          {DIETARY_OPTIONS.map((opt) => {
            const on = form.dietary_restrictions.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleDiet(opt)}
                style={{
                  ...os.chip,
                  background: on ? "#c8783c" : "#1a1a18",
                  color: on ? "#fff" : "#aaa",
                  borderColor: on ? "#c8783c" : "#444",
                }}
              >
                {opt.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>
      <button style={os.primaryBtn} onClick={() => onSave(form)}>
        Save
      </button>
    </div>
  );
}

function NewMenuItemBtn({ onSaved }) {
  const [open, setOpen] = useState(false);
  const save = async (form) => {
    try {
      await api.post("/api/admin/menu-items", form);
      onSaved();
      setOpen(false);
      toast.success("Item created");
    } catch (err) {
      toast.error(extractError(err));
    }
  };
  return (
    <>
      <button style={os.primaryBtn} onClick={() => setOpen(true)}>
        + New Item
      </button>
      {open && (
        <EditModal title="New Menu Item" onClose={() => setOpen(false)}>
          <MenuEditForm item={{}} onSave={save} />
        </EditModal>
      )}
    </>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const os = {
  root: {
    display: "flex",
    height: "100vh", // Lock the root to the screen height
    width: "100vw",
    overflow: "hidden", // Prevent the body from scrolling
    background: "#0d0d0b",
    color: "#e8e8e4",
    fontFamily: "inherit",
  },
  sidebar: {
    width: "200px",
    flexShrink: 0,
    borderRight: "2px solid #2a2a26",
    background: "#080806",
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
    gap: "2px",
    overflowY: "auto", // Sidebar can scroll if many tabs are added
  },
  sidebarTitle: {
    color: "#e8e8e4",
    fontFamily: "Playfair Display, serif",
    fontSize: "16px",
    fontWeight: 900,
    padding: "0 20px 20px",
    letterSpacing: "0.05em",
  },
  sidebarBtn: {
    background: "none",
    border: "none",
    boxShadow: "none",
    color: "#666",
    padding: "10px 20px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    cursor: "pointer",
    textAlign: "left",
    borderLeft: "3px solid transparent",
    transition: "all 0.1s",
  },
  sidebarActive: {
    color: "#e8e8e4",
    borderLeft: "3px solid #c8783c",
    background: "rgba(200,120,60,0.1)",
  },
  main: {
    flex: 1,
    height: "100%", // Fill the available height in the flex container
    overflowY: "auto", // Enable the scrollbar here
    padding: "32px",
    background: "#0d0d0b",
    scrollbarWidth: "thin",
    scrollbarColor: "#3a3a36 transparent",
  },
  mainHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  mainTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "24px",
    fontWeight: 900,
    margin: 0,
    color: "#e8e8e4",
  },
  tableWrap: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    color: "#e8e8e4",
  },
  th: {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#666",
    borderBottom: "2px solid #2a2a26",
    whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #1e1e1a" },
  td: { padding: "10px 12px", verticalAlign: "middle", color: "#e8e8e4" },
  dimText: { color: "#555" },
  empty: { color: "#555", padding: "20px 0" },
  actions: { display: "flex", gap: "6px" },
  editBtn: {
    padding: "3px 10px",
    fontSize: "11px",
    fontWeight: 700,
    background: "#1e1e1a",
    border: "1.5px solid #3a3a36",
    borderRadius: "2px",
    cursor: "pointer",
    color: "#e8e8e4",
    boxShadow: "none",
  },
  deleteBtn: {
    padding: "3px 10px",
    fontSize: "11px",
    fontWeight: 700,
    background: "transparent",
    border: "1.5px solid #8b2020",
    borderRadius: "2px",
    cursor: "pointer",
    color: "#e05555",
    boxShadow: "none",
  },
  toggleBtn: {
    padding: "3px 10px",
    fontSize: "10px",
    fontWeight: 700,
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    boxShadow: "none",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  ghostBtn: {
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 700,
    background: "transparent",
    border: "1.5px solid #3a3a36",
    borderRadius: "2px",
    cursor: "pointer",
    color: "#aaa",
    boxShadow: "none",
  },
  primaryBtn: {
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    background: "#c8783c",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    color: "#fff",
    boxShadow: "none",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "flex-start", // Change to flex-start so long modals can be scrolled
    justifyContent: "center",
    zIndex: 1000,
    overflowY: "auto", // The overlay becomes the scrollable container for the modal
    padding: "40px 20px",
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#141412",
    border: "2px solid #2a2a26",
    borderRadius: "4px",
    padding: "28px",
    width: "480px",
    maxWidth: "90vw",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    color: "#e8e8e4",
    marginBottom: "40px", // Extra space so the bottom isn't cut off
  },
  modalTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "20px",
    fontWeight: 900,
    color: "#e8e8e4",
  },
  iconBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: "#666",
    padding: 0,
    boxShadow: "none",
  },
  formStack: { display: "flex", flexDirection: "column", gap: "12px" },
  formField: { display: "flex", flexDirection: "column", gap: "4px" },
  label: {
    fontSize: "10px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#666",
    marginBottom: "4px",
  },
  input: {
    background: "#1e1e1a",
    border: "1.5px solid #3a3a36",
    borderRadius: "2px",
    color: "#e8e8e4",
    padding: "8px 10px",
    fontSize: "13px",
    outline: "none",
  },
  textarea: {
    background: "#1e1e1a",
    border: "1.5px solid #3a3a36",
    borderRadius: "2px",
    color: "#e8e8e4",
    padding: "8px 10px",
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
  },
  accentBtn: {
    padding: "3px 10px",
    fontSize: "11px",
    fontWeight: 700,
    background: "#c8783c",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    color: "#fff",
    boxShadow: "none",
  },
  detailSection: {
    borderTop: "1px solid #2a2a26",
    paddingTop: "20px",
    marginTop: "20px",
  },
  detailSectionTitle: {
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#c8783c",
    marginBottom: "14px",
  },
  msgRow: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    padding: "10px 12px",
    background: "#1a1a18",
    borderRadius: "2px",
    borderLeft: "3px solid #2a2a26",
  },
  attendeeRow: {
    padding: "12px",
    background: "#1a1a18",
    borderRadius: "2px",
    marginBottom: "8px",
  },
  chipGrid: { display: "flex", flexWrap: "wrap", gap: "6px" },
  chip: {
    padding: "3px 10px",
    fontSize: "10px",
    fontWeight: 700,
    border: "1.5px solid",
    borderRadius: "2px",
    cursor: "pointer",
    boxShadow: "none",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    transition: "all 0.1s",
  },
};
