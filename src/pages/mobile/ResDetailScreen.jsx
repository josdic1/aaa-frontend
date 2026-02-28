// src/pages/mobile/ResDetailScreen.jsx
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../../utils/api";
import { useAuth } from "../../hooks/useAuth";
import { SubNav } from "./shared/SubNav";

export function ResDetailScreen({ onBack, reservationId, onAddFood }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // overview | messages | order
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!reservationId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/reservations/${reservationId}`);
      setData(res);
    } catch {
      toast.error("Could not load reservation");
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    load();
  }, [load]);

  const sendMessage = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await api.post("/api/messages/", {
        reservation_id: reservationId,
        body: msg.trim(),
      });
      setMsg("");
      load();
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading || !data) {
    return (
      <div
        style={{ ...s.root, alignItems: "center", justifyContent: "center" }}
      >
        <div style={s.loadText}>Loading...</div>
      </div>
    );
  }

  const r = data;
  const memberName = r.member?.name || `Member #${r.member_id}`;
  const hasOrder = r.orders?.length > 0;
  const statusColor =
    {
      confirmed: "rgba(74,222,128,0.7)",
      draft: "rgba(250,204,21,0.7)",
      cancelled: "rgba(248,113,113,0.7)",
    }[r.status] || "#888";

  return (
    <div style={s.root}>
      <SubNav
        onBack={onBack}
        eyebrow={`Reservation #${r.id}`}
        title={memberName}
        eyebrowColor="var(--muted, #888)"
        titleColor="var(--accent, #1a1a1a)"
        backColor="rgba(26,26,26,0.45)"
        borderColor="rgba(26,26,26,0.08)"
      />

      {/* Status strip */}
      <div style={s.strip}>
        <div style={{ ...s.statusDot, background: statusColor }} />
        <div style={s.stripText}>{(r.status || "draft").toUpperCase()}</div>
        <div style={s.stripSep}>·</div>
        <div style={s.stripText}>{r.date || "—"}</div>
        <div style={s.stripSep}>·</div>
        <div style={s.stripText}>{(r.meal_type || "dinner").toUpperCase()}</div>
        {r.party_size && (
          <>
            <div style={s.stripSep}>·</div>
            <div style={s.stripText}>{r.party_size} PAX</div>
          </>
        )}
      </div>

      {/* No order warning banner */}
      {!hasOrder && r.status !== "cancelled" && (
        <button style={s.orderBanner} onClick={onAddFood}>
          <span style={s.bannerIcon}>⚠</span>
          <span style={s.bannerText}>No food order — tap to place one</span>
          <span style={s.bannerArrow}>→</span>
        </button>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        {["overview", "messages", "order"].map((t) => (
          <button
            key={t}
            style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
            {t === "messages" && r.messages?.length > 0 && (
              <span style={s.badge}>{r.messages.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: OVERVIEW */}
      {tab === "overview" && (
        <div style={s.scroll}>
          {/* Attendees */}
          <Section title="Attendees">
            {!r.attendees || r.attendees.length === 0 ? (
              <div style={s.emptySection}>No attendees recorded</div>
            ) : (
              r.attendees.map((a) => (
                <div key={a.id} style={s.attendeeRow}>
                  <div style={s.attendeeName}>
                    {a.member?.name || a.guest_name || `Guest #${a.id}`}
                  </div>
                  {a.dietary_restrictions?.length > 0 && (
                    <div style={s.dietTag}>
                      {a.dietary_restrictions.join(", ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </Section>

          {/* Dining room */}
          {r.dining_room && (
            <Section title="Room">
              <div style={s.infoRow}>
                <span style={s.infoLabel}>Room</span>
                <span style={s.infoVal}>{r.dining_room.name}</span>
              </div>
              {r.dining_room.capacity && (
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>Capacity</span>
                  <span style={s.infoVal}>{r.dining_room.capacity}</span>
                </div>
              )}
            </Section>
          )}

          {/* Notes */}
          {r.notes && (
            <Section title="Notes">
              <p style={s.notes}>{r.notes}</p>
            </Section>
          )}
        </div>
      )}

      {/* Tab: MESSAGES */}
      {tab === "messages" && (
        <div style={s.messagesWrap}>
          <div style={s.messageList}>
            {(!r.messages || r.messages.length === 0) && (
              <div style={s.emptySection}>No messages yet.</div>
            )}
            {(r.messages || []).map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  style={{
                    ...s.bubble,
                    ...(mine ? s.bubbleMine : s.bubbleTheirs),
                  }}
                >
                  {!mine && (
                    <div style={s.bubbleSender}>
                      {m.sender?.email || "Staff"}
                    </div>
                  )}
                  <div style={s.bubbleBody}>{m.body}</div>
                  <div style={s.bubbleTime}>
                    {m.created_at
                      ? new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={s.msgInputWrap}>
            <input
              style={s.msgInput}
              placeholder="Type a message..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              style={{ ...s.sendBtn, opacity: sending ? 0.6 : 1 }}
              onClick={sendMessage}
              disabled={sending}
            >
              {sending ? "..." : "→"}
            </button>
          </div>
        </div>
      )}

      {/* Tab: ORDER */}
      {tab === "order" && (
        <div style={s.scroll}>
          {!hasOrder ? (
            <div style={{ padding: 24 }}>
              <div style={s.emptySection}>No order placed yet.</div>
              <button style={s.placeOrderBtn} onClick={onAddFood}>
                Open Menu & Place Order
              </button>
            </div>
          ) : (
            (r.orders || []).map((order) => (
              <Section
                key={order.id}
                title={`Order #${order.id} · ${(order.status || "open").toUpperCase()}`}
              >
                {(order.order_items || []).map((item) => (
                  <div key={item.id} style={s.orderItemRow}>
                    <div style={s.orderItemName}>
                      {item.menu_item?.name || `Item #${item.menu_item_id}`}
                    </div>
                    <div style={s.orderItemRight}>
                      <span style={s.orderItemQty}>×{item.quantity || 1}</span>
                      {item.menu_item?.price && (
                        <span style={s.orderItemPrice}>
                          ${item.menu_item.price}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(order.order_items || []).length === 0 && (
                  <div style={s.emptySection}>
                    Order exists but no items added.
                  </div>
                )}
              </Section>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted, #888)",
          marginBottom: 10,
          padding: "0 24px",
        }}
      >
        {title}
      </div>
      <div style={{ padding: "0 24px" }}>{children}</div>
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#FAF7F0",
  },
  loadText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: "var(--muted, #888)",
  },
  strip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 24px",
    background: "rgba(26,26,26,0.04)",
    borderBottom: "1px solid rgba(26,26,26,0.07)",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  statusDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  stripText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.1em",
    color: "rgba(26,26,26,0.5)",
  },
  stripSep: { color: "rgba(26,26,26,0.2)", fontSize: 9 },
  orderBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 24px",
    background: "rgba(250,204,21,0.1)",
    borderBottom: "1px solid rgba(250,204,21,0.2)",
    border: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    flexShrink: 0,
  },
  bannerIcon: { fontSize: 14 },
  bannerText: { flex: 1, fontSize: 12, fontWeight: 600, color: "#92700a" },
  bannerArrow: { fontSize: 14, color: "#92700a" },
  tabs: {
    display: "flex",
    borderBottom: "2px solid rgba(26,26,26,0.1)",
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: "12px 8px",
    background: "none",
    border: "none",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    letterSpacing: "0.12em",
    color: "rgba(26,26,26,0.4)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    transition: "all 0.15s",
  },
  tabActive: {
    color: "var(--accent, #1a1a1a)",
    borderBottom: "2px solid var(--accent, #1a1a1a)",
    marginBottom: -2,
  },
  badge: {
    background: "var(--accent, #1a1a1a)",
    color: "#fff",
    fontSize: 8,
    padding: "1px 5px",
    borderRadius: 10,
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingTop: 20,
  },
  emptySection: {
    fontSize: 12,
    color: "var(--muted, #888)",
    fontStyle: "italic",
    paddingBottom: 8,
  },
  attendeeRow: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottom: "1px solid rgba(26,26,26,0.07)",
  },
  attendeeName: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 3,
    color: "var(--text, #1a1a1a)",
  },
  dietTag: {
    display: "inline-block",
    fontSize: 10,
    color: "#92700a",
    background: "rgba(250,204,21,0.1)",
    border: "1px solid rgba(250,204,21,0.3)",
    padding: "2px 7px",
    borderRadius: 2,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid rgba(26,26,26,0.06)",
  },
  infoLabel: { fontSize: 12, color: "var(--muted, #888)" },
  infoVal: { fontSize: 12, fontWeight: 600, color: "var(--text, #1a1a1a)" },
  notes: {
    fontSize: 13,
    color: "var(--text, #1a1a1a)",
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  // messages
  messagesWrap: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  bubble: {
    maxWidth: "78%",
    padding: "9px 12px",
    borderRadius: 12,
  },
  bubbleMine: {
    background: "var(--accent, #1a1a1a)",
    color: "#fff",
    alignSelf: "flex-end",
    borderBottomRightRadius: 3,
  },
  bubbleTheirs: {
    background: "#fff",
    border: "1px solid rgba(26,26,26,0.1)",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 3,
  },
  bubbleSender: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.06em",
    marginBottom: 3,
    opacity: 0.55,
  },
  bubbleBody: { fontSize: 13, lineHeight: 1.4 },
  bubbleTime: { fontSize: 9, opacity: 0.4, marginTop: 4, textAlign: "right" },
  msgInputWrap: {
    display: "flex",
    borderTop: "1px solid rgba(26,26,26,0.1)",
    flexShrink: 0,
  },
  msgInput: {
    flex: 1,
    padding: "14px 16px",
    border: "none",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  sendBtn: {
    padding: "14px 20px",
    background: "var(--accent, #1a1a1a)",
    color: "#fff",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
  },

  // order tab
  orderItemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid rgba(26,26,26,0.06)",
  },
  orderItemName: { fontSize: 14, fontWeight: 500 },
  orderItemRight: { display: "flex", gap: 10, alignItems: "center" },
  orderItemQty: { fontSize: 12, color: "var(--muted, #888)" },
  orderItemPrice: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    fontWeight: 500,
  },
  placeOrderBtn: {
    marginTop: 16,
    width: "100%",
    padding: 14,
    background: "var(--accent, #1a1a1a)",
    color: "#fff",
    border: "2px solid var(--border, #1a1a1a)",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "2px 2px 0 var(--border, #1a1a1a)",
  },
};
