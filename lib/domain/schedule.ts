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

/**
 * How many days ago each training day was, walking backwards through the cycle
 * from the one just completed. Rest days occupy a slot, so a split of
 * "Upper A, Lower A, rest, Upper B, Lower B" spaces itself over five days
 * rather than four.
 */
export function cycleOffsets(
  days: { restAfter?: boolean }[],
  lastCompletedDayIndex: number | null,
): Map<number, number> {
  const slots: { dayIndex: number | null }[] = [];
  for (const [index, day] of days.entries()) {
    slots.push({ dayIndex: index });
    if (day.restAfter) slots.push({ dayIndex: null });
  }
  if (slots.length === 0) return new Map();

  const requested =
    lastCompletedDayIndex === null
      ? -1
      : slots.findIndex((slot) => slot.dayIndex === lastCompletedDayIndex);
  // Nothing said, so treat the cycle as having just finished.
  const anchor = requested >= 0 ? requested : slots.length - 1;

  const offsets = new Map<number, number>();
  for (const [position, slot] of slots.entries()) {
    if (slot.dayIndex === null) continue;
    const distance = (anchor - position + slots.length) % slots.length;
    // Negating zero gives -0, which is a real value that compares unequal to 0
    // and has no business ending up in a map of day offsets.
    offsets.set(slot.dayIndex, distance === 0 ? 0 : -distance);
  }
  return offsets;
}
