# ThirtyMilestones MIS — UI Design Brief
### Professional Dashboard UI Redesign Specification

---

## 1. Product Overview

**Product Name:** ThirtyMilestones MIS Dashboard  
**Company:** ThirtyMilestones — Real Estate Company, Hanumangarh, Rajasthan  
**Type:** Internal Management Information System — tracks daily/weekly task completion across all departments  
**Access:** Two routes — `/` (Public team dashboard) and `/admin` (Admin scoring panel, login-protected)

---

## 2. Brand Identity

| Token | Value |
|-------|-------|
| Primary Color | `#004ac6` (Executive Blue) |
| Primary Variant | `#003ea8` (Deep Blue) |
| Primary Fixed (tint) | `#dbe1ff` (Ice Blue) |
| Success | `#16a34a` (Green) |
| Warning | `#d97706` (Amber) |
| Danger / Late | `#dc2626` (Red) |
| Surface | `#f7f9fb` (Off-white canvas) |
| On-Surface | `#191c1e` (Near-black text) |
| On-Surface Variant | `#434655` (Muted text) |
| Card Background | `rgba(255,255,255,0.72)` with `backdrop-blur: 20px` |
| Border | `#e5e7eb` |

**Typography:**
- Body / UI: `Inter` (sans-serif)
- Display headings: `Cormorant Garamond` (serif — premium feel)
- Feature: tabular-nums on all numeric values

**Background Treatment:**
```css
background-image:
  radial-gradient(48rem at 6% -14%, rgba(37,99,235,0.10), transparent 62%),
  radial-gradient(44rem at 110% 2%,  rgba(14,165,233,0.09), transparent 58%),
  radial-gradient(40rem at 50% 124%, rgba(59,130,246,0.06),  transparent 62%);
background-attachment: fixed;
```
Soft blue ambient light blobs on a `hsl(210, 33%, 98%)` canvas.

---

## 3. Real Data — Exact Structure

### 3.1 Departments (9 departments)
```
MIS · EA · HR · SITE INCHARGE · PS · CRM · SUPERVISOR · ACCOUNTS · DRIVER
```

### 3.2 Team Members (Active Staff)
| Name | Department |
|------|------------|
| SAMIR | MIS (Management Information Systems) |
| PRIYA | EA (Executive Assistant) |
| SHIKHA | HR |
| SANDEEP | PS (Property/Site) |
| DEEPAK | SUPERVISOR |
| (+ more active staff) |

### 3.3 Checklist Data Schema
```json
{
  "task": "OFFICE WIFI KA BILL",
  "doer": "PRIYA",
  "department": "EA",
  "frequency": "Monthly",   // Daily | Weekly | Monthly
  "planned": "2026-06-25",
  "actual": "2026-06-25",   // empty string if not done
  "status": "Done"          // Done | Pending
}
```

### 3.4 Task List (Delegation) Data Schema
```json
{
  "taskId": "qh9a8lx",
  "task": "ENGINEER KA RESUME DENA HAI SIR KO",
  "doer": "SHIKHA",
  "department": "HR",
  "firstDate": "2026-06-22",
  "latestRevision": "2026-06-24",
  "revisions": 2,            // 0=Green, 1=Yellow, 2+=Red RAG signal
  "status": "Pending",       // Completed | Pending
  "priority": "Normal"       // Normal | High | Urgent | empty
}
```

### 3.5 Status Logic
| Condition | Display Status | Color |
|-----------|---------------|-------|
| Checklist: `actual` filled on/before `planned` | Completed | Green `#16a34a` |
| Checklist: `actual` filled AFTER `planned` | Late | Red `#dc2626` |
| Checklist: `actual` empty | Pending | Amber `#d97706` |
| Delegation: `status = "Completed"` AND `revisions = 0` | Completed | Green |
| Delegation: `status = "Completed"` AND `revisions > 0` | Late | Red |
| Delegation: `status ≠ "Completed"` | Pending | Amber |

