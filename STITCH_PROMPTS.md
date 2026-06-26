# ThirtyMilestones MIS — Google Stitch Prompts

> **Kaise use kare:** Har screen ka block alag se copy karo aur Google Stitch (stitch.withgoogle.com) me paste karo. Pehle "Style Guide" wala block paste karke base theme set karo, phir ek-ek screen generate karo. Stitch English me best kaam karta hai isliye prompts English me hai.

---

## 🎨 STEP 1 — Style Guide (sabse pehle yeh paste karo)

```
Design a professional executive dashboard web app called "ThirtyMilestones MIS"
for a real estate company. 

Visual style:
- Clean, premium, modern glassmorphism. Light theme.
- Background: soft off-white (#f7f9fb) with subtle blue ambient gradient glow in corners.
- Cards: frosted white glass with 18px rounded corners, soft shadow, thin light-gray border (#e5e7eb).
- Primary brand color: executive blue #004ac6.
- Accent/status colors: green #16a34a (completed), red #dc2626 (late), amber #d97706 (pending).
- Typography: Inter for UI text, Cormorant Garamond serif for big headings. Numbers are bold and tabular.
- Generous white space, soft shadows, subtle hover lift on cards.
- Use Material Symbols outlined icons throughout.
- Overall feel: enterprise SaaS, trustworthy, calm, data-focused — like Linear or Vercel dashboard.
```

---

## 📊 SCREEN 1 — Main Dashboard (Overview)

```
Create the main dashboard screen for "ThirtyMilestones MIS" executive web app.

Layout: Fixed left sidebar (240px) + top bar + main content area.

LEFT SIDEBAR (white glass, right border):
- Top: brand "ThirtyMilestones" with subtitle "MIS Dashboard"
- Nav items with icons: Dashboard (active, blue highlight with left accent bar), 
  Checklist, Task List, Workflow.

TOP BAR (glass, blur):
- Left: breadcrumb "Overview > Dashboard"
- Right: a week selector dropdown showing "21 Jun – 27 Jun 2026", 
  and a green "Live" status badge with a dot.

MAIN CONTENT:

Row 1 — Five KPI cards in a row:
- "Total Tasks" 23 (blue list icon)
- "Completed" 15 (green check icon)
- "Late" 4 (red clock icon)
- "Pending" 4 (amber pending icon)
- "Completion %" 72% as a gradient BLUE card with white text and a white progress bar inside.

Row 2 — two cards side by side:
- LEFT (1/3 width) "Task Status" donut chart. Donut with 3 segments: 
  Completed 65% green, Late 17% red, Pending 17% amber. Center shows "23 Tasks". 
  Right side legend: colored dot + label + count + percentage for each.
- RIGHT (2/3 width) "Department Performance" horizontal bar chart:
  MIS 100% (4/4) green, EA 72% (13/18) blue, HR 56% (9/16) blue, 
  ACCOUNTS 75% (3/4) green, SUPERVISOR 44% (4/9) amber, PS 33% (2/6) amber.
  Each row: department name, horizontal progress bar, "done/total · percent".

Row 3 — full-width "Enterprise Task Directory" table card:
- Header: title + count "23 tasks" + search box.
- Filter row: dropdowns "All Departments", "All Statuses", "All Priorities".
- Table columns: Task ID, Task, Doer (colored circle avatar with initials + name), 
  Department, Frequency, Due Date, Actual, Status (colored rounded pill).
- Sample rows:
  - CL-2 | SECURITY GUARD PHOTO UPDATE | PRIYA | EA | Daily | 22 Jun | 22 Jun | Completed (green)
  - CL-1 | OFFICE WIFI KA BILL | PRIYA | EA | Monthly | 25 Jun | — | Pending (amber)
  - CL-3 | RAJENDRA & HITESH JI KO CALL | SHIKHA | HR | Daily | 22 Jun | 23 Jun | Late (red)
  - TL-1 | ENGINEER KA RESUME DENA HAI | SHIKHA | HR | Normal | 22 Jun | — | Pending (amber)
- Pagination at bottom: "Showing 1–10 of 23", per-page selector, Prev/Next, current page blue.

Use the glassmorphism style with blue accent. Clean enterprise look.
```

