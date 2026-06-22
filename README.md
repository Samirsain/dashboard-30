# ThirtyMilestones MIS Dashboard

A weekly, read-only **Management Information System** dashboard for the
ThirtyMilestones team (Real Estate, Hanumangarh). It reads task/process data
that the team already maintains in Google Sheets and renders a mobile-first
dashboard showing, per **doer** and per **department**, the status of three
kinds of work:

1. **FMS** — recurring multi-step functional processes
2. **Checklist** — daily/periodic recurring routine tasks
3. **Delegation** — one-time delegated tasks with priority & urgency

It answers one question for management: *"Who is doing their committed work on
time, and what is pending?"*

> Built to the PRD **ThirtyMilestones MIS Dashboard v1.0**. This repo implements
> the *structure*; the actual departments, doers and process definitions are
> ThirtyMilestones-specific and live in the Google Sheets (see Schema below).

---

## Architecture

```
Google Sheets (team enters data)
        │   read-only
        ▼
Google Apps Script Web App (doGet)  ──►  JSON snapshot per week
        │                                 (validates headers first)
        ▼
Static frontend (Netlify)  ──►  fetches JSON, renders dashboard
```

- **Frontend** — plain HTML/CSS/ES-module JavaScript. **No build step**, no
  framework, no backend of its own. Deploys to Netlify as static files.
- **Backend** — Google Apps Script (`apps-script/`). One `doGet` endpoint emits
  the week's data as JSON and **validates the sheet headers** before reading, so
  a renamed/missing column produces a clear error instead of silently-wrong
  numbers.
- **Runs without a backend out of the box** — until you wire up the Apps Script
  URL, the dashboard renders bundled **sample data** so it's fully demonstrable.

## Project layout

```
index.html              App shell (mounts the SPA)
css/styles.css          Branding + responsive table styles (PRD §11)
js/
  config.js             ⭐ Schema contract (header strings) + brand + settings
  data.js               Fetch from Apps Script; sample-data fallback; data-quality
  sample-data.js        Bundled ThirtyMilestones demo data (doGet-shaped)
  scoring.js            Metrics & scoring (PRD §9) — pooled completion %
  filters.js            Pure, composable client-side filter helpers (PRD §8)
  ui.js                 DOM helpers: tables (sticky/zebra), badges, filter bars
  tabs.js               The five tab renderers (Summary/FMS/Checklist/Deleg/All)
  app.js                Shell + state: week selector, tabs, per-tab filters
assets/                 Logo + favicon (SVG)
apps-script/
  Code.gs               doGet export layer + header validation (PRD §7.1)
  Notifications.gs      Delegation email notifications (PRD §7.8)
  appsscript.json       Web-app manifest (scopes, access)
  README.md             Sheet setup + deployment steps
netlify.toml            Static deploy config
```

## The schema contract (read this before touching headers)

PRD §5 makes header names a **fixed API**. The exact, case-sensitive header
strings live in **one place on each side**:

- Frontend: [`js/config.js`](js/config.js) → `HEADERS`
- Backend: [`apps-script/Code.gs`](apps-script/Code.gs) → `SCHEMA`

Renaming a column is a **breaking change** that must be edited in **both**
places at once. Nothing else in the code hard-codes a header string — every
column read goes through `HEADERS.*`, so the rename is a one-line edit per side.
This is the guard against the known header-mismatch failure mode; `doGet`
returns `{ error, missingHeaders[] }` and the UI shows exactly which headers are
missing.

Sheets & columns (see PRD §5 for full detail):

| Sheet | Required headers |
|---|---|
| `Doers` | `Doer`, `Department`, `Active` (optional `Email` for notifications) |
| `Departments` | `Department` |
| `FMS` | `FMS Name`, `Step`, `Step No`, `Doer`, `Department`, `Frequency`, `Planned Date`, `Planned Time`, `Actual Date`, `Status` |
| `Checklist` | `Task`, `Doer`, `Department`, `Date`, `Status` |
| `Delegation` | `Task`, `Doer`, `Given By`, `Department`, `Priority`, `Urgency`, `Planned Date`, `Completed Date`, `Status`, `Notified` |

