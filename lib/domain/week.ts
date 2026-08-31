/**
 * Weekly energy balance.
 *
 * Fat loss follows the week, not the day. A single heavy dinner is noise; a
 * week consistently over is not. So the app runs a weekly budget: what is left
 * to spend, and what that leaves per day for the rest of the week. A big day
 * adjusts tomorrow rather than reading as a failure.
 *
 * Unlogged days are counted and reported separately, never as zero. Treating a
 * day you forgot as a day you ate nothing would invent a deficit that never
 * happened, which is the one number this must never get wrong.
 */

export type WeekDay = {
  date: string;
  consumed: number | null;
  burned: number | null;
};

export type WeeklyBalance = {
  weekStart: string;
  weekEnd: string;
  /** Days from the week's start through today, inclusive. */
  daysElapsed: number;
  daysRemaining: number;
  loggedDays: number;
  unloggedDays: number;

  budget: number;
  consumed: number;
  remaining: number;
  /** What is left to spend, spread over the days that are left. */
  perDayRemaining: number;

  /** Positive means burned more than eaten, across logged days only. */
  netDeficit: number | null;
  targetDeficit: number;

  status: "empty" | "ahead" | "on-track" | "over";
  headline: string;
  detail: string;
};

/** Monday, because that is how people talk about a week. */
export function weekStart(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const weekday = date.getUTCDay();
  const backToMonday = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - backToMonday);
  return date.toISOString().slice(0, 10);
}

export function weekDates(iso: string): string[] {
  const start = new Date(`${weekStart(iso)}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    return day.toISOString().slice(0, 10);
  });
}

export function weeklyBalance(input: {
  today: string;
  days: WeekDay[];
  calorieTarget: number;
  maintenanceKcal: number;
}): WeeklyBalance {
  const { today, days, calorieTarget, maintenanceKcal } = input;
  const dates = weekDates(today);
  const start = dates[0];
  const end = dates[6];

  const byDate = new Map(days.map((d) => [d.date, d]));
  const elapsed = dates.filter((d) => d <= today);
  const daysElapsed = elapsed.length;
  const daysRemaining = 7 - daysElapsed;

  const logged = elapsed.filter((d) => (byDate.get(d)?.consumed ?? null) !== null);
  const loggedDays = logged.length;
  const unloggedDays = daysElapsed - loggedDays;

  const consumed = logged.reduce((sum, d) => sum + (byDate.get(d)?.consumed ?? 0), 0);
  const budget = calorieTarget * 7;
  const remaining = budget - consumed;
  // Today still counts as a day you can spend on.
  const spendableDays = Math.max(daysRemaining + (daysElapsed > 0 ? 1 : 0), 1);
  const perDayRemaining = remaining / spendableDays;

  const burned = logged.reduce(
    (sum, d) => sum + (byDate.get(d)?.burned ?? maintenanceKcal),
    0,
  );
  const netDeficit = loggedDays > 0 ? burned - consumed : null;
  const targetDeficit = Math.max(maintenanceKcal - calorieTarget, 0) * 7;

  if (loggedDays === 0) {
    return {
      weekStart: start,
      weekEnd: end,
      daysElapsed,
      daysRemaining,
      loggedDays,
      unloggedDays,
      budget,
      consumed,
      remaining,
      perDayRemaining,
      netDeficit,
      targetDeficit,
      status: "empty",
      headline: `${Math.round(budget)} kcal for the week`,
      detail: "Nothing logged yet.",
    };
  }

  // How far through the week's budget you should be by now.
  const budgetToDate = calorieTarget * daysElapsed;
  const drift = consumed - budgetToDate;

  const status: WeeklyBalance["status"] =
    drift <= -calorieTarget * 0.15 ? "ahead" : drift <= calorieTarget * 0.15 ? "on-track" : "over";

  const headline =
    remaining >= 0
      ? `${Math.round(remaining)} kcal left this week`
      : `${Math.abs(Math.round(remaining))} kcal over for the week`;

  const detail =
    daysRemaining === 0
      ? `Week done. ${Math.round(consumed)} eaten against a ${Math.round(budget)} budget.`
      : `${Math.round(perDayRemaining)} a day for the ${spendableDays} ${spendableDays === 1 ? "day" : "days"} left.`;

  return {
    weekStart: start,
    weekEnd: end,
    daysElapsed,
    daysRemaining,
    loggedDays,
    unloggedDays,
    budget,
    consumed,
    remaining,
    perDayRemaining,
    netDeficit,
    targetDeficit,
    status,
    headline,
    detail,
  };
}

/** Roughly 7700 kcal to a kilo of fat. Only ever a projection, never a promise. */
export function projectedFatLossKg(netDeficit: number): number {
  return netDeficit / 7700;
}