### 3.6 RAG (Red-Amber-Green) Signal — Task List Only
- `revisions = 0` → **Green** — clean execution
- `revisions = 1` → **Yellow** — one rework
- `revisions ≥ 2` → **Red** — multiple reworks, needs attention

### 3.7 Available Weeks (Week Selector)
```
21 Jun – 27 Jun 2026   (current)
14 Jun – 20 Jun 2026
7 Jun  – 13 Jun 2026
31 May – 6 Jun  2026
```

---

## 4. Navigation Structure

### Public Route `/`
```
Left Sidebar
├── Dashboard        (default — Overview)
├── Checklist
├── Task List
└── Workflow         (coming soon — FMS sheet not connected)
```

### Admin Route `/admin`
```
Login Screen → (admin / Sahil@30)
  └── Scorecard (full per-doer scoring)
```

---

## 5. All Screens — Detailed Spec

---

### 5.1 SHELL LAYOUT

```
┌─────────────────────────────────────────────────────────────────────┐
│  [LEFT SIDEBAR 240px]  │  [TOPBAR 64px full-width]                  │
│  ─────────────────────── ─────────────────────────────────────────  │
│                        │                                             │
│   Brand Logo           │  <MAIN CONTENT AREA>                       │
│   + Nav Items          │  max-w-[1440px] centered                   │
│                        │  p-6, overflow-y-auto                      │
│   [Sidebar]            │                                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Sidebar (240px, fixed):**
- White/glass bg, right border `#e5e7eb`
- Top: Brand name "ThirtyMilestones" + tagline "MIS Dashboard"
- Nav items with Material Symbols icons
- Active item: `#eef2ff` bg, `#004ac6` text, 3px left accent bar
- Bottom: logout button (admin only)

**Topbar (64px, sticky):**
- Glass bg (`rgba(255,255,255,0.7)` + `backdrop-blur-xl`)
- Left: Breadcrumb — "Overview > {Section Name}"
- Right: Week Selector dropdown + "Live/Sample" status badge + optional logout

**Week Selector:**
- Options: "All weeks", then each week by label
- Live badge: `bg-green-100 text-success` green dot
- Sample badge: `bg-amber-100 text-warning` amber dot

**Mobile:** Bottom tab bar (replaces sidebar on small screens)

---

### 5.2 SCREEN: DASHBOARD (Overview)

**Grid layout:**
```
Row 1: [KPI Cards — 5 cards in a row]
Row 2: [Status Donut (1/3)] | [Department Performance (2/3)]
Row 3: [Task Directory — full width table]
```

#### KPI Cards (5 cards)
```
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────────────────────┐
│ Total Tasks    │ │ Completed      │ │ Late           │ │ Pending        │ │ Completion %                   │
│ [list icon]    │ │ [check icon]   │ │ [clock icon]   │ │ [pending icon] │ │ [speed icon]                   │
│                │ │                │ │                │ │                │ │                                │
│  23            │ │  15            │ │  3             │ │  5             │ │  78%                           │
│ TOTAL TASKS    │ │ COMPLETED      │ │ LATE           │ │ PENDING        │ │ [progress bar full width]      │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘ └────────────────────────────────┘
 Blue icon bg      Green icon bg      Red icon bg        Amber icon bg       Gradient blue card (text white)
```

Each card: `glass-card` 18px radius, p-5, hover lifts 2px  
Last card: `bg-gradient-to-br from-[#004ac6] to-[#003ea8]` — white text, progress bar inside

#### Status Donut Chart
```
         ┌──────────────────┐
         │   Task Status    │ ← section heading
         │                  │
         │   ╭───────╮      │   ● Completed    15    65%
         │  ╱         ╲     │   ● Late          3    13%
         │ │   23      │    │   ● Pending       5    22%
         │ │  Tasks    │    │
         │  ╲         ╱     │
         │   ╰───────╯      │
         └──────────────────┘
```
- SVG arc segments (NOT CSS conic-gradient)
- **Hover interaction:** Hovering a segment → center text switches from "23 Tasks" to "{segment}%, {N} tasks, {Label}"
- Hovering a legend row → same highlight effect, segment dims others to 35% opacity
- Segment colors: Green `#16a34a`, Red `#dc2626`, Amber `#d97706`
- Donut outer radius 72px, inner radius 48px, viewBox 160×160

