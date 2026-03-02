// src/pages/MenuPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import {
  getSectionKey,
  groupMenuItems,
  SECTION_ORDER,
  SECTION_TITLES,
} from "../utils/menuSections";

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

export function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("all");

  useEffect(() => {
    api
      .get("/api/menu-items")
      .then((data) => setItems((data || []).filter((i) => i.is_active)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  const grouped = useMemo(() => groupMenuItems(items), [items]);
  const visibleSections = SECTION_ORDER.filter(
    (k) => (grouped[k] || []).length > 0,
  );
  const sectionsToShow =
    activeSection === "all"
      ? visibleSections
      : visibleSections.filter((k) => k === activeSection);

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

    const messageBody = `Abeyton Lodge Menu:\n\n${text}`;
    window.location.href = `sms:?body=${encodeURIComponent(messageBody)}`;
  };

  return (
    <div style={s.root}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.club}>Abeyton Lodge</div>
          <h1 style={s.title}>Menu</h1>
          <p style={s.subtitle}>Seasonal selections prepared daily.</p>
          <button onClick={handleTextMenu} style={s.brutalistBtn}>
            Text Menu
          </button>
        </div>

        {loading && <p style={s.muted}>Loading menu...</p>}

        {!loading && visibleSections.length > 0 && (
          <div style={s.tabStrip}>
            <button
              style={{
                ...s.tabBtn,
                ...(activeSection === "all" ? s.tabBtnActive : {}),
              }}
              onClick={() => setActiveSection("all")}
            >
              All
            </button>
            {visibleSections.map((k) => (
              <button
                key={k}
                style={{
                  ...s.tabBtn,
                  ...(activeSection === k ? s.tabBtnActive : {}),
                }}
                onClick={() => setActiveSection(k)}
              >
                {SECTION_TITLES[k]}
              </button>
            ))}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div style={s.list}>
            {sectionsToShow.map((k) => (
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
  brutalistBtn: {
    background: "#ff5f1f",
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
  tabStrip: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 },
  tabBtn: {
    padding: "7px 16px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    border: "2px solid #e8e4dc",
    borderRadius: "2px",
    background: "#fff",
    color: "#888",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.1s",
  },
  tabBtnActive: {
    background: "#1a1a18",
    border: "2px solid #1a1a18",
    color: "#fff",
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
