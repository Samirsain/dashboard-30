// =============================================================================
// ui.js — Small, dependency-free DOM helpers shared by all tabs. Keeps tab code
// declarative and the table styling (zebra, sticky header, horizontal scroll —
// PRD §11) in one place.
// =============================================================================

import { ALL, STATUS } from "./config.js";

// Tiny hyperscript-style element factory.
//   el("div", { class: "x", onclick: fn }, [childNode, "text"])
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

// Status pill that never relies on colour alone — text label is always present
// (PRD §11 accessibility). `kind` maps to a CSS modifier.
export function statusBadge(value, { atRisk = false } = {}) {
  const v = String(value ?? "").trim() || STATUS.PENDING; // blank → Pending (PRD §9)
  let kind = "pending";
  if (v === STATUS.DONE || v === STATUS.COMPLETED) kind = "done";
  if (atRisk) kind = "urgent";
  return el("span", { class: `badge badge--${kind}` }, [v]);
}

// Generic priority/urgency tag.
export function tag(value, modifier) {
  const v = String(value ?? "").trim();
  if (!v) return el("span", { class: "tag tag--muted" }, ["—"]);
  return el("span", { class: `tag tag--${modifier || v.toLowerCase()}` }, [v]);
}

// Build a data table.
//   columns: [{ key, label, render?(row)→node|string, className? }]
//   rows:    array of data rows
//   rowClass(row) → optional extra class (e.g. "row--alert")
// Returns a scroll wrapper containing the <table> (sticky header + zebra come
// from CSS). Shows an empty-state row when there are no rows.
export function buildTable({ columns, rows, rowClass }) {
  const thead = el("thead", {}, [
    el("tr", {}, columns.map((c) => el("th", { class: c.className }, [c.label]))),
  ]);

  let body;
  if (!rows.length) {
    body = el("tbody", {}, [
      el("tr", {}, [el("td", { class: "empty", colspan: String(columns.length) }, ["No matching rows for the current filters."])]),
    ]);
  } else {
    body = el(
      "tbody",
      {},
      rows.map((row) =>
        el("tr", { class: rowClass ? rowClass(row) : null }, columns.map((c) => {
          const content = c.render ? c.render(row) : row[c.key];
          return el("td", { class: c.className }, [content === null || content === undefined || content === "" ? "—" : content]);
        }))
      )
    );
  }

  return el("div", { class: "table-scroll" }, [el("table", { class: "data-table" }, [thead, body])]);
}

// A labelled <select>. options: array of strings; an "All" item is added by the
// caller as needed. Fires onChange(value).
export function selectControl({ label, value, options, onChange, includeAll = true }) {
  const select = el("select", { class: "control__input", onchange: (e) => onChange(e.target.value) });
  const opts = includeAll ? [ALL, ...options] : options;
  for (const o of opts) {
    select.appendChild(el("option", { value: o, selected: String(o) === String(value) ? "selected" : null }, [o]));
  }
  return el("label", { class: "control" }, [el("span", { class: "control__label" }, [label]), select]);
}

// A text search input.
export function searchControl({ label = "Search", value, placeholder, onInput }) {
  return el("label", { class: "control control--search" }, [
    el("span", { class: "control__label" }, [label]),
    el("input", {
      class: "control__input",
      type: "search",
      value: value || "",
      placeholder: placeholder || "Search task or step…",
      oninput: (e) => onInput(e.target.value),
    }),
  ]);
}

// A from/to date-range pair. Calls onChange({ from, to }).
export function dateRangeControl({ from, to, onChange }) {
  const mk = (which, val) =>
    el("input", {
      class: "control__input control__input--date",
      type: "date",
      value: val || "",
      onchange: (e) => onChange(which, e.target.value),
    });
  return el("div", { class: "control control--range" }, [
    el("span", { class: "control__label" }, ["Date range"]),
    el("div", { class: "control__range-inputs" }, [mk("from", from), el("span", { class: "control__range-sep" }, ["→"]), mk("to", to)]),
  ]);
}

// Wrap a set of controls in a responsive filter bar (collapses on mobile —
// PRD FR-10).
export function filterBar(controls) {
  return el("div", { class: "filter-bar" }, controls.filter(Boolean));
}

// A small "N of M" result count line shown above a table.
export function resultCount(shown, total) {
  return el("div", { class: "result-count" }, [`Showing ${shown} of ${total}`]);
}
