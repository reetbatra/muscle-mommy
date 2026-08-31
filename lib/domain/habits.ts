import {
  BookOpen,
  Droplets,
  Dumbbell,
  Footprints,
  HandHeart,
  Heart,
  Milk,
  Moon,
  Pill,
  Salad,
  Smile,
  Sparkles,
  Sun,
  Wheat,
  type LucideIcon,
} from "lucide-react";

/**
 * Habits store a Lucide icon name rather than an emoji so the UI stays on one
 * icon set. Unknown names fall back to a sparkle instead of rendering nothing.
 */
export const HABIT_ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  droplets: Droplets,
  dumbbell: Dumbbell,
  footprints: Footprints,
  "hand-heart": HandHeart,
  heart: Heart,
  milk: Milk,
  moon: Moon,
  pill: Pill,
  salad: Salad,
  smile: Smile,
  sparkles: Sparkles,
  sun: Sun,
  wheat: Wheat,
};

export const HABIT_ICON_NAMES = Object.keys(HABIT_ICONS);

export function habitIcon(name: string): LucideIcon {
  return HABIT_ICONS[name] ?? Sparkles;
}

export const HABIT_CATEGORIES = [
  { key: "fuel", label: "Fuel", blurb: "Supplements, protein, fibre, water" },
  { key: "wellness", label: "Wellness", blurb: "Teeth, skin, body" },
  { key: "mind", label: "Mind", blurb: "Reading and everything else" },
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number]["key"];

/**
 * Counts back from today. Today not being done yet does not break a streak,
 * because it is not over yet. Missing yesterday does.
 */
export function streakLength(completedDates: Set<string>, todayISO: string): number {
  let streak = 0;
  let cursor = todayISO;
  if (!completedDates.has(cursor)) cursor = shift(cursor, -1);
  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }
  return streak;
}

function shift(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Share of the day's habit targets that are met, 0 to 1. */
export function dayCompletion(
  habits: { id: string; target_per_day: number }[],
  counts: Record<string, number>,
): { done: number; total: number; ratio: number } {
  const total = habits.length;
  const done = habits.filter((h) => (counts[h.id] ?? 0) >= h.target_per_day).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}
