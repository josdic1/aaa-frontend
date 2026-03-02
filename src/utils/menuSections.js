// src/utils/menuSections.js
// Shared menu section logic used by MenuPage and MobileHub

export const SECTION_ORDER = [
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

export const SECTION_TITLES = {
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

export function getSectionKey(item) {
  const explicit = (item.category || item.section || "").toLowerCase().trim();
  if (SECTION_ORDER.includes(explicit)) return explicit;

  const n = (item.name || "").toLowerCase().trim();
  if (n.startsWith("add ")) return "addons";
  if (n.includes("kids")) return "kids";
  if (n.match(/cheese board|burrata|pretzel|mezze|calamari|wings/))
    return "starters";
  if (n.match(/salad|bowl/)) return "salads";
  if (n.includes("hot dog")) return "hotdogs";
  if (
    n.match(/cake|blond|churro|brownie|cookie|ice cream|sundae|popsicle|tart/)
  )
    return "desserts";
  if (n.match(/lemonade|iced tea|arnold|water|soda|coffee|tea/))
    return "drinks";
  if (n.match(/potato|chips|vegetable|fries|rings|coleslaw/)) return "sides";
  if (
    n.match(
      /sandwich|club|burger|lobster roll|flatbread|steak|quesadilla|chicken/,
    )
  )
    return "mains";

  return "other";
}

export function groupMenuItems(items) {
  const acc = {};
  for (const item of items) {
    const key = getSectionKey(item);
    (acc[key] ||= []).push(item);
  }
  for (const key of Object.keys(acc)) {
    acc[key].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
  }
  return acc;
}