#### Department Performance (Horizontal bars)
```
┌──────────────────────────────────────────────────────┐
│ Department Performance                               │
│                                                      │
│ EA         [████████████████░░░░] 12/15 · 80%        │  ← green bar
│ HR         [████████░░░░░░░░░░░░] 6/12  · 50%        │  ← blue bar
│ SUPERVISOR [████░░░░░░░░░░░░░░░░] 3/9   · 33%        │  ← amber bar
│ PS         [██░░░░░░░░░░░░░░░░░░] 2/8   · 25%        │  ← amber bar
│ MIS        [████████████████████] 4/4   · 100%       │  ← green bar
└──────────────────────────────────────────────────────┘
```
Bar color: ≥80% → `#16a34a` green | ≥50% → `#004ac6` blue | <50% → `#d97706` amber

#### Task Directory (Full-width table)
```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Enterprise Task Directory              [🔍 Search tasks...]                              │
│ 23 tasks                                                                                 │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ Filters: [All Departments ▾] [All Statuses ▾] [All Priorities ▾]            Clear All   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ TASK ID  │ TASK                    │ DOER           │ DEPT       │ FREQ/PRI │ DUE  │ ACTUAL │ STATUS    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ CL-1     │ OFFICE WIFI KA BILL     │ [P] PRIYA      │ EA         │ Monthly  │ 25 Jun│  —    │ Pending   │
│ CL-2     │ SECURITY GUARD PHOTO... │ [P] PRIYA      │ EA         │ Daily    │ 22 Jun│ 22 Jun│ Completed │
│ TL-1     │ ENGINEER KA RESUME...  │ [SH] SHIKHA    │ HR         │ Normal   │ 22 Jun│  —    │ Pending   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Avatar:** 24px circle with coloured initials (each doer gets consistent color from hash)  
**Status pills:** Rounded-full badge, colored border + bg:
- Completed: `bg-green-100 text-green-700 border-green-200`
- Late: `bg-red-100 text-red-700 border-red-200`  
- Pending: `bg-amber-100 text-amber-700 border-amber-200`

**Pagination:** 10/25/50 per page, Prev/Next buttons, current page in blue pill

---

### 5.3 SCREEN: CHECKLIST

Same `TaskDirectory` component filtered to `source = "Checklist"` only.  
Column 5 shows **Frequency** (Daily / Weekly / Monthly).

Sample rows shown:
```
OFFICE WIFI KA BILL                     — PRIYA    — EA    — Monthly — 25 Jun — Pending
SECURITY GUARD PHOTO UPDATE             — PRIYA    — EA    — Daily   — 22 Jun — Completed
RAJENDRA & HITESH JI KO CALL & MSG DROP — SHIKHA  — HR    — Daily   — 22 Jun — Late
SITE EXPENSE KA DAILY UPDATE            — DEEPAK  — SUPVR — Daily   — 22 Jun — Pending
EMPORIO KA BIJLI KA BILL               — PRIYA    — EA    — Monthly — 15 Jun — Completed
GHAR KA BIJLI KA BILL                  — PRIYA    — EA    — Monthly — 18 Jun — Late
SANDEEP SE SHOWROOM KA BILL            — PRIYA    — EA    — Monthly — 01 Jun — Completed
MAYANK GARG KO BILL BHEJNA HAI         — PRIYA    — EA    — Monthly — 01 Jun — Late
```

---

### 5.4 SCREEN: TASK LIST (Delegation)

Same `TaskDirectory` filtered to `source = "Task List"`.  
Column 5 shows **Priority** pill (High=red, Medium=amber, Low=blue, Normal=muted).

Sample rows:
```
ID        TASK                                    DOER     DEPT    PRIORITY  DUE    ACTUAL  STATUS
qh9a8lx   ENGINEER KA RESUME DENA HAI SIR KO    SHIKHA   HR      Normal    22 Jun  —      Pending
sf6jdgz   WHITE DRESS KA REMINDER SABHI KO       PRIYA    EA      —         22 Jun  22 Jun  Completed
klxubuh   METER LAGNE KE BAAD COLONY CONNECTION  SANDEEP  PS      —         22 Jun  23 Jun  Pending
v9c9e3c   BIKANERWALA KA GRANITE CONFIRM          DEEPAK  SUPVR   —         22 Jun  22 Jun  Completed
7kfkvp2   OVERALL TASKLIST SCORING SEND           SAMIR   MIS     —         15 Jun  15 Jun  Completed
w20qqdn   3 NO KA POSSESSION                      DEEPAK  SUPVR   —         18 Jun  20 Jun  Pending (Late)
qczqqgq   OFFICE KI WOODEN FLOORING              SANDEEP  PS      —         07 Jun  09 Jun  Late
9u9619h   FIRE WALO SE NOC LENA HAI              DEEPAK   SUPVR   —         07 Jun  09 Jun  Late
```

---

### 5.5 SCREEN: WORKFLOW (Coming Soon)

Simple placeholder card:
```
┌──────────────────────────────────────────┐
│                                          │
│  [assignment icon — blue]               │
│                                          │
│  Workflow coming soon                   │
│                                          │
│  Workflow sheet abhi connect nahi hui   │
│  hai. Google Sheet share kar do —       │
│  yahi Done/Pending tracking ke saath    │
│  aa jayegi.                             │
│                                          │
└──────────────────────────────────────────┘
```

---

### 5.6 SCREEN: ADMIN LOGIN

Full-page centered card, clean premium feel:
```
┌────────────────────────────────────────┐
│                                        │
│   ThirtyMilestones                     │  ← Cormorant Garamond, display
│   MIS Dashboard                        │
│                                        │
│   Admin Access                         │
│                                        │
│   ┌──────────────────────────────┐     │
│   │  Username                    │     │
│   └──────────────────────────────┘     │
│   ┌──────────────────────────────┐     │
│   │  Password           👁        │     │
│   └──────────────────────────────┘     │
│                                        │
│   [  Sign In  ]  ← full width blue btn │
│                                        │
│   Incorrect credentials? Red error msg │
└────────────────────────────────────────┘
```

Background: same ambient gradient canvas as main app

---

### 5.7 SCREEN: SCORECARD (Admin Only)

**Headline KPI strip (5 cards):**
```
Overall %  |  Done  |  Late  |  Pending  |  Red Flags
  78%           15       3        5           2
