# ThirtyMilestones MIS Dashboard

A weekly, read-only **Management Information System** dashboard for the
ThirtyMilestones team (Real Estate, Hanumangarh). It reads task/process data
that the team already maintains in Google Sheets and renders a mobile-first,
**dark glassmorphism** dashboard showing, per **doer** and per **department**,
the status of three kinds of work:

1. **FMS** — recurring multi-step functional processes
2. **Checklist** — daily/periodic recurring routine tasks
3. **Delegation** — one-time delegated tasks with priority & urgency

It answers one question for management: *"Who is doing their committed work on
time, and what is pending?"*

## Tech stack

- **Vite + React + TypeScript** — static SPA, fast HMR, builds to `dist/`.
- **Tailwind CSS + shadcn/ui** (Radix primitives) — accessible components, a
  minimal **dark glass** theme (deep navy canvas, frosted translucent surfaces,
  gold accent) matching the premium "milestones" positioning.
- **Google Apps Script** — read-only export layer + delegation notifications
  (`apps-script/`). No backend of our own.
- Runs on bundled **sample data** until the Apps Script URL is configured, so
  it's fully demonstrable out of the box.

## Architecture

```
Google Sheets (team enters data)
        │   read-only
        ▼
Google Apps Script Web App (doGet)  ──►  JSON snapshot per week
        │                                 (validates headers first)
        ▼
Static SPA (Vite build → Vercel/Netlify)  ──►  fetches JSON, renders dashboard
```

## Project layout

```
index.html                 Vite entry (mounts #root)
src/
  main.tsx                 React entry
  App.tsx                  Shell: header, tabs, week load, loading/error states
  index.css                Tailwind + dark-glass theme tokens + .glass utility
  components/
    Login.tsx              Admin login screen (salted SHA-256 verify)
    exec/                  Executive Portal shell + views:
                           Sidebar, Topbar, Overview, OverviewParts (KPI cards,
                           status donut, dept bars), TaskDirectory, Scorecard,
                           Icon
    ui/                    shadcn/ui primitives (button, card, tabs, select,
                           table, badge, input) — glass-tuned
  lib/
    config.js              ⭐ Schema contract (header strings) + brand + settings
    data.js                Fetch from Apps Script; sample fallback; data-quality
    sample-data.js         Bundled ThirtyMilestones demo data (doGet-shaped)
    analytics.js           Dashboard metrics (KPIs, status split, dept perf)
    scoring.js             Per-doer Done/Late/Pending scoring + org totals
    auth.ts                Admin auth (salted SHA-256, localStorage session)
    filters.js             Pure, composable client-side filter helpers
    format.ts              Date / percent / score-colour formatting
    utils.ts               cn() class-merge helper
apps-script/               doGet export + header validation + notifications
tailwind.config.js · postcss.config.js · vite.config.ts · tsconfig*.json
components.json            shadcn/ui config (for `npx shadcn add …`)
vercel.json · netlify.toml Static deploy configs (+ security headers)
```

## The schema contract (read this before touching headers)

PRD §5 makes header names a **fixed API**. The exact, case-sensitive header
strings live in **one place on each side**:

- Frontend: [`src/lib/config.js`](src/lib/config.js) → `HEADERS`
- Backend: [`apps-script/Code.gs`](apps-script/Code.gs) → `SCHEMA`

Renaming a column is a **breaking change** that must be edited in **both**
places at once. Nothing else in the code hard-codes a header string — every
column read goes through `HEADERS.*`. `doGet` returns `{ error, missingHeaders[] }`
on any mismatch and the UI shows exactly which headers are missing.

| Sheet | Required headers |
|---|---|
| `Doers` | `Doer`, `Department`, `Active` (optional `Email` for notifications) |
| `Departments` | `Department` |
| `FMS` | `FMS Name`, `Step`, `Step No`, `Doer`, `Department`, `Frequency`, `Planned Date`, `Planned Time`, `Actual Date`, `Status` |
| `Checklist` | `Task`, `Doer`, `Department`, `Date`, `Status` |
| `Delegation` | `Task`, `Doer`, `Given By`, `Department`, `Priority`, `Urgency`, `Planned Date`, `Completed Date`, `Status`, `Notified` |

## Run locally

```bash
npm install
npm run dev       # → http://localhost:5173
```

With no `APPS_SCRIPT_URL` set you'll see the **Sample data** badge and the demo
dataset (two weeks: 14–20 Jun and 21–27 Jun 2026).

```bash
npm run build     # production build → dist/
npm run preview   # serve the built dist/ locally
```

## Working with shadcn/ui

Components live in `src/components/ui/` and are owned by this repo (copy-paste,
not a dependency). The theme is driven by CSS variables in `src/index.css`; the
frosted look is the `.glass` / `.glass-strong` utilities. Add more primitives
with:

```bash
npx shadcn@latest add dialog   # etc. — config is in components.json
```

## Connect to live Google Sheets

1. Create the workbook with the tabs/headers above. See
   [`apps-script/README.md`](apps-script/README.md) for a step-by-step.
2. Deploy `Code.gs` as a Web App (Execute as *Me*, access *Anyone*).
3. Paste the `/exec` URL into `APPS_SCRIPT_URL` in
   [`src/lib/config.js`](src/lib/config.js) → the badge flips to **Live**.

The frontend issues a plain `GET` (no custom headers) so it stays CORS-safe for
an Anyone-access Apps Script web app.

## Deploy

- **Vercel** (primary): auto-detects Vite — build `npm run build`, output
  `dist/`. `vercel.json` adds CSP/HSTS/security headers. Prefer a **custom
  domain** over a shared `*.vercel.app` subdomain to avoid Safe-Browsing
  shared-domain false positives.
- **Netlify**: `netlify.toml` sets build `npm run build`, publish `dist/`.

## Decisions taken from the PRD's open questions

v1 defaults follow the PRD's recommendations; easy to change after confirming
with ThirtyMilestones (PRD §14):

| # | Question | v1 decision | Where to change |
|---|---|---|---|
| 2 | Scoring weights | **Pooled** — total completed ÷ total committed across all three types | `src/lib/scoring.js` |
| 3 | "Done-late" handling | Counts as **Done**, surfaced with a *done-late* label (FMS) | `src/lib/scoring.js` |
| 4 | Week definition | **Sun–Sat** | `WEEK_START` in `apps-script/Code.gs`; week list in `src/lib/sample-data.js` |
| 1 | Access control | **Link-based** + `noindex` (weak; not real security) | see below |
| 5 | Multi-week history | Out of scope for v1 (week selector only) | future |

**Security note:** v1 is link-based access with a `noindex` hint — *not* real
access control. Per-role access (doers see only themselves) needs a gated
frontend or authenticated Apps Script flow (v2).

## PRD coverage

- §7.1 Apps Script export + header validation + date normalisation + unknown-doer
  flagging — `apps-script/Code.gs`
- §7.2 Shell: brand header, week selector, tabs, loading/error/data-quality
  states — `src/App.tsx`
- §7.3 Summary: per-doer pooled score, org totals, low-performer flagging
- §7.4–7.6 FMS / Checklist / Delegation tables with composable per-tab filters
  (Urgent+Pending and overdue rows highlighted)
- §7.7 All Doers: combined per-doer FMS+Checklist+Delegation view
- §7.8 Notifications: Apps Script time-trigger emails for at-risk delegations
- §8 Filtering/search: client-side, composable, per-tab, "All" default
- §9 Scoring: pooled %, blank status → Pending, overdue & done-late surfaced
- §11 Branding: dark glass shell + gold accent; minimal, dense, legible tables
```
