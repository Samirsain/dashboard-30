import { SCORE_THRESHOLDS } from "@/lib/config";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ISO YYYY-MM-DD → "15 Jun"; blank → em dash.
export function fmtDate(iso?: string): string {
  const s = String(iso ?? "").trim();
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${Number(d)} ${MONTHS[Number(m) - 1] || m}`;
}

export function pctText(pct: number | null | undefined): string {
  return pct === null || pct === undefined ? "—" : `${pct}%`;
}

export type ScoreVariant = "ok" | "warn" | "bad" | "muted";

// Completion % → colour bucket (PRD §7.3 thresholds).
export function scoreVariant(pct: number | null | undefined): ScoreVariant {
  if (pct === null || pct === undefined) return "muted";
  if (pct >= SCORE_THRESHOLDS.GOOD) return "ok";
  if (pct >= SCORE_THRESHOLDS.WARN) return "warn";
  return "bad";
}