---

## ✅ SCREEN 2 — Checklist Page

```
Create the "Checklist" page for ThirtyMilestones MIS dashboard. 
Same sidebar (now "Checklist" nav item is active) and top bar.

Main content: a single full-width table card titled "Checklist" with subtitle "12 tasks".
Search box + filters (All Departments, All Statuses).
Columns: Task ID, Task, Doer (avatar+name), Department, Frequency, Due Date, Actual, Status.

Rows (real data):
- OFFICE WIFI KA BILL | PRIYA | EA | Monthly | 25 Jun | — | Pending (amber pill)
- SECURITY GUARD PHOTO UPDATE | PRIYA | EA | Daily | 22 Jun | 22 Jun | Completed (green pill)
- RAJENDRA & HITESH JI KO CALL & MSG DROP | SHIKHA | HR | Daily | 22 Jun | 23 Jun | Late (red pill)
- SITE EXPENSE KA DAILY UPDATE | DEEPAK | SUPERVISOR | Daily | 22 Jun | — | Pending (amber)
- EMPORIO KA BIJLI KA BILL | PRIYA | EA | Monthly | 15 Jun | 15 Jun | Completed (green)
- GHAR KA BIJLI KA BILL | PRIYA | EA | Monthly | 18 Jun | 19 Jun | Late (red)
- SANDEEP SE SHOWROOM KA BILL MANGWANA | PRIYA | EA | Monthly | 01 Jun | 01 Jun | Completed (green)
- MAYANK GARG KO BILL BHEJNA HAI | PRIYA | EA | Monthly | 01 Jun | 02 Jun | Late (red)

Doer avatars: colored circles with initials (PRIYA=blue, SHIKHA=purple, DEEPAK=teal).
Glassmorphism, blue accent, premium enterprise style.
```

---

## 📋 SCREEN 3 — Task List Page

```
Create the "Task List" page for ThirtyMilestones MIS dashboard.
Same sidebar ("Task List" active) and top bar.

Full-width table card titled "Task List" subtitle "18 tasks".
Search + filters (All Departments, All Statuses, All Priorities).
Columns: Task ID, Task, Doer (avatar+name), Department, Priority (colored badge), 
Due Date, Actual, Status (colored pill).

Rows:
- qh9a8lx | ENGINEER KA RESUME DENA HAI SIR KO | SHIKHA | HR | Normal | 22 Jun | — | Pending
- sf6jdgz | WHITE DRESS KA REMINDER SABHI KO | PRIYA | EA | — | 22 Jun | 22 Jun | Completed
- klxubuh | METER LAGNE KE BAAD COLONY CONNECTION | SANDEEP | PS | — | 22 Jun | 23 Jun | Pending
- v9c9e3c | BIKANERWALA KA GRANITE CONFIRM | DEEPAK | SUPERVISOR | — | 22 Jun | 22 Jun | Completed
- 7kfkvp2 | OVERALL TASKLIST SCORING SEND | SAMIR | MIS | — | 15 Jun | 15 Jun | Completed
- qczqqgq | OFFICE KI WOODEN FLOORING | SANDEEP | PS | — | 07 Jun | 09 Jun | Late
- 9u9619h | FIRE WALO SE NOC LENA HAI | DEEPAK | SUPERVISOR | — | 07 Jun | 09 Jun | Late
- ts17xqv | CALLING MANAGEMENT GIRL HIRING | SHIKHA | HR | — | 08 Jun | 09 Jun | Late

Priority badges: High/Urgent=red, Medium=amber, Low=blue, Normal=gray.
Status pills: Completed=green, Late=red, Pending=amber.
Glassmorphism, blue accent.
```

---

## 🏆 SCREEN 4 — Admin Scorecard (Leaderboard)