[speed]     [check]  [clock] [pending]    [flag]
```

**Doer Leaderboard Table:**
```
┌────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬────────────┐
│Rank│ Doer                 │ Checklist             │ Task List            │ Workflow              │ Score      │
│    │                      │ Done │ Late │ Pend    │ Done │ Late │ Pend   │ Done │ Late │ Pend   │            │
├────┼──────────────────────┼──────┼──────┼─────────┼──────┼──────┼────────┼──────┼──────┼────────┼────────────┤
│ 🥇1│ [S] SAMIR  MIS       │  4   │  ·   │  ·      │  2   │  ·   │  ·     │  ·   │  ·   │  ·     │ 100% ████  │
│ 🥈2│ [D] DEEPAK SUPVR     │  ·   │  1   │  1      │  1   │  2   │  2     │  ·   │  ·   │  ·     │ 47%  ███   │
│ 🥉3│ [P] PRIYA  EA        │  4   │  2   │  2      │  1   │  ·   │  ·     │  ·   │  ·   │  ·     │ 56%  ████  │
│  4 │ [SH] SHIKHA HR       │  3   │  1   │  ·      │  1   │  2   │  2     │  ·   │  ·   │  ·     │ 57%  ████  │
│  5 │ [SA] SANDEEP PS      │  ·   │  ·   │  ·      │  1   │  3   │  2     │  ·   │  ·   │  ·     │ 17%  ██    │
└────┴──────────────────────┴──────┴──────┴─────────┴──────┴──────┴────────┴──────┴──────┴────────┴────────────┘
```

**Column colors:**
- Rank: medal 🥇🥈🥉 circles for top 3, plain number after
- Checklist header: blue (`#004ac6`)
- Task List header: green (`#16a34a`)
- Workflow header: blue (`#2563eb`)
- Done pill: `bg-green-100 text-green-700`
- Late pill: `bg-amber-100 text-amber-700`
- Pend pill: `bg-red-100 text-red-700`
- Empty cell: faded dot `·`
- Score: colored text (≥80%=green, ≥50%=blue, <50%=red) + mini progress bar
- Rows where score < 50% → light red row tint `bg-red-50/40`

