// =============================================================================
// filters.js — Pure, composable, client-side filter helpers (PRD §8).
//
// All filters operate on the already-loaded week's data, are independent and
// composable (Doer AND Department AND Status AND Date range AND Search), and
// default to "All". Nothing here touches the DOM or the network.
// =============================================================================

import { ALL } from "./config.js";

// Distinct, sorted, non-empty values for building dropdown option lists.
export function unique(values) {
  const seen = new Set();
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) seen.add(s);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

// A dropdown matches when it is unset / "All" or equals the row value.
export function matchesDropdown(selected, value) {
  if (selected === undefined || selected === null || selected === ALL) return true;
  return String(value ?? "").trim() === String(selected).trim();
}

// Case-insensitive substring search across the given fields (PRD §8).
export function matchesSearch(query, fields) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}

// Inclusive ISO (YYYY-MM-DD) date-range check. Blank from/to are open-ended.
// A blank row date never matches a bounded range (it has no date to place).
export function inDateRange(dateStr, from, to) {
  if (!from && !to) return true;
  const d = String(dateStr ?? "").trim();
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

// Convenience: build the default filter state for a tab from a field list.
// e.g. defaultFilters(["doer", "department", "status"]) → {doer:"All", ...,
// search:"", from:"", to:""}
export function defaultFilters(dropdownFields = []) {
  const state = { search: "", from: "", to: "" };
  for (const f of dropdownFields) state[f] = ALL;
  return state;
}
