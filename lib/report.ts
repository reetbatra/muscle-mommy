import "server-only";
import { requireUser } from "@/lib/supabase/server";
import { addDaysISO, isoRange } from "@/lib/domain/dates";
import { compareSessions, overloadScore, totalVolume, type LoggedSet } from "@/lib/domain/overload";
import { dayBurn, sumMeals, type MacroTotals } from "@/lib/domain/macros";

export type ReportPeriod = "week" | "month";

export const PERIOD_DAYS: Record<ReportPeriod, number> = { week: 7, month: 30 };

export type Report = {
  period: ReportPeriod;
  from: string;
  to: string;
  days: {
    date: string;
    label: string;
    eaten: number | null;
    burned: number | null;
    steps: number | null;
  }[];
  /** Averaged over days that actually had food logged. */
  macroAverage: MacroTotals;
  loggedFoodDays: number;
  deficitDays: number;
  /** Burned minus eaten across logged days only. Positive is a deficit. */
  netDeficit: number | null;
  sessions: number;
  overloadPct: number;
  liftsUp: number;
  liftsScored: number;
  volumeByMuscle: { muscle: string; volume: number }[];
  habits: { label: string; done: number; possible: number; pct: number }[];
  stepsTotal: number;
  stepsDays: number;
  weightChange: { from: number; to: number; delta: number } | null;
};

