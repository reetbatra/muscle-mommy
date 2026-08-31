/**
 * All day-boundaries are resolved in the user's own timezone, never the
 * server's. A workout logged at 11pm in Mumbai belongs to that Mumbai day.
 */

export function todayISO(timezone: string): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape Postgres wants.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetweenISO(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function isoRange(endISO: string, length: number): string[] {
  return Array.from({ length }, (_, i) => addDaysISO(endISO, i - (length - 1)));
}

export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function prettyDate(iso: string, today: string): string {
  const diff = daysBetweenISO(iso, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function safeTimezone(candidate: string | null | undefined): string {
  if (!candidate) return "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: candidate });
    return candidate;
  } catch {
    return "UTC";
  }
}
