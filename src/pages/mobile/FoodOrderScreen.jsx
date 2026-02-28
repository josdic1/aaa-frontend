// src/pages/mobile/FoodOrderScreen.jsx
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { api } from "../../utils/api";
import { useData } from "../../hooks/useData";
import { SubNav } from "./shared/SubNav";

const CATS = ["All", "Starters", "Mains", "Dessert", "Drinks"];

// Map menu_item category to our display categories
const catMap = (c) => {
  if (!c) return "All";
  const lc = c.toLowerCase();
  if (lc.includes("start") || lc.includes("app")) return "Starters";
  if (lc.includes("main") || lc.includes("entr")) return "Mains";
  if (lc.includes("des") || lc.includes("sweet")) return "Dessert";
  if (
    lc.includes("drink") ||
    lc.includes("bev") ||
    lc.includes("wine") ||
    lc.includes("cocktail")
  )
    return "Drinks";
  return "Mains";
};

export function FoodOrderScreen({ onBack }) {
  const { menuItems, reservations } = useData();
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState({}); // { menuItemId: quantity }
  const [reservationId, setReservationId] = useState("");
  const [placing, setPlacing] = useState(false);

  const filtered = useMemo(() => {
    if (!menuItems) return [];
    return menuItems.filter((item) => {
      if (cat === "All") return true;
      return catMap(item.category) === cat;
    });
  }, [menuItems, cat]);

  const addItem = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeItem = (id) =>
    setCart((c) => {
      const next = { ...c };
      if (next[id] > 1) next[id]--;
      else delete next[id];
      return next;
    });

  const total = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menuItems?.find((m) => m.id === parseInt(id));
      return sum + (item?.price || 0) * qty;
    }, 0);
  }, [cart, menuItems]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Only show active reservations for linking
  const activeRes = useMemo(() => {
    return (reservations || []).filter((r) => r.status !== "cancelled");
  }, [reservations]);

  const placeOrder = async () => {
    if (!reservationId) {
      toast.error("Select a reservation first");
      return;
    }
    if (cartCount === 0) {
      toast.error("Add items to your order");
      return;
    }
    setPlacing(true);
    try {
      // 1. Create order linked to reservation (via attendee — use first attendee or create standalone)
      // We'll need to get attendees for this reservation
      const resData = await api.get(`/api/reservations/${reservationId}`);
      const attendeeId = resData.attendees?.[0]?.id;

      if (!attendeeId) {
        toast.error("No attendees on this reservation. Add attendees first.");
        setPlacing(false);
        return;
      }

      const order = await api.post("/api/orders/", {
        attendee_id: attendeeId,
        status: "open",
      });

      // 2. Add each item
      await Promise.all(
        Object.entries(cart).map(([itemId, qty]) =>
          api.post("/api/order-items/", {
            order_id: order.id,
            menu_item_id: parseInt(itemId),
            quantity: qty,
          }),
        ),
      );

      toast.success("Order placed successfully");
      setCart({});
      setReservationId("");
    } catch (err) {
      const msg = Array.isArray(err?.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err?.detail || "Failed to place order";
      toast.error(msg);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <SubNav
          onBack={onBack}
          eyebrow={null}
          title={null}
          backColor="rgba(0,0,0,0.4)"
          borderColor="transparent"
          noPad
        />
        <div style={s.brand}>Abeyton Lodge · Tonight</div>
        <div style={s.title}>Menu</div>
      </div>

      {/* Categories */}
      <div style={s.cats}>
        {CATS.map((c) => (
          <button
            key={c}
            style={{ ...s.catBtn, ...(cat === c ? s.catBtnActive : {}) }}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={s.items}>
        {filtered.length === 0 && (
          <div style={s.empty}>No items in this category.</div>
        )}
        {filtered.map((item, i) => {
          const qty = cart[item.id] || 0;
          return (
            <div
              key={item.id}
              style={{ ...s.item, animationDelay: `${i * 0.04}s` }}
            >
              <div style={s.itemNo}>{String(i + 1).padStart(2, "0")}</div>
              <div style={s.itemInfo}>
                <div style={s.itemName}>{item.name}</div>
                {item.description && (
                  <div style={s.itemDesc}>{item.description}</div>
                )}
              </div>
              <div style={s.itemRight}>
                <div style={s.itemPrice}>
                  {item.price != null
                    ? `$${Number(item.price).toFixed(2)}`
                    : "—"}
                </div>
                <div style={s.itemControls}>
                  {qty > 0 && (
                    <>
                      <button
                        style={s.qtyBtn}
                        onClick={() => removeItem(item.id)}
                      >
                        −
                      </button>
                      <span style={s.qtyNum}>{qty}</span>
                    </>
                  )}
                  <button style={s.addBtn} onClick={() => addItem(item.id)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Reservation selector (only shows when cart has items) */}
        {cartCount > 0 && (
          <div style={s.resSelector}>
            <div style={s.resSelectorLabel}>Link to reservation</div>
            <select
              style={s.resSelect}
              value={reservationId}
              onChange={(e) => setReservationId(e.target.value)}
            >
              <option value="">Select reservation...</option>
              {activeRes.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} · {r.member?.name || `Member #${r.member_id}`} ·{" "}
                  {r.date}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Order bar */}
      <div style={{ ...s.orderBar, opacity: cartCount === 0 ? 0.5 : 1 }}>
        <div style={s.orderLabel}>
          {cartCount > 0
            ? `Place Order (${cartCount} item${cartCount > 1 ? "s" : ""})`
            : "Add items to order"}
        </div>
        <button
          style={{ ...s.orderBtn, opacity: placing ? 0.6 : 1 }}
          onClick={placeOrder}
          disabled={placing || cartCount === 0}
        >
          {placing ? "..." : `$${total.toFixed(2)} →`}
        </button>
      </div>
    </div>
  );
}

const s = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#fff",
  },
  header: {
    padding: "52px 24px 18px",
    borderBottom: "2px solid #000",
    flexShrink: 0,
  },
  brand: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#000",
    marginBottom: 2,
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: 26,
    fontWeight: 700,
    color: "#000",
    letterSpacing: "-0.01em",
  },
  cats: {
    display: "flex",
    borderBottom: "2px solid #000",
    overflowX: "auto",
    flexShrink: 0,
  },
  catBtn: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "11px 16px",
    border: "none",
    borderRight: "1px solid rgba(0,0,0,0.1)",
    background: "#fff",
    color: "rgba(0,0,0,0.35)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  catBtnActive: { background: "#000", color: "#fff" },
  items: {
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 80,
  },
  empty: {
    padding: "24px",
    color: "rgba(0,0,0,0.35)",
    fontSize: 13,
    fontStyle: "italic",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "18px 24px",
    borderBottom: "1px solid rgba(0,0,0,0.07)",
    cursor: "pointer",
    animation: "riseIn 0.35s ease both",
  },
  itemNo: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "rgba(0,0,0,0.18)",
    width: 22,
    flexShrink: 0,
  },
  itemInfo: { flex: 1, padding: "0 12px" },
  itemName: { fontSize: 15, fontWeight: 600, color: "#000", marginBottom: 2 },
  itemDesc: { fontSize: 11, color: "rgba(0,0,0,0.4)" },
  itemRight: { textAlign: "right", flexShrink: 0 },
  itemPrice: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
    fontWeight: 500,
    color: "#000",
    marginBottom: 4,
  },
  itemControls: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  qtyBtn: {
    width: 24,
    height: 24,
    background: "#000",
    color: "#fff",
    border: "none",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  qtyNum: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    fontWeight: 500,
    minWidth: 16,
    textAlign: "center",
  },
  addBtn: {
    width: 24,
    height: 24,
    background: "none",
    border: "1.5px solid rgba(0,0,0,0.3)",
    color: "#000",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    transition: "all 0.12s",
  },
  resSelector: {
    padding: "16px 24px",
    background: "rgba(0,0,0,0.02)",
    borderTop: "1px solid rgba(0,0,0,0.08)",
  },
  resSelectorLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 8,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(0,0,0,0.4)",
    marginBottom: 8,
  },
  resSelect: {
    width: "100%",
    padding: "10px 12px",
    border: "2px solid #000",
    background: "#fff",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    outline: "none",
    borderRadius: 0,
    boxSizing: "border-box",
  },
  orderBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#000",
    color: "#fff",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  orderLabel: {
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: 600,
  },
  orderBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
    padding: "6px 14px",
    cursor: "pointer",
  },
};