export async function getReport(
  period: ReportPeriod,
  todayISO: string,
  maintenanceKcal: number,
): Promise<Report> {
  const { supabase, user } = await requireUser();
  const length = PERIOD_DAYS[period];
  const from = addDaysISO(todayISO, -(length - 1));

  const [health, meals, sessions, sets, habits, habitLogs] = await Promise.all([
    supabase
      .from("health_days")
      .select("log_date, steps, weight_kg, active_kcal, basal_kcal")
      .eq("user_id", user.id)
      .gte("log_date", from)
      .lte("log_date", todayISO),
    supabase
      .from("meals")
      .select("log_date, kcal, protein_g, carbs_g, fat_g, fiber_g")
      .eq("user_id", user.id)
      .gte("log_date", from)
      .lte("log_date", todayISO),
    supabase
      .from("workout_sessions")
      .select("id, session_date, routine_day_id")
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .gte("session_date", from)
      .lte("session_date", todayISO)
      .order("session_date"),
    supabase
      .from("workout_sets")
      .select("session_id, exercise_id, set_index, weight_kg, reps, is_warmup, exercise:exercises(muscle_group)")
      .eq("user_id", user.id)
      .limit(4000),
    supabase
      .from("habits")
      .select("id, label, target_per_day")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("habit_logs")
      .select("habit_id, log_date, count")
      .eq("user_id", user.id)
      .gte("log_date", from)
      .lte("log_date", todayISO),
  ]);

  const firstError = [health, meals, sessions, sets, habits, habitLogs].find((r) => r.error)?.error;
  if (firstError) throw new Error(`Could not build the report: ${firstError.message}`);

  // ---- daily series -------------------------------------------------------
  const healthByDate = new Map((health.data ?? []).map((h) => [h.log_date, h] as const));
  const kcalByDate = new Map<string, number>();
  for (const meal of meals.data ?? []) {
    kcalByDate.set(meal.log_date, (kcalByDate.get(meal.log_date) ?? 0) + (meal.kcal ?? 0));
  }

  const dates = isoRange(todayISO, length);
  const days = dates.map((date) => {
    const h = healthByDate.get(date);
    const basal = h?.basal_kcal ?? null;
    const active = h?.active_kcal ?? null;
    return {
      date,
      label: shortDate(date),
      eaten: kcalByDate.get(date) ?? null,
      burned:
        basal !== null || active !== null
          ? dayBurn({ maintenanceKcal, basalKcal: basal, activeKcal: active }).total
          : null,
      steps: h?.steps ?? null,
    };
  });

  const deficitDays = days.filter(
    (d) => d.eaten !== null && d.burned !== null && d.eaten < d.burned,
  ).length;
  const loggedFoodDays = new Set((meals.data ?? []).map((m) => m.log_date)).size;
  // Only days with food logged. A day you forgot is not a day you fasted.
  const loggedDayRows = days.filter((d) => d.eaten !== null);
  const netDeficit = loggedDayRows.length
    ? loggedDayRows.reduce((sum, d) => sum + ((d.burned ?? maintenanceKcal) - (d.eaten ?? 0)), 0)
    : null;
  const mealTotals = sumMeals(meals.data ?? []);
  const macroAverage: MacroTotals = loggedFoodDays
    ? {
        kcal: mealTotals.kcal / loggedFoodDays,
        protein_g: mealTotals.protein_g / loggedFoodDays,
        carbs_g: mealTotals.carbs_g / loggedFoodDays,
        fat_g: mealTotals.fat_g / loggedFoodDays,
        fiber_g: mealTotals.fiber_g / loggedFoodDays,
      }
    : { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

  // ---- training -----------------------------------------------------------
  type SetRow = {
    session_id: string;
    exercise_id: string;
    set_index: number;
    weight_kg: number | string;
    reps: number;
    is_warmup: boolean;
    exercise: { muscle_group: string } | null;
  };

  const inPeriod = new Set((sessions.data ?? []).map((s) => s.id));
  const dayOfSession = new Map((sessions.data ?? []).map((s) => [s.id, s.routine_day_id] as const));

  const byTrack = new Map<string, Map<string, LoggedSet[]>>();
  const volumeByMuscle = new Map<string, number>();
  const orderedSessionIds = (sessions.data ?? []).map((s) => s.id);

  for (const raw of (sets.data ?? []) as unknown as SetRow[]) {
    const set: LoggedSet = {
      weight_kg: Number(raw.weight_kg),
      reps: raw.reps,
      is_warmup: raw.is_warmup,
      set_index: raw.set_index,
    };

    if (inPeriod.has(raw.session_id) && !raw.is_warmup) {
      const muscle = raw.exercise?.muscle_group ?? "Other";
      volumeByMuscle.set(muscle, (volumeByMuscle.get(muscle) ?? 0) + totalVolume([set]));
    }

    // Same-day scoping, so a lift on two days is two histories.
    const key = `${raw.exercise_id}::${dayOfSession.get(raw.session_id) ?? "unplanned"}`;
    const perTrack = byTrack.get(key) ?? new Map<string, LoggedSet[]>();
    const list = perTrack.get(raw.session_id) ?? [];
    list.push(set);
    perTrack.set(raw.session_id, list);
    byTrack.set(key, perTrack);
  }

  const comparisons: ReturnType<typeof compareSessions>[] = [];
  for (const [, perSession] of byTrack) {
    const ordered = orderedSessionIds.filter((id) => perSession.has(id));
    for (const [index, sessionId] of ordered.entries()) {
      if (index === 0) continue;
      comparisons.push(
        compareSessions(perSession.get(sessionId)!, perSession.get(ordered[index - 1]) ?? []),
      );
    }
  }
  const score = overloadScore(comparisons);

  // ---- habits -------------------------------------------------------------
  const habitList = habits.data ?? [];
  const doneByHabit = new Map<string, number>();
  for (const log of habitLogs.data ?? []) {
    const habit = habitList.find((h) => h.id === log.habit_id);
    if (habit && log.count >= habit.target_per_day) {
      doneByHabit.set(log.habit_id, (doneByHabit.get(log.habit_id) ?? 0) + 1);
    }
  }

  const habitReport = habitList.map((habit) => {
    const done = doneByHabit.get(habit.id) ?? 0;
    return { label: habit.label, done, possible: length, pct: Math.round((done / length) * 100) };
  });

  // ---- steps and weight ---------------------------------------------------
  const stepDays = days.filter((d) => (d.steps ?? 0) > 0);
  const weights = dates
    .map((d) => healthByDate.get(d)?.weight_kg)
    .filter((w): w is number => w !== null && w !== undefined)
    .map(Number);

  return {
    period,
    from,
    to: todayISO,
    days,
    macroAverage,
    loggedFoodDays,
    deficitDays,
    netDeficit,
    sessions: (sessions.data ?? []).length,
    overloadPct: score.pct,
    liftsUp: score.up,
    liftsScored: score.scored,
    volumeByMuscle: [...volumeByMuscle.entries()]
      .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume),
    habits: habitReport,
    stepsTotal: stepDays.reduce((n, d) => n + (d.steps ?? 0), 0),
    stepsDays: stepDays.length,
    weightChange:
      weights.length >= 2
        ? {
            from: weights[0],
            to: weights[weights.length - 1],
            delta: weights[weights.length - 1] - weights[0],
          }
        : null,
  };
}

function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${m}`;
}
