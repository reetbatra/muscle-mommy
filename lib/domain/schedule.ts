/**
 * Which day of the split comes next.
 *
 * Deliberately driven by the last session actually finished rather than the
 * calendar, because skipping a Tuesday should not skip Lower A.
 */
export type ScheduleDay = { id: string; day_index: number; rest_after: boolean };

export function nextRoutineDay<T extends ScheduleDay>(
  days: T[],
  lastFinishedRoutineDayId: string | null,
): T | null {
  if (days.length === 0) return null;
  const ordered = [...days].sort((a, b) => a.day_index - b.day_index);
  if (!lastFinishedRoutineDayId) return ordered[0];

  const lastIndex = ordered.findIndex((d) => d.id === lastFinishedRoutineDayId);
  if (lastIndex === -1) return ordered[0];
  return ordered[(lastIndex + 1) % ordered.length];
}

/** True when the split says to rest after the day just completed. */
export function isRestDay<T extends ScheduleDay>(
  days: T[],
  lastFinishedRoutineDayId: string | null,
  lastFinishedDateISO: string | null,
  todayISO: string,
): boolean {
  if (!lastFinishedRoutineDayId || !lastFinishedDateISO) return false;
  if (lastFinishedDateISO !== todayISO) return false;
  const last = days.find((d) => d.id === lastFinishedRoutineDayId);
  return Boolean(last?.rest_after);
}
