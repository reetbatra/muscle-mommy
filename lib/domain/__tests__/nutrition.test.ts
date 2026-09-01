import { describe, expect, it } from "vitest";
import {
  energyBalance,
  macroLines,
  suggestCalorieTarget,
  suggestMaintenance,
  suggestProtein,
  sumMeals,
} from "../macros";
import { dayCompletion, streakLength } from "../habits";
import { averageCycleLength, cycleDayFor, derivePeriodStarts, phaseFor } from "../cycle";
import {
  addDaysISO,
  daysBetweenISO,
  isEditableDate,
  isoRange,
  prettyDate,
  resolveViewedDate,
} from "../dates";
import { nextRoutineDay } from "../schedule";

describe("sumMeals", () => {
  it("adds up a day of eating", () => {
    const totals = sumMeals([
      { kcal: 420, protein_g: 30, carbs_g: 40, fat_g: 12, fiber_g: 6 },
      { kcal: 610, protein_g: 45, carbs_g: 55, fat_g: 20, fiber_g: 9 },
    ]);
    expect(totals).toEqual({ kcal: 1030, protein_g: 75, carbs_g: 95, fat_g: 32, fiber_g: 15 });
  });

  it("treats missing macros as zero rather than NaN", () => {
    expect(sumMeals([{ kcal: 200 }]).protein_g).toBe(0);
  });
});

describe("macroLines", () => {
  const targets = { kcal: 1600, protein_g: 120, carbs_g: 150, fat_g: 55, fiber_g: 30 };

  it("treats protein and fibre as floors to reach", () => {
    const lines = macroLines({ kcal: 1400, protein_g: 118, carbs_g: 100, fat_g: 40, fiber_g: 12 }, targets);
    expect(lines.find((l) => l.key === "protein_g")).toMatchObject({ status: "hit", kind: "floor" });
    expect(lines.find((l) => l.key === "fiber_g")).toMatchObject({ status: "short", kind: "floor" });
  });

  it("treats carbs and fat as ceilings to stay under", () => {
    const lines = macroLines({ kcal: 2000, protein_g: 120, carbs_g: 200, fat_g: 50, fiber_g: 30 }, targets);
    expect(lines.find((l) => l.key === "carbs_g")?.status).toBe("over");
    expect(lines.find((l) => l.key === "fat_g")?.status).toBe("hit");
  });
});

describe("energyBalance", () => {
  const base = { maintenanceKcal: 1900, activeKcal: 300, calorieTarget: 1600 };

  it("waits rather than guessing before anything is logged", () => {
    expect(energyBalance({ ...base, consumed: 0 }).verdict).toBe("pending");
  });

  it("counts Apple Health active energy toward the burn", () => {
    const result = energyBalance({ ...base, consumed: 1500 });
    expect(result.burned).toBe(2200);
    expect(result.verdict).toBe("deficit");
    expect(result.headline).toBe("700 kcal deficit");
  });

  it("calls a near-even day maintenance instead of a win", () => {
    expect(energyBalance({ ...base, consumed: 2150 }).verdict).toBe("maintenance");
  });

  it("says surplus plainly", () => {
    const result = energyBalance({ ...base, consumed: 2700 });
    expect(result.verdict).toBe("surplus");
    expect(result.headline).toBe("500 kcal surplus");
  });

  it("reports what is left against the target", () => {
    expect(energyBalance({ ...base, consumed: 1200 }).remainingToTarget).toBe(400);
  });
});

describe("goal suggestions", () => {
  it("uses Mifflin-St Jeor for women", () => {
    // 60kg, 165cm, 27, lightly active.
    expect(suggestMaintenance({ weightKg: 60, heightCm: 165, age: 27, activity: "light" })).toBe(1840);
  });

  it("cuts 20% and never suggests below 1200", () => {
    expect(suggestCalorieTarget(2000)).toBe(1600);
    expect(suggestCalorieTarget(1200)).toBe(1200);
  });

  it("sets protein at 1.8 g per kg", () => {
    expect(suggestProtein(60)).toBe(108);
  });
});

describe("streakLength", () => {
  it("counts back from today", () => {
    const done = new Set(["2026-08-31", "2026-08-30", "2026-08-29"]);
    expect(streakLength(done, "2026-08-31")).toBe(3);
  });

  it("does not break the streak just because today is not done yet", () => {
    const done = new Set(["2026-08-30", "2026-08-29"]);
    expect(streakLength(done, "2026-08-31")).toBe(2);
  });

  it("breaks when yesterday was missed", () => {
    const done = new Set(["2026-08-29", "2026-08-28"]);
    expect(streakLength(done, "2026-08-31")).toBe(0);
  });

  it("is zero with no history", () => {
    expect(streakLength(new Set(), "2026-08-31")).toBe(0);
  });
});

describe("dayCompletion", () => {
  it("needs the full target, not one tap, for a twice-a-day habit", () => {
    const habits = [
      { id: "brush", target_per_day: 2 },
      { id: "read", target_per_day: 1 },
    ];
    expect(dayCompletion(habits, { brush: 1, read: 1 })).toMatchObject({ done: 1, total: 2 });
    expect(dayCompletion(habits, { brush: 2, read: 1 })).toMatchObject({ done: 2, ratio: 1 });
  });
});

