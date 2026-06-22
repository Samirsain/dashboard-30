# Apps Script — data export & notifications

This folder is the **backend** for the ThirtyMilestones MIS Dashboard: a Google
Apps Script Web App bound to the data workbook. It does two jobs:

- `Code.gs` — `doGet` endpoint that validates headers and emits the week's data
  as JSON (PRD §7.1).
- `Notifications.gs` — daily trigger that emails at-risk delegations and marks
  them `Notified` (PRD §7.8).

## 1. Build the workbook

Create one Google Sheets workbook with these tabs. **Row 1 is the header row**;
header strings must match EXACTLY (case-sensitive, trimmed) — they are the
schema contract (PRD §5). Anything after row 1 is data.

- **Doers** — `Doer`, `Department`, `Active` *(optional: `Email`)*
- **Departments** — `Department`
- **FMS** — `FMS Name`, `Step`, `Step No`, `Doer`, `Department`, `Frequency`,
  `Planned Date`, `Planned Time`, `Actual Date`, `Status`
- **Checklist** — `Task`, `Doer`, `Department`, `Date`, `Status`
- **Delegation** — `Task`, `Doer`, `Given By`, `Department`, `Priority`,
  `Urgency`, `Planned Date`, `Completed Date`, `Status`, `Notified`

Conventions (PRD §5.1): dates `YYYY-MM-DD` (real Sheets dates are fine — they're
normalised), times `HH:mm`, statuses from the fixed enums (`Done`/`Pending`,
`Completed`/`Pending`), `Active`/`Notified` as checkboxes or TRUE/FALSE.

> Tip: the bundled `js/sample-data.js` is a ready-made example of exactly these
> columns and values — mirror it when setting up the sheets.

## 2. Add the script

**Extensions → Apps Script** from the workbook, then:

1. Paste `Code.gs` and `Notifications.gs` into the project (create both files).
2. Replace the default `appsscript.json` (enable *Show "appsscript.json"* under
   Project Settings) with the one here, or just let the scopes auto-resolve on
   first run.

## 3. Deploy the Web App (the dashboard's data source)

**Deploy → New deployment → Web app**:

- Description: `MIS export`
- Execute as: **Me**
- Who has access: **Anyone**

Copy the **Web app URL** (ends in `/exec`) and paste it into `APPS_SCRIPT_URL`
in the frontend `js/config.js`.

Test it directly in a browser:

```
<your-exec-url>?week=2026-06-14
```

You should get JSON like `{ "doers": [...], "fms": [...], ... }`. If a header is
wrong you'll get `{ "error": "...", "missingHeaders": ["FMS → Planned Date", ...] }`
— fix the sheet header and retry. (The dashboard surfaces this same error.)

Week parameter (PRD §7.2):

- `?week=YYYY-MM-DD` — the **Sunday** that starts the week (Sun–Sat). Omit it to
  default to the current week.
- `?from=YYYY-MM-DD&to=YYYY-MM-DD` — explicit range (overrides `week`).

To use **Mon–Sun** weeks instead, set `WEEK_START = 1` in `Code.gs`.

## 4. Turn on Delegation notifications (optional, PRD §7.8)

1. Add an `Email` column to the **Doers** sheet with each doer's address (this
   is the only thing notifications need beyond the core schema).
2. In the Apps Script editor, run **`installDailyTrigger`** once and authorise
   the mail/script scopes when prompted.

Each morning it emails the doer of any delegation that is still `Pending`, is
`Urgent` or `High` priority, and is within `NOTIFY_WINDOW_DAYS` of its
`Planned Date` (or overdue), then sets `Notified = TRUE` so no one is emailed
twice. Doers with no `Email` are reported to the deploying manager instead.

Tunables in `Notifications.gs`: `NOTIFY_WINDOW_DAYS`, the 8 a.m. send time in
`installDailyTrigger`, and `MANAGER_EMAIL`.

## Redeploying after edits

Apps Script Web Apps are versioned. After changing `Code.gs`, do **Deploy →
Manage deployments → (edit) → New version** so the live `/exec` URL serves the
update. (The URL stays the same.)
