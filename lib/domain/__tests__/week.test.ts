import { describe, expect, it } from "vitest";
import { projectedFatLossKg, weekDates, weeklyBalance, weekStart } from "../week";

describe("weekStart", () => {
  it("starts the week on Monday", () => {
    // 2026-08-31 is a Monday.
    expect(weekStart("2026-08-31")).toBe("2026-08-31");
    expect(weekStart("2026-09-02")).toBe("2026-08-31");
    expect(weekStart("2026-09-06")).toBe("2026-08-31");
  });

  it("puts Sunday at the end of its week, not the start of the next", () => {
    // 2026-09-06 is a Sunday.
    expect(weekStart("2026-09-06")).toBe("2026-08-31");
    expect(weekStart("2026-09-07")).toBe("2026-09-07");
  });

  it("crosses a month boundary", () => {
    expect(weekDates("2026-09-02")[0]).toBe("2026-08-31");
    expect(weekDates("2026-09-02").at(-1)).toBe("2026-09-06");
  });
});

describe("weeklyBalance", () => {
  const base = { calorieTarget: 1500, maintenanceKcal: 1900 };
  const day = (date: string, consumed: number | null, burned: number | null = 1900) => ({
    date,
    consumed,
    burned,
  });

  it("says the whole budget is available before anything is logged", () => {
    const result = weeklyBalance({ ...base, today: "2026-08-31", days: [] });
    expect(result.status).toBe("empty");
    expect(result.budget).toBe(10500);
    expect(result.remaining).toBe(10500);
    expect(result.headline).toBe("10500 kcal for the week");
  });

  /**
   * The one that matters most. Forgetting to log is not the same as eating
   * nothing, and counting it as zero would invent a deficit.
   */
  it("never counts an unlogged day as a day of eating nothing", () => {
    const result = weeklyBalance({
      ...base,
      today: "2026-09-02",
      days: [day("2026-08-31", 1400)],
    });
    expect(result.daysElapsed).toBe(3);
    expect(result.loggedDays).toBe(1);
    expect(result.unloggedDays).toBe(2);
    // Deficit reflects the single logged day, not three days of starving.
    expect(result.netDeficit).toBe(500);
  });

  it("spreads what is left over the days that are left", () => {
    const result = weeklyBalance({
      ...base,
      today: "2026-09-02",
      days: [day("2026-08-31", 1500), day("2026-09-01", 1500), day("2026-09-02", 1500)],
    });
    expect(result.consumed).toBe(4500);
    expect(result.remaining).toBe(6000);
    // Four days left plus today.
    expect(Math.round(result.perDayRemaining)).toBe(1200);
  });

  it("lets a heavy day adjust the rest of the week instead of failing it", () => {
    const result = weeklyBalance({
      ...base,
      today: "2026-08-31",
      days: [day("2026-08-31", 2600)],
    });
    expect(result.status).toBe("over");
    expect(result.remaining).toBe(7900);
    expect(result.detail).toContain("a day for the 7 days left");
  });

  it("calls it ahead when you are meaningfully under pace", () => {
    const result = weeklyBalance({
      ...base,
      today: "2026-09-01",
      days: [day("2026-08-31", 1100), day("2026-09-01", 1100)],
    });
    expect(result.status).toBe("ahead");
  });

  it("calls a small drift on track rather than over", () => {
    const result = weeklyBalance({
      ...base,
      today: "2026-08-31",
      days: [day("2026-08-31", 1600)],
    });
    expect(result.status).toBe("on-track");
  });

  it("reports going over for the week in plain terms", () => {
    const days = weekDates("2026-09-06").map((d) => day(d, 1800));
    const result = weeklyBalance({ ...base, today: "2026-09-06", days });
    expect(result.remaining).toBe(-2100);
    expect(result.headline).toBe("2100 kcal over for the week");
    expect(result.detail).toContain("Week done");
  });

  it("uses measured burn when Health supplied it", () => {
    const result = weeklyBalance({
      ...base,
      today: "2026-08-31",
      days: [day("2026-08-31", 1500, 2400)],
    });
    expect(result.netDeficit).toBe(900);
  });

  it("falls back to maintenance when Health sent nothing", () => {
    const result = weeklyBalance({
      ...base,
      today: "2026-08-31",
      days: [day("2026-08-31", 1500, null)],
    });
    expect(result.netDeficit).toBe(400);
  });

  it("states the weekly deficit the targets imply", () => {
    const result = weeklyBalance({ ...base, today: "2026-08-31", days: [] });
    expect(result.targetDeficit).toBe(2800);
  });
});

describe("projectedFatLossKg", () => {
  it("uses roughly 7700 kcal to a kilo", () => {
    expect(projectedFatLossKg(7700)).toBeCloseTo(1, 5);
    expect(projectedFatLossKg(2800)).toBeCloseTo(0.36, 2);
  });
});
