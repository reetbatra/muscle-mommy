import { describe, expect, it } from "vitest";
import { selectLatestSets, type HistoryRow } from "../history";
import { cycleOffsets, todayState } from "../schedule";
import { prescribe, DEFAULT_LOAD_CONFIG } from "../overload";

/**
 * The case that motivated all of this: a hip thrust done at 45kg on Lower A
 * and 40kg on Lower B. One exercise, two honest histories.
 */
const LOWER_A = "lower-a";
const LOWER_B = "lower-b";
const HIP_THRUST = "hip-thrust";

function rows(
  spec: {
    session: string;
    date: string;
    day: string | null;
    weight: number;
    reps: number[];
    finished?: boolean;
  }[],
): HistoryRow[] {
  return spec.flatMap((s) =>
    s.reps.map((reps, i) => ({
      exerciseId: HIP_THRUST,
      sessionId: s.session,
      sessionDate: s.date,
      finishedAt: s.finished === false ? null : `${s.date}T10:00:00Z`,
      routineDayId: s.day,
      setIndex: i + 1,
      weightKg: s.weight,
      reps,
      isWarmup: false,
    })),
  );
}

const HISTORY = rows([
  { session: "s1", date: "2026-08-20", day: LOWER_A, weight: 45, reps: [15, 16, 14] },
  { session: "s2", date: "2026-08-24", day: LOWER_B, weight: 40, reps: [15, 15, 15] },
  { session: "s3", date: "2026-08-28", day: LOWER_A, weight: 45, reps: [16, 16, 15] },
]);

describe("selectLatestSets", () => {
  it("uses the last session of the same day, not the last session overall", () => {
    const lowerB = selectLatestSets(HISTORY, { preferRoutineDayId: LOWER_B });
    expect(lowerB[HIP_THRUST].map((s) => s.weight_kg)).toEqual([40, 40, 40]);
    expect(lowerB[HIP_THRUST].map((s) => s.reps)).toEqual([15, 15, 15]);
  });

  it("uses the same day for the other day too", () => {
    const lowerA = selectLatestSets(HISTORY, { preferRoutineDayId: LOWER_A });
    expect(lowerA[HIP_THRUST].map((s) => s.weight_kg)).toEqual([45, 45, 45]);
    expect(lowerA[HIP_THRUST].map((s) => s.reps)).toEqual([16, 16, 15]);
  });

  it("falls back to any day when the lift is new to this one", () => {
    const newDay = selectLatestSets(HISTORY, { preferRoutineDayId: "lower-c" });
    // Nothing on Lower C yet, so the most recent session anywhere stands in.
    expect(newDay[HIP_THRUST].map((s) => s.weight_kg)).toEqual([45, 45, 45]);
  });

  it("takes the most recent overall when no day is given", () => {
    const anyDay = selectLatestSets(HISTORY);
    expect(anyDay[HIP_THRUST][0].weight_kg).toBe(45);
    expect(anyDay[HIP_THRUST].map((s) => s.reps)).toEqual([16, 16, 15]);
  });

  it("ignores a session that was never finished", () => {
    const withOpen = [
      ...HISTORY,
      ...rows([
        { session: "s4", date: "2026-08-31", day: LOWER_B, weight: 50, reps: [5], finished: false },
      ]),
    ];
    const lowerB = selectLatestSets(withOpen, { preferRoutineDayId: LOWER_B });
    expect(lowerB[HIP_THRUST][0].weight_kg).toBe(40);
  });

  it("ignores the session currently being logged", () => {
    const lowerA = selectLatestSets(HISTORY, {
      preferRoutineDayId: LOWER_A,
      excludeSessionId: "s3",
    });
    expect(lowerA[HIP_THRUST].map((s) => s.reps)).toEqual([15, 16, 14]);
  });

  it("returns nothing for a lift with no history", () => {
    expect(selectLatestSets([], { preferRoutineDayId: LOWER_A })).toEqual({});
  });

  it("keeps sets in set order regardless of row order", () => {
    const shuffled = [...HISTORY].reverse();
    const lowerB = selectLatestSets(shuffled, { preferRoutineDayId: LOWER_B });
    expect(lowerB[HIP_THRUST].map((s) => s.set_index)).toEqual([1, 2, 3]);
  });
});

