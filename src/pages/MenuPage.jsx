// src/pages/MenuPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const DIETARY_LABELS = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  gluten_free: "GF",
  dairy_free: "DF",
  nut_allergy: "No Nuts",
  peanut_allergy: "No Peanuts",
  shellfish_allergy: "No Shellfish",
  fish_allergy: "No Fish",
  egg_free: "Egg Free",
  soy_free: "Soy Free",
  halal: "Halal",
  kosher: "Kosher",
  sesame_allergy: "No Sesame",
};

const SECTION_ORDER = [
  "starters",
  "salads",
  "addons",
  "mains",
  "hotdogs",
  "sides",
  "kids",
  "desserts",
  "drinks",
  "other",
];

const SECTION_TITLES = {
  starters: "Starters",
  salads: "Salads & Bowls",
  addons: "Add-ons",
  mains: "Sandwiches & Grill",
  hotdogs: "Hot Dogs",
  sides: "Sides",
  kids: "Kids",
  desserts: "Desserts",
  drinks: "Beverages",
  other: "More",
};

function getSectionKey(name = "") {
  const n = name.toLowerCase().trim();
  if (n.startsWith("add ")) return "addons";
  if (n.includes("kids")) return "kids";
  if (
    n.includes("cheese board") ||
    n.includes("burrata") ||
    n.includes("pretzel") ||
    n.includes("mezze")
  )
    return "starters";
  if (n.includes("salad") || n.includes("bowl")) return "salads";
  if (n.includes("hot dog")) return "hotdogs";
  if (
    n.includes("cake") ||
    n.includes("blond") ||
    n.includes("churro") ||
    n.includes("brownie") ||
    n.includes("cookie") ||
    n.includes("ice cream") ||
    n.includes("sundae") ||
    n.includes("popsicle")
  )
    return "desserts";
  if (
    n.includes("lemonade") ||
    n.includes("iced tea") ||
    n.includes("arnold") ||
    n.includes("water")
  )
    return "drinks";
  if (
    n.includes("potato") ||
    n.includes("chips") ||
    n.includes("vegetable") ||
    n.includes("fries") ||
    n.includes("rings")
  )
    return "sides";
  if (
    n.includes("sandwich") ||
    n.includes("club") ||
    n.includes("burger") ||
    n.includes("lobster roll") ||
    n.includes("flatbread") ||
    n.includes("strip steak") ||
    n.includes("quesadilla") ||
    n.includes("chicken salad")
  )
    return "mains";
  return "other";
}

export function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/menu-items")
      .then((data) => setItems((data || []).filter((i) => i.is_active)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  const grouped = useMemo(() => {
    const acc = {};
    for (const item of items) {
      const key = getSectionKey(item?.name || "");
      (acc[key] ||= []).push(item);
    }
    for (const key of Object.keys(acc)) {
      acc[key].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    }
    return acc;
  }, [items]);

  const visibleSections = SECTION_ORDER.filter(
    (k) => (grouped[k] || []).length > 0,
  );

  const handleTextMenu = () => {
    const text = visibleSections
      .map((k) => {
        const sectionHeader = `--- ${SECTION_TITLES[k].toUpperCase()} ---`;
        const sectionItems = grouped[k]
          .map((i) => `${i.name}: ${formatPrice(i.price_cents)}`)
          .join("\n");
        return `${sectionHeader}\n${sectionItems}`;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text);
    alert("Menu copied to clipboard!");
  };

  return (
    <div style={s.root}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.club}>Abeyton Lodge</div>
          <h1 style={s.title}>Menu</h1>
          <p style={s.subtitle}>Seasonal selections prepared daily.</p>

          {/* BRUTALIST ORANGE BUTTON */}
          <button onClick={handleTextMenu} style={s.brutalistBtn}>
            Text Menu
          </button>
        </div>

        {loading && <p style={s.muted}>Loading menu...</p>}

        {!loading && items.length > 0 && (
          <div style={s.list}>
            {visibleSections.map((k) => (
              <div key={k} style={s.section}>
                <div style={s.sectionTitle}>{SECTION_TITLES[k] || k}</div>
                {(grouped[k] || []).map((item) => (
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
            ))}
          </div>
        )}
        <div style={s.footer}>Menu items and prices subject to change.</div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#faf9f6", padding: "40px 20px" },
  container: { maxWidth: "600px", margin: "0 auto" },
  header: {
    textAlign: "center",
    marginBottom: "40px",
    paddingBottom: "28px",
    borderBottom: "2px solid #e8e4dc",
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
  subtitle: { fontSize: "14px", color: "#666", margin: "0 0 20px" },

  // Brutalist Orange Button
  brutalistBtn: {
    background: "#ff5f1f", // International Orange
    color: "white",
    border: "3px solid #1a1a18",
    padding: "10px 24px",
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    cursor: "pointer",
    boxShadow: "4px 4px 0 #1a1a18",
    transition: "transform 0.1s",
    outline: "none",
  },

  list: { display: "flex", flexDirection: "column" },
  section: { marginBottom: "18px" },
  sectionTitle: {
    fontFamily: "Playfair Display, serif",
    fontSize: "15px",
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#2b2b2b",
    padding: "10px 0",
    borderBottom: "1px solid #e8e4dc",
    marginTop: "10px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "18px 0",
    borderBottom: "1px solid #ece9e0",
    gap: "16px",
  },
  itemLeft: { flex: 1 },
  itemName: {
    fontFamily: "Playfair Display, serif",
    fontSize: "17px",
    fontWeight: 700,
    color: "#1a1a18",
    marginBottom: "4px",
  },
  itemDesc: {
    fontSize: "13px",
    color: "#555",
    lineHeight: 1.5,
    marginBottom: "6px",
  },
  tags: { display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" },
  tag: {
    fontSize: "9px",
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "2px 7px",
    border: "1px solid #c8d8b8",
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
  },
  muted: { color: "#666", textAlign: "center", padding: "40px 0" },
  footer: {
    textAlign: "center",
    fontSize: "11px",
    color: "#888",
    marginTop: "40px",
    paddingTop: "24px",
    borderTop: "1px solid #ece9e0",
  },
};
