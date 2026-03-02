// src/utils/statusColors.js
// Single source of truth for reservation + order status colors.
// Import this everywhere instead of re-defining inline.

export const RESERVATION_STATUS_COLOR = {
  confirmed: "#2e7d32",
  draft: "#b45309",
  cancelled: "#c0392b",
};

export const ORDER_STATUS_COLOR = {
  open: "#c8783c",
  fired: "#6d28d9",
  fulfilled: "#2e7d32",
  cancelled: "#c0392b",
};

// Returns a hex string for any reservation status. Safe fallback to grey.
export function resStatusColor(status) {
  return RESERVATION_STATUS_COLOR[status] || "#888";
}

// Returns a hex string for any order status. Safe fallback to grey.
export function orderStatusColor(status) {
  return ORDER_STATUS_COLOR[status] || "#888";
}

// Rgba versions for the dark mobile terminal UI
export const RESERVATION_STATUS_COLOR_RGBA = {
  confirmed: "rgba(74,222,128,0.65)",
  draft: "rgba(250,204,21,0.65)",
  cancelled: "rgba(248,113,113,0.65)",
};
