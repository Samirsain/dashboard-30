// =============================================================================
// app.js — Application shell + orchestration (PRD §7.2). Owns global state
// (week, active tab, per-tab filters), loads data on week change, and re-renders
// the active tab on tab/filter change. Entry point loaded by index.html.
// =============================================================================

import { BRAND, TABS, ALL } from "./config.js";
import { loadWeek, availableWeeks, defaultWeekKey } from "./data.js";
import { defaultFilters } from "./filters.js";
import { el, clear } from "./ui.js";
import {
  renderSummary,
  renderFMS,
  renderChecklist,
  renderDelegation,
  renderAllDoers,
} from "./tabs.js";

// --- Global state ------------------------------------------------------------
const state = {
  weekKey: defaultWeekKey(),
  activeTab: TABS[0].id,
  loading: true,
  source: "sample",
  error: null,
  data: null,
  // Per-tab filter state (PRD §8: filter state is per-tab).
  filters: {
    fms: defaultFilters(["fms", "doer"]),
    checklist: defaultFilters(["doer", "department", "status"]),
    delegation: defaultFilters(["doer", "status", "priority", "urgency"]),
    allDoers: { ...defaultFilters(["doer"]), status: ALL },
  },
};

// Tab renderers keyed by id. Summary takes no filters.
const RENDERERS = {
  summary: (data) => renderSummary(data),
  fms: (data) => renderFMS(data, state.filters.fms, patchFilter("fms")),
  checklist: (data) => renderChecklist(data, state.filters.checklist, patchFilter("checklist")),
  delegation: (data) => renderDelegation(data, state.filters.delegation, patchFilter("delegation")),
  allDoers: (data) => renderAllDoers(data, state.filters.allDoers, patchFilter("allDoers")),
};

// Returns an onChange handler that merges a patch into a tab's filter state and
// re-renders just the content area (cheap — client-side, hundreds of rows).
function patchFilter(tabId) {
  return (patch) => {
    Object.assign(state.filters[tabId], patch);
    renderContent();
  };
}

// --- DOM roots (resolved on boot) -------------------------------------------
let rootEl;
let contentEl;
let weekLabelEl;
let tabsEl;
let sourceBadgeEl;

// --- Boot --------------------------------------------------------------------
function boot() {
  rootEl = document.getElementById("app");
  clear(rootEl);
  rootEl.appendChild(buildHeader());
  rootEl.appendChild(buildTabs());
  contentEl = el("main", { class: "content", id: "content" });
  rootEl.appendChild(contentEl);
  rootEl.appendChild(buildFooter());
  reload();
}

// --- Header (FR-6, FR-7) -----------------------------------------------------
function buildHeader() {
  const logo = el("img", {
    class: "brand__logo",
    src: BRAND.logo,
    alt: `${BRAND.name} logo`,
    onerror: (e) => {
      // Graceful fallback to a text monogram if the logo asset is missing.
      const mono = el("span", { class: "brand__monogram" }, [BRAND.name.slice(0, 2).toUpperCase()]);
      e.target.replaceWith(mono);
    },
  });

  const weekSelect = el(
    "select",
    { class: "week-select", "aria-label": "Select week", onchange: (e) => changeWeek(e.target.value) },
    availableWeeks().map((w) => el("option", { value: w.key, selected: w.key === state.weekKey ? "selected" : null }, [w.label]))
  );

  weekLabelEl = el("span", { class: "brand__week" }, [currentWeekLabel()]);
  sourceBadgeEl = el("span", { class: "source-badge" }, []);

  return el("header", { class: "app-header" }, [
    el("div", { class: "brand" }, [
      logo,
      el("div", { class: "brand__text" }, [
        el("span", { class: "brand__name" }, [BRAND.name]),
        el("span", { class: "brand__tagline" }, [BRAND.tagline]),
      ]),
    ]),
    el("div", { class: "app-header__right" }, [
      el("div", { class: "week-picker" }, [weekLabelEl, weekSelect]),
      sourceBadgeEl,
    ]),
  ]);
}

// --- Tab navigation (FR-8) ---------------------------------------------------
function buildTabs() {
  tabsEl = el("nav", { class: "tabs", role: "tablist" }, TABS.map((t) =>
    el("button", {
      class: `tab${t.id === state.activeTab ? " tab--active" : ""}`,
      role: "tab",
      "aria-selected": t.id === state.activeTab ? "true" : "false",
      dataset: { tab: t.id },
      onclick: () => changeTab(t.id),
    }, [t.label])
  ));
  return tabsEl;
}

