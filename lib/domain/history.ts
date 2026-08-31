import type { LoggedSet } from "./overload";

export type HistoryRow = {
  exerciseId: string;
  sessionId: string;
  sessionDate: string;
  finishedAt: string | null;
  routineDayId: string | null;
  setIndex: number;
  weightKg: number;
  reps: number;
  isWarmup: boolean;
};

export type HistoryOptions = {
  excludeSessionId?: string;
  /**
   * The day of the split being planned. The same lift often appears on two
   * days at two different working weights, and those are two separate
   * histories: comparing across them reads as a regression every other
   * session and prescribes the wrong load.
   */
  preferRoutineDayId?: string | null;
};

/**
 * The sets from the most recent finished session for each exercise, preferring
 * the same day of the split and falling back to any day when that lift has no
 * history on this one yet.
 */
export function selectLatestSets(
  rows: HistoryRow[],
  options: HistoryOptions = {},
): Record<string, LoggedSet[]> {
  type Candidate = { date: string; sessionId: string; sets: LoggedSet[] };

  const sameDay = new Map<string, Candidate>();
  const anyDay = new Map<string, Candidate>();

  for (const row of rows) {
    if (options.excludeSessionId && row.sessionId === options.excludeSessionId) continue;
    // Unfinished sessions are abandoned or in progress. Neither is history.
    if (!row.finishedAt) continue;

    const isSameDay =
      options.preferRoutineDayId != null && row.routineDayId === options.preferRoutineDayId;

    for (const [bucket, applies] of [
      [sameDay, isSameDay],
      [anyDay, true],
    ] as const) {
      if (!applies) continue;
      const current = bucket.get(row.exerciseId);
      if (!current || row.sessionDate > current.date) {
        bucket.set(row.exerciseId, { date: row.sessionDate, sessionId: row.sessionId, sets: [] });
      }
      const entry = bucket.get(row.exerciseId)!;
      // A newer session wins outright; sets from older ones are dropped.
      if (row.sessionId !== entry.sessionId) continue;
      entry.sets.push({
        weight_kg: row.weightKg,
        reps: row.reps,
        is_warmup: row.isWarmup,
        set_index: row.setIndex,
      });
    }
  }

  const result: Record<string, LoggedSet[]> = {};
  for (const exerciseId of new Set([...sameDay.keys(), ...anyDay.keys()])) {
    const chosen = sameDay.get(exerciseId) ?? anyDay.get(exerciseId);
    if (!chosen) continue;
    result[exerciseId] = chosen.sets.sort((a, b) => a.set_index - b.set_index);
  }
  return result;
}