```
Create an admin "Performance Scorecard" screen for ThirtyMilestones MIS dashboard.
Left sidebar with "Scorecard" active and a logout button at bottom. Top bar shows "Scoring".

Page heading: "Performance Scorecard" with subtitle 
"Har doer ki poori scoring — Checklist, Task List aur Workflow."

Row 1 — Five stat cards:
- "Overall" 72% (blue speed icon)
- "Done" 15 (green check icon)
- "Late" 4 (amber clock icon)
- "Pending" 4 (amber pending icon)
- "Red Flags" 2 (red flag icon)

Row 2 — "Doer Leaderboard" table card. This is a grouped-column table:
- Columns grouped under 3 system headers: "CHECKLIST" (blue), "TASK LIST" (green), "WORKFLOW" (blue).
- Under each system header: three sub-columns "Done", "Late", "Pend".
- Leftmost: "Rank" (gold/silver/bronze medal circles for top 3) and "Doer" (avatar + name + department).
- Rightmost: "Score" — big colored percentage + a mini progress bar.

Rows (Done/Late/Pend per system):
- 🥇 1 | SAMIR (MIS) | CL: 4/·/· | TL: 2/·/· | WF: ·/·/· | Score 100% green
- 🥈 2 | PRIYA (EA) | CL: 4/2/2 | TL: 1/·/· | WF: ·/·/· | Score 63% blue
- 🥉 3 | SHIKHA (HR) | CL: 3/·/1 | TL: 1/2/2 | WF: ·/·/· | Score 50% blue
-    4 | DEEPAK (SUPERVISOR) | CL: ·/1/1 | TL: 1/2/2 | WF: ·/·/· | Score 22% red (row tinted light red)
-    5 | SANDEEP (PS) | CL: ·/·/· | TL: 1/3/2 | WF: ·/·/· | Score 17% red (row tinted light red)

Number pills: Done=green bg, Late=amber bg, Pend=red bg. Empty cells show a faded dot "·".
Rows below 50% score get a subtle red background tint.
Glassmorphism, premium enterprise data-table look, blue accent.
```

---

## 🔐 SCREEN 5 — Admin Login

```
Create a premium login screen for "ThirtyMilestones MIS" admin panel.
Centered card on a soft off-white background with subtle blue gradient glow.

Card contents:
- Big elegant serif heading "ThirtyMilestones" (Cormorant Garamond style) 
  with subtitle "MIS Dashboard".
- Small label "Admin Access".
- Username input field (with person icon).
- Password input field (with lock icon and a show/hide eye toggle).
- Full-width blue "Sign In" button.
- A small muted helper line below.

Style: frosted glass card, 18px rounded corners, soft shadow, blue accent #004ac6.
Clean, minimal, trustworthy enterprise feel.
```

---

## 📱 SCREEN 6 (Optional) — Mobile Dashboard

```
Create the MOBILE version of the ThirtyMilestones MIS dashboard.
- No sidebar; instead a bottom tab bar with icons: Dashboard, Checklist, Task List, Workflow.
- Top bar: app title + week selector + Live badge.
- KPI cards in a 2-column grid (Total Tasks, Completed, Late, Pending), 
  then a full-width gradient blue "Completion 72%" card.
- Below: the "Task Status" donut chart card with legend.
- Below: "Department Performance" bars card.
- Below: a compact task list (cards instead of table rows), each showing task name, 
  doer avatar, and a colored status pill.
Glassmorphism light theme, blue accent, touch-friendly spacing.
```

---

## 💡 Tips (Stitch ke liye)

- **Ek baar me ek screen** generate karo — better results milte hai.
- Pehle Style Guide block daalo, phir us chat me hi screens maango taaki theme consistent rahe.
- Color hex codes Stitch samajhta hai — woh exact use karega.
- Agar koi cheez change karni ho toh follow-up me bolo, e.g. *"make the sidebar darker"* ya *"use bigger fonts for the KPI numbers"*.
- Generate hone ke baad Stitch se **code export** (HTML/CSS ya Figma) le sakte ho.
- Real Hinglish task names jaan-bujh ke rakhe hai taaki UI authentic dikhe — chaaho toh English placeholder bhi maang sakte ho.

---

*Yeh prompts seedhe Google Stitch me copy-paste karne ke liye ready hai. Pura real data aur exact colors include hai.*