function buildFooter() {
  return el("footer", { class: "app-footer" }, [
    el("span", {}, [`${BRAND.name} ${BRAND.tagline} · read-only weekly MIS`]),
  ]);
}

// --- State transitions -------------------------------------------------------
async function reload() {
  state.loading = true;
  renderContent();
  const { data, source, error } = await loadWeek(state.weekKey);
  state.data = data;
  state.source = source;
  state.error = error;
  state.loading = false;
  if (weekLabelEl) weekLabelEl.textContent = currentWeekLabel();
  updateSourceBadge();
  renderContent();
}

function changeWeek(weekKey) {
  if (weekKey === state.weekKey) return;
  state.weekKey = weekKey;
  reload();
}

function changeTab(tabId) {
  if (tabId === state.activeTab) return;
  state.activeTab = tabId;
  for (const btn of tabsEl.querySelectorAll(".tab")) {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle("tab--active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  }
  renderContent();
}

// --- Rendering ---------------------------------------------------------------
function renderContent() {
  if (!contentEl) return;
  clear(contentEl);

  if (state.loading) {
    contentEl.appendChild(stateBlock("loading", "Loading data…", "Fetching this week's FMS, Checklist and Delegation status."));
    return;
  }

  // Fatal error (no data to show) — FR-9.
  if (state.error && !state.data) {
    contentEl.appendChild(errorBlock(state.error));
    return;
  }

  // Non-fatal notice (e.g. sample fallback after a failed live fetch).
  if (state.error && state.data) {
    contentEl.appendChild(noticeBanner(state.error.message, "warn"));
  }

  // Data-quality banner (FR-5): unknown doers in work rows.
  if (state.data && state.data.unknownDoers && state.data.unknownDoers.length) {
    contentEl.appendChild(
      noticeBanner(
        `Data quality: ${state.data.unknownDoers.length} doer name(s) not in the master Doers list — ${state.data.unknownDoers.join(", ")}. Rows are shown, not dropped.`,
        "info"
      )
    );
  }

  const render = RENDERERS[state.activeTab] || RENDERERS.summary;
  contentEl.appendChild(render(state.data));
}

function currentWeekLabel() {
  if (state.data && state.data.weekRange && state.data.weekRange.label) return state.data.weekRange.label;
  const w = availableWeeks().find((x) => x.key === state.weekKey);
  return w ? w.label : state.weekKey;
}

function updateSourceBadge() {
  if (!sourceBadgeEl) return;
  clear(sourceBadgeEl);
  if (state.source === "sample") {
    sourceBadgeEl.className = "source-badge source-badge--sample";
    sourceBadgeEl.appendChild(document.createTextNode("Sample data"));
    sourceBadgeEl.title = "APPS_SCRIPT_URL is not configured — showing bundled sample data.";
  } else {
    sourceBadgeEl.className = "source-badge source-badge--live";
    sourceBadgeEl.appendChild(document.createTextNode("Live"));
    sourceBadgeEl.title = "Connected to the Apps Script data source.";
  }
}

// --- State blocks ------------------------------------------------------------
function stateBlock(kind, title, sub) {
  return el("div", { class: `state-block state-block--${kind}` }, [
    kind === "loading" ? el("div", { class: "spinner" }) : null,
    el("div", { class: "state-block__title" }, [title]),
    sub ? el("div", { class: "state-block__sub" }, [sub]) : null,
  ]);
}

function errorBlock(error) {
  const children = [
    el("div", { class: "state-block__title" }, ["Couldn't load the dashboard"]),
    el("div", { class: "state-block__sub" }, [error.message || "Unknown error."]),
  ];
  if (error.missingHeaders && error.missingHeaders.length) {
    children.push(
      el("div", { class: "missing-headers" }, [
        el("div", { class: "missing-headers__title" }, ["Missing required headers:"]),
        el("ul", {}, error.missingHeaders.map((h) => el("li", {}, [h]))),
      ])
    );
  }
  children.push(el("button", { class: "btn btn--primary", onclick: () => reload() }, ["Retry"]));
  return el("div", { class: "state-block state-block--error" }, children);
}

function noticeBanner(message, kind) {
  return el("div", { class: `notice notice--${kind}` }, [message]);
}

// Boot once DOM is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