describe("cycle", () => {
  const flow = [
    { log_date: "2026-08-01", flow: "medium" },
    { log_date: "2026-08-02", flow: "medium" },
    { log_date: "2026-08-03", flow: "light" },
    { log_date: "2026-08-29", flow: "medium" },
    { log_date: "2026-08-30", flow: "heavy" },
  ];

  it("finds period starts, not every bleeding day", () => {
    expect(derivePeriodStarts(flow)).toEqual(["2026-08-01", "2026-08-29"]);
  });

  it("counts the cycle day from the most recent start", () => {
    expect(cycleDayFor("2026-08-31", ["2026-08-01", "2026-08-29"])).toBe(3);
    expect(cycleDayFor("2026-07-15", ["2026-08-01"])).toBeNull();
  });

  it("labels the phase", () => {
    expect(phaseFor(3)).toBe("period");
    expect(phaseFor(10)).toBe("follicular");
    expect(phaseFor(14)).toBe("ovulation");
    expect(phaseFor(22)).toBe("luteal");
    expect(phaseFor(null)).toBe("unknown");
  });

  it("averages real cycle lengths and ignores nonsense gaps", () => {
    expect(averageCycleLength(["2026-08-01", "2026-08-29"])).toBe(28);
    expect(averageCycleLength(["2026-08-01"])).toBe(28);
  });
});

describe("dates", () => {
  it("moves across month boundaries", () => {
    expect(addDaysISO("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("measures gaps in whole days", () => {
    expect(daysBetweenISO("2026-08-01", "2026-08-31")).toBe(30);
  });

  it("builds a trailing range ending on the given day", () => {
    expect(isoRange("2026-08-31", 3)).toEqual(["2026-08-29", "2026-08-30", "2026-08-31"]);
  });

  it("says today and yesterday out loud", () => {
    expect(prettyDate("2026-08-31", "2026-08-31")).toBe("Today");
    expect(prettyDate("2026-08-30", "2026-08-31")).toBe("Yesterday");
    expect(prettyDate("2026-08-28", "2026-08-31")).toBe("3 days ago");
  });
});

describe("nextRoutineDay", () => {
  const days = [
    { id: "a", day_index: 1, rest_after: false },
    { id: "b", day_index: 2, rest_after: true },
    { id: "c", day_index: 3, rest_after: false },
    { id: "d", day_index: 4, rest_after: false },
  ];

  it("starts at day one with no history", () => {
    expect(nextRoutineDay(days, null)?.id).toBe("a");
  });

  it("advances by one and wraps around", () => {
    expect(nextRoutineDay(days, "b")?.id).toBe("c");
    expect(nextRoutineDay(days, "d")?.id).toBe("a");
  });

  it("does not skip a day just because the calendar did", () => {
    expect(nextRoutineDay(days, "a")?.id).toBe("b");
  });

  it("falls back to day one when the last day was deleted", () => {
    expect(nextRoutineDay(days, "gone")?.id).toBe("a");
  });

  // Rest-day timing now lives in todayState, covered in history.test.ts.
});

describe("energyBalance with Apple Health resting energy", () => {
  it("prefers measured resting energy over the estimate", () => {
    const result = energyBalance({
      consumed: 1500,
      maintenanceKcal: 1900,
      basalKcal: 1420,
      activeKcal: 380,
      calorieTarget: 1600,
    });
    expect(result.burnSource).toBe("health");
    expect(result.burned).toBe(1800);
    expect(result.headline).toBe("300 kcal deficit");
  });

  it("falls back to the estimate when Health sent nothing", () => {
    const result = energyBalance({
      consumed: 1500,
      maintenanceKcal: 1900,
      basalKcal: null,
      activeKcal: 380,
      calorieTarget: 1600,
    });
    expect(result.burnSource).toBe("estimate");
    expect(result.burned).toBe(2280);
  });
});

describe("resolveViewedDate", () => {
  const today = "2026-09-01";

  it("defaults to today when nothing is asked for", () => {
    expect(resolveViewedDate(undefined, today)).toBe(today);
  });

  it("shows a past day that was asked for", () => {
    expect(resolveViewedDate("2026-08-31", today)).toBe("2026-08-31");
  });

  it("refuses a future day", () => {
    expect(resolveViewedDate("2026-09-02", today)).toBe(today);
  });

  it("refuses anything that is not a date", () => {
    expect(resolveViewedDate("yesterday", today)).toBe(today);
    expect(resolveViewedDate("2026-13-45", today)).toBe(today);
    expect(resolveViewedDate("", today)).toBe(today);
  });

  it("allows editing inside the window but not beyond it", () => {
    expect(isEditableDate("2026-09-01", today)).toBe(true);
    expect(isEditableDate("2026-08-01", today)).toBe(true);
    expect(isEditableDate("2026-01-01", today)).toBe(false);
  });
});