describe("day-scoped history feeds the right prescription", () => {
  const opts = {
    targetSets: 3,
    repLow: 8,
    repHigh: 12,
    repCeilingMax: 20,
    loadType: "machine" as const,
    config: DEFAULT_LOAD_CONFIG,
  };

  it("moves Lower B up from 40kg, not down from 45kg", () => {
    const sets = selectLatestSets(HISTORY, { preferRoutineDayId: LOWER_B })[HIP_THRUST];
    const plan = prescribe(sets, opts);
    expect(plan.status).toBe("add-weight");
    expect(plan.weightKg).toBe(45);
  });

  it("moves Lower A up from 45kg independently", () => {
    const sets = selectLatestSets(HISTORY, { preferRoutineDayId: LOWER_A })[HIP_THRUST];
    const plan = prescribe(sets, opts);
    expect(plan.status).toBe("add-weight");
    expect(plan.weightKg).toBe(50);
  });
});

describe("cycleOffsets", () => {
  // Upper A, Lower A, rest, Upper B, Lower B.
  const split = [{}, { restAfter: true }, {}, {}];

  it("places the day just trained at today and walks the rest backwards", () => {
    const offsets = cycleOffsets(split, 1);
    expect(offsets.get(1)).toBe(0); // Lower A, today
    expect(offsets.get(0)).toBe(-1); // Upper A, yesterday
    expect(offsets.get(3)).toBe(-2); // Lower B
    expect(offsets.get(2)).toBe(-3); // Upper B
  });

  it("counts the rest day as a day", () => {
    const offsets = cycleOffsets(split, 1);
    // Four training days spread over a five-day cycle.
    expect(Math.min(...offsets.values())).toBe(-3);
    expect(new Set(offsets.values()).size).toBe(4);
  });

  it("treats the cycle as just finished when nothing is said", () => {
    const offsets = cycleOffsets(split, null);
    // Lower B today, then Upper B, the rest day, Lower A, Upper A behind it.
    expect(offsets.get(3)).toBe(0);
    expect(offsets.get(2)).toBe(-1);
    expect(offsets.get(1)).toBe(-3);
    expect(offsets.get(0)).toBe(-4);
  });

  it("handles a split with no rest days", () => {
    const offsets = cycleOffsets([{}, {}, {}], 0);
    expect(offsets.get(0)).toBe(0);
    expect(offsets.get(2)).toBe(-1);
    expect(offsets.get(1)).toBe(-2);
  });

  it("copes with an empty split", () => {
    expect(cycleOffsets([], null).size).toBe(0);
  });
});

describe("todayState", () => {
  const days = [
    { id: "ua", day_index: 1, rest_after: false },
    { id: "la", day_index: 2, rest_after: true },
    { id: "ub", day_index: 3, rest_after: false },
    { id: "lb", day_index: 4, rest_after: false },
  ];

  it("says done when you already trained today", () => {
    expect(todayState(days, { routineDayId: "la", dateISO: "2026-08-31" }, "2026-08-31")).toEqual({
      kind: "done",
    });
  });

  it("puts the rest day after the session that earns it, not on it", () => {
    // Lower A on the 30th, so the 31st is the rest day and the 1st is Upper B.
    expect(todayState(days, { routineDayId: "la", dateISO: "2026-08-30" }, "2026-08-31")).toEqual({
      kind: "rest",
    });
    expect(
      todayState(days, { routineDayId: "la", dateISO: "2026-08-30" }, "2026-09-01"),
    ).toMatchObject({ kind: "next", day: { id: "ub" } });
  });

  it("does not rest after a day that earns no rest", () => {
    expect(
      todayState(days, { routineDayId: "ua", dateISO: "2026-08-30" }, "2026-08-31"),
    ).toMatchObject({ kind: "next", day: { id: "la" } });
  });

  it("stops resting once the rest day has passed", () => {
    expect(
      todayState(days, { routineDayId: "la", dateISO: "2026-08-25" }, "2026-08-31"),
    ).toMatchObject({ kind: "next", day: { id: "ub" } });
  });

  it("starts at day one with no history", () => {
    expect(todayState(days, { routineDayId: null, dateISO: null }, "2026-08-31")).toMatchObject({
      kind: "next",
      day: { id: "ua" },
    });
  });
});