## Run locally

ES modules need to be served over HTTP (not opened as `file://`). Any static
server works:

```bash
# from the repo root
python3 -m http.server 8080
#   → open http://localhost:8080

# or
npx serve .
```

With no `APPS_SCRIPT_URL` set, you'll see the bundled **Sample data** badge and
the demo dataset for ThirtyMilestones (two weeks: 14–20 Jun and 21–27 Jun 2026).

## Connect to live Google Sheets

1. Create the workbook with the tabs/headers above (or copy the structure from
   the sample data). See [`apps-script/README.md`](apps-script/README.md) for a
   step-by-step.
2. Add `Code.gs`, `Notifications.gs`, and `appsscript.json` to a bound Apps
   Script project and **deploy as a Web App** (Execute as *Me*, access
   *Anyone*).
3. Paste the deployment `/exec` URL into `APPS_SCRIPT_URL` in
   [`js/config.js`](js/config.js).
4. Reload — the badge flips to **Live**.

The frontend issues a plain `GET` (no custom headers) so it stays within
CORS-safe "simple request" rules for an Anyone-access Apps Script web app.

## Deploy to Netlify

Static deploy, no build:

- Connect the repo (build command empty, publish dir `.`), **or** drag-drop the
  folder into Netlify. `netlify.toml` already sets caching + `noindex`.
- Set `APPS_SCRIPT_URL` in `js/config.js` before/after deploy as needed.

## Decisions taken from the PRD's open questions

These v1 defaults follow the PRD's own recommendations; flagged here so they're
easy to change after confirming with ThirtyMilestones (PRD §14):

| # | Question | v1 decision | Where to change |
|---|---|---|---|
| 2 | Scoring weights | **Pooled** — total completed ÷ total committed across all three types | `js/scoring.js` |
| 3 | "Done-late" handling | Counts as **Done**, but surfaced with a *done-late* sub-label (FMS) | `js/scoring.js` (`isFmsDoneLate`) |
| 4 | Week definition | **Sun–Sat** | `WEEK_START` in `Code.gs`; week list in `js/sample-data.js` |
| 1 | Access control | **Link-based** + `noindex` (weak; not real security) | see below |
| 5 | Multi-week history | Out of scope for v1 (week selector only) | future |

**Security note (Open Question 1):** v1 is link-based access only, with a
`noindex` hint. This is *not* real access control — anyone with the URL (and the
Apps Script URL) can read the data. If ThirtyMilestones needs per-role access
(e.g. doers see only themselves), that requires gating the frontend or moving to
an authenticated Apps Script flow — a deliberate v2 change.

## PRD coverage

- §7.1 Apps Script export + header validation + date normalisation + unknown-doer
  flagging — `apps-script/Code.gs`
- §7.2 Shell: brand header, week selector, tabs, loading/error states — `js/app.js`
- §7.3 Summary: per-doer score, org totals, low-performer flagging — `tabs.js`
- §7.4 FMS Steps: table, FMS/Doer/Date/Search filters, grouped by FMS then Step No
- §7.5 Checklist: table + Doer/Dept/Status/Date/Search filters
- §7.6 Delegation: table + filters incl. Priority/Urgency; Urgent+Pending highlighted
- §7.7 All Doers: combined per-doer FMS+Checklist+Delegation view
- §7.8 Notifications: Apps Script time-trigger emails for at-risk delegations
- §8 Filtering/search: client-side, composable, per-tab, "All" default
- §9 Scoring: pooled %, blank status → Pending, overdue & done-late surfaced
- §11 Branding: navy/charcoal shell + gold accent; neutral dense tables; sticky/zebra
```