---

## 6. Component Catalogue

### Glass Card
```
background: rgba(255,255,255,0.72)
backdrop-filter: blur(20px)
border: 1px solid #e5e7eb
border-radius: 18px
box-shadow: 0 4px 20px rgba(15,23,42,0.04)
hover: translateY(-2px), shadow 0 8px 24px rgba(15,23,42,0.08)
```

### Status Badge (pill)
```
Completed: bg-green-100 text-green-700 border-green-200
Late:      bg-red-100   text-red-700   border-red-200
Pending:   bg-amber-100 text-amber-700 border-amber-200
```
Shape: `rounded-full px-2.5 py-0.5 text-[11px] font-medium border`

### Doer Avatar
```
Size: 24×24px (table) or 28×28px (scorecard)
Shape: rounded-full
Colors (by doer name hash):
  blue-100/700 · emerald-100/700 · purple-100/700 · 
  teal-100/700 · amber-100/700 · rose-100/700
Content: up to 2 initials, uppercase, font-bold text-[11px]
```

### Score Bar
```
Width: 56px (w-14)
Height: 6px, rounded-full
Track: bg-surface-container-high
Fill: bg-success (≥80%) | bg-primary (≥50%) | bg-danger (<50%)
```

### Frequency Badge (Checklist)
```
Daily   → label only (text-on-surface-variant)
Weekly  → label only
Monthly → label only
```

### RAG Dot (Task List, for revision count)
```
0 revisions → Green  #16a34a
1 revision  → Yellow #d97706  
2+ revisions→ Red    #dc2626
```

### Priority Badge
```
High/Urgent → bg-red-50   text-danger   rounded px-2 py-1 text-xs font-semibold
Medium      → bg-amber-50  text-warning
Low         → bg-blue-50   text-primary
Normal/—    → plain text
```

---

## 7. Icon Set

All icons: **Material Symbols Outlined** (Google Fonts)

| Context | Icon name |
|---------|-----------|
| Dashboard / Overview | `dashboard` |
| Checklist | `checklist` |
| Task List | `assignment` |
| Workflow | `account_tree` |
| Scorecard | `leaderboard` |
| Total Tasks | `format_list_bulleted` |
| Completed | `check_circle` |
| Late | `schedule` |
| Pending | `pending_actions` |
| Completion % | `speed` |
| Red flags | `flag` |
| Department Bars | `bar_chart` |
| Donut Chart | `donut_large` |
| Week / Calendar | `calendar_month` |
| Search | `search` |
| Filter | `filter_alt` |
| Chevron right | `chevron_right` |
| Logout | `logout` |

---

## 8. Interactivity Spec

| Element | Interaction |
|---------|-------------|
| Sidebar nav items | Click → swap main content, no reload |
| Week Selector | Dropdown → filters ALL data client-side instantly (no refetch) |
| Donut segments | Hover → dims other segments 65%, center shows this segment's % + count + label |
| Legend rows | Hover → same donut highlight effect (bidirectional) |
| KPI cards | Hover → lifts 2px, deeper shadow |
| Table rows | Hover → `#f2f4f6` bg tint |
| Task search | Live filter as user types |
| Dept/Status/Priority dropdowns | Instant filter, "Clear All" link appears |
| Pagination | 10/25/50 per page, Prev/Next |
| Admin login | Wrong password → red error under form, no page reload |

