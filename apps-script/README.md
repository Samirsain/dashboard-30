# Apps Script — unified data export

`Code.gs` is the **backend** for the dashboard: one standalone Google Apps
Script Web App that reads the team's real sheets **by ID**, normalises them, and
returns a single JSON payload:

```
{ doers, departments, fms[], checklist[], delegation[], weekRange }
```

## Sources (already configured in Code.gs)

| Dashboard tab | Sheet | Detected tab | Key columns |
|---|---|---|---|
| **Delegation** | TASKLIST | tab with `Task ID` + `Total Revisions` | Name, Task, First Date, Latest Revision, Total Revisions, Status, Priority |
| **Checklist** | CHECKLIST | `Master` (`Task ID`+`Planned`+`Actual`) | Name, Department, Freq, Task, Planned, Actual, Status |
| **FMS** | *(add ID later)* | — | — |

The tab is **auto-detected** by its header signature, so exact tab names don't
matter. Doer names that differ across sheets (e.g. `SANDEP` ↔ `SANDEEP`,
`SAHIL SIR` ↔ `SAHIL`) are merged via `DOER_ALIAS`. Dates are read as
`DD/MM/YYYY` (or real date cells) and normalised to ISO.

## Deploy (one time)

1. Go to **script.google.com → New project**. Delete the default code, paste
   `Code.gs`. Name it e.g. *ThirtyMilestones MIS Export*.
2. **Important:** sign in as an account that can open **all** the sheets
   (the owner `mis.thirtymilestones@gmail.com`, or one they're shared with).
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Run/authorise when prompted (it needs permission to read your Sheets).
5. Copy the **Web app URL** (ends in `/exec`) and paste it into
   `APPS_SCRIPT_URL` in [`src/lib/config.js`](../src/lib/config.js).

Test it in a browser:

```
<your-exec-url>?week=2026-06-21
```

You should get JSON with `doers`, `checklist`, `delegation`. Week param:
`?week=YYYY-MM-DD` (the **Sunday** that starts the week) or
`?from=YYYY-MM-DD&to=YYYY-MM-DD`; omit to get the current week.

## Add Task (write) — `doPost`

The dashboard's **Add Task** button (admin + PC only) POSTs JSON here and the
script appends one row to the right sheet/tab, mapping values to columns by
header name:

```jsonc
{ "token": "TM30-WRITE", "system": "tasklist",   // or "checklist"
  "task": "…", "doer": "SAMIR", "priority": "High", "date": "2026-06-27" }
```

- `token` must equal `WRITE_TOKEN` in both `Code.gs` and
  [`src/lib/config.js`](../src/lib/config.js) — change both if you rotate it.
- New rows are written with **Status = Pending**, `Total Revisions = 0`, a
  generated `Task ID`, and the date as a real date cell.
- `system: "tasklist"` → TASKLIST sheet; `system: "checklist"` → CHECKLIST
  `Master` tab (also writes Department + Freq).

**Mark Done** uses the same endpoint with `action: "complete"`:

```jsonc
{ "token": "TM30-WRITE", "action": "complete", "system": "tasklist",
  "taskId": "abc123", "doer": "SAMIR", "task": "…", "date": "2026-06-27" }
```

The row is located by **Task ID** (or, if a checklist row has none, by
`Name`+`Task`+date). It then sets **Status = Done** + `Actual` (checklist) /
**Status = Completed** + `Latest Revision` (tasklist) to today's date.

**Revise** (reschedule a pending task) uses `action: "revise"` with a `newDate`:

```jsonc
{ "token": "TM30-WRITE", "action": "revise", "system": "tasklist",
  "taskId": "abc123", "doer": "SAMIR", "task": "…",
  "date": "2026-06-27", "newDate": "2026-06-28" }
```

Task List → `Latest Revision` = newDate and **Total Revisions +1** (still
Pending); Checklist → `Planned` moves to newDate. The dashboard then shows the
task under its new date.

> **After pulling this update you MUST redeploy** so the live URL gains
> `doPost`: **Manage deployments → edit (pencil) → Version: New version →
> Deploy**. The `/exec` URL stays the same. Until you redeploy, the button will
> show an error because the old deployment has no `doPost`.

## Adding FMS later

Set `SHEET_IDS.fms` to the FMS sheet's ID and fill in the column mapping inside
`readFms()`. Redeploy (**Manage deployments → edit → New version**) — the URL
stays the same.

## Notes

- Reminders/emails are handled by each sheet's own built-in script (the
  delegation/checklist templates already send them), so this export script is
  read-only.
- Weeks are **Sunday-start** (`WEEK_START`); the checklist sheet thinks in
  Monday-weeks, so a task on a boundary day may land one week over — change
  `WEEK_START = 1` if you prefer Monday.
