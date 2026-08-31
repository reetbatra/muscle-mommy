/**
 * Cycle phase from period-start dates. Deliberately simple: it labels the day
 * so training and appetite make sense in hindsight, and it does not pretend to
 * predict ovulation.
 */

export type CyclePhase = "period" | "follicular" | "ovulation" | "luteal" | "unknown";

export const PHASE_COPY: Record<CyclePhase, { label: string; note: string }> = {
  period: { label: "Period", note: "Lower the bar. Showing up counts." },
  follicular: { label: "Follicular", note: "Strength usually climbs here. Push the lifts." },
  ovulation: { label: "Ovulation", note: "Peak energy. Good week for a personal best." },
  luteal: { label: "Luteal", note: "Appetite and fatigue run high. Protein and sleep matter more." },
  unknown: { label: "Cycle", note: "Log a period day and this fills itself in." },
};

export function cycleDayFor(logDateISO: string, periodStarts: string[]): number | null {
  const past = periodStarts.filter((d) => d <= logDateISO).sort();
  const last = past.at(-1);
  if (!last) return null;
  const day = diffDays(last, logDateISO) + 1;
  return day > 60 ? null : day;
}

export function phaseFor(cycleDay: number | null, averageLength = 28): CyclePhase {
  if (cycleDay === null) return "unknown";
  if (cycleDay <= 5) return "period";
  const ovulation = Math.round(averageLength - 14);
  if (cycleDay < ovulation - 1) return "follicular";
  if (cycleDay <= ovulation + 1) return "ovulation";
  return "luteal";
}

/** A new period start is any flow day with no flow in the previous 3 days. */
export function derivePeriodStarts(flowDays: { log_date: string; flow: string }[]): string[] {
  const bleeding = flowDays
    .filter((d) => d.flow !== "none")
    .map((d) => d.log_date)
    .sort();
  const starts: string[] = [];
  for (const date of bleeding) {
    const previous = starts.length > 0 ? bleeding[bleeding.indexOf(date) - 1] : undefined;
    if (!previous || diffDays(previous, date) > 3) starts.push(date);
  }
  return starts;
}

export function averageCycleLength(periodStarts: string[]): number {
  const sorted = [...periodStarts].sort();
  if (sorted.length < 2) return 28;
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = diffDays(sorted[i - 1], sorted[i]);
    if (gap >= 18 && gap <= 45) gaps.push(gap);
  }
  if (gaps.length === 0) return 28;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