---

## 9. Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| Mobile (`< sm`) | Sidebar hidden → bottom tab bar; single-column KPI cards (2×2 grid); table scrolls horizontally |
| Tablet (`sm-lg`) | Sidebar visible; KPI in 2×3 grid; donut + dept stacked |
| Desktop (`≥ lg`) | Full layout: sidebar + 5 KPI + donut (1/3) + dept (2/3) + table |

---

## 10. Data Flow Summary

```
Google Sheets (TASKLIST + CHECKLIST)
         │
         ▼
Apps Script Web App (doGet)
  → reads both sheets by ID
  → normalises column names
  → returns JSON: { doers[], departments[], checklist[], delegation[], availableWeeks[] }
         │
         ▼
Frontend fetch (ONE request, ?week=all)
  → dropExcludedDoers() — removes ex-staff
  → filterByWeek() — client-side, instant
  → unifyTasks() — merges checklist + delegation into unified status
  → kpis() / statusBreakdown() / departmentPerformance() / doerSummaries()
         │
         ▼
Dashboard renders from derived metrics
```

**Live/Sample toggle:**
- `APPS_SCRIPT_URL` set → fetches live data
- Empty URL or fetch fails → falls back to bundled sample data
- Badge in topbar shows which mode is active

---

## 11. Admin Auth

- **Login:** Username `admin`, Password `Sahil@30`
- **Storage:** `localStorage` key `tm_mis_auth` (session token, not plaintext)
- **Verify:** Salted SHA-256 (`TM-MIS::v1::<input>` → compare against stored hash)
- **Logout:** Clears localStorage, returns to login screen

---

## 12. Deployment

- **Hosting:** Vercel (static SPA)
- **SPA routing:** Catch-all rewrite → `/index.html`
- **Admin access:** `/admin` path (or `/#admin` hash fallback)
- **Build:** Vite 5, React 18, TypeScript, Tailwind CSS v3, shadcn/ui

---

## 13. Sample Numbers for Mock UI

Use these exact figures when generating UI mockups:

**KPI Strip:**
```
Total: 23  |  Completed: 15  |  Late: 4  |  Pending: 4  |  Completion: 72%
```

**Donut Segments:**
```
Completed: 15 (65%)  — #16a34a green
Late:       4 (17%)  — #dc2626 red
Pending:    4 (17%)  — #d97706 amber
```

**Department Performance:**
```
MIS        100%   4/4    ████████████████████  green
EA          72%  13/18   ██████████████░░░░░░  blue
HR          56%   9/16   ████████████░░░░░░░░  blue
ACCOUNTS    75%   3/4    ███████████████░░░░░  green
SUPERVISOR  44%   4/9    █████████░░░░░░░░░░░  amber
PS          33%   2/6    ██████░░░░░░░░░░░░░░  amber
```

**Scorecard Leaderboard:**
```
#1 SAMIR    MIS   — CL: 4/0/0  TL: 2/0/0  FMS: —  Score: 100% ●
#2 PRIYA    EA    — CL: 4/2/2  TL: 1/0/0  FMS: —  Score: 63%  ●
#3 SHIKHA   HR    — CL: 3/0/1  TL: 1/2/2  FMS: —  Score: 50%  ●
#4 DEEPAK   SUPVR — CL: 0/1/1  TL: 1/2/2  FMS: —  Score: 22%  ●
#5 SANDEEP  PS    — CL: 0/0/0  TL: 1/3/2  FMS: —  Score: 17%  ●
```
*(columns: Done / Late / Pending per system)*

---

*End of design brief. This document covers all screens, all real data, all component specs, colors, typography, interactions, and exact sample numbers needed to generate professional UI mockups.*
