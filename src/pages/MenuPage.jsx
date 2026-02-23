// src/pages/MenuPage.jsx
// Public route — no auth required
// Shows only active menu items, read-only, no ordering controls

import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const DIETARY_LABELS = {
  vegan:             "Vegan",
  vegetarian:        "Vegetarian",
  gluten_free:       "GF",
  dairy_free:        "DF",
  nut_allergy:       "No Nuts",
  peanut_allergy:    "No Peanuts",
  shellfish_allergy: "No Shellfish",
  fish_allergy:      "No Fish",
  egg_free:          "Egg Free",
  soy_free:          "Soy Free",
  halal:             "Halal",
  kosher:            "Kosher",
  sesame_allergy:    "No Sesame",
};

export function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/menu-items`)
      .then((r) => r.json())
      .then((data) => {
        // active items only, sorted by name
        setItems(data.filter((i) => i.is_active).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  return (
    <div style={s.root}>
      <div style={s.container}>

        {/* HEADER */}
        <div style={s.header}>
          <div style={s.club}>Abeyton Lodge</div>
          <h1 style={s.title}>Menu</h1>
          <p style={s.subtitle}>
            Seasonal selections prepared daily.
          </p>
        </div>

        {loading && <p style={s.muted}>Loading menu...</p>}

        {!loading && items.length === 0 && (
          <p style={s.muted}>Menu not available.</p>
        )}

        {/* ITEMS */}
        <div style={s.list}>
          {items.map((item) => (
            <div key={item.id} style={s.item}>
              <div style={s.itemLeft}>
                <div style={s.itemName}>{item.name}</div>
                {item.description && (
                  <div style={s.itemDesc}>{item.description}</div>
                )}
                {(item.dietary_restrictions || []).length > 0 && (
                  <div style={s.tags}>
                    {item.dietary_restrictions.map((d) => (
                      <span key={d} style={s.tag}>
                        {DIETARY_LABELS[d] || d.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={s.price}>{formatPrice(item.price_cents)}</div>
            </div>
          ))}
        </div>

        <div style={s.footer}>
          Menu items and prices subject to change.
        </div>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background: "#faf9f6",
    padding: "40px 20px",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "48px",
    paddingBottom: "32px",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "#e8e4dc",
  },
  club: {
    fontFamily: "Playfair Display, serif",
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    color: "#c8783c",
    marginBottom: "12px",
  },
  title: {
    fontFamily: "Playfair Display, serif",
    fontSize: "42px",
    fontWeight: 900,
    margin: "0 0 12px",
    color: "#1a1a18",
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 0",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "#ece9e0",
    gap: "16px",
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontFamily: "Playfair Display, serif",
    fontSize: "17px",
    fontWeight: 700,
    color: "#1a1a18",
    marginBottom: "4px",
  },
  itemDesc: {
    fontSize: "13px",
    color: "#777",
    lineHeight: 1.5,
    marginBottom: "6px",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    marginTop: "6px",
  },
  tag: {
    fontSize: "9px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    padding: "2px 7px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#c8d8b8",
    color: "#4a7c3f",
    borderRadius: "2px",
    background: "#f0f7ec",
  },
  price: {
    fontFamily: "Playfair Display, serif",
    fontSize: "17px",
    fontWeight: 900,
    color: "#1a1a18",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  muted: {
    color: "#888",
    textAlign: "center",
    padding: "40px 0",
  },
  footer: {
    textAlign: "center",
    fontSize: "11px",
    color: "#aaa",
    marginTop: "48px",
    paddingTop: "24px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "#ece9e0",
  },
};