import "server-only";
import { requireUser } from "@/lib/supabase/server";
import { addDaysISO, isoRange } from "@/lib/domain/dates";
import {
  bestOneRepMax,
  compareSessions,
  overloadScore,
  workingWeight,
  type LoggedSet,
} from "@/lib/domain/overload";
import { dayBurn } from "@/lib/domain/macros";
import type { BodyComp } from "@/lib/domain/types";

export type DayPoint = {
  date: string;
  steps: number | null;
  weightKg: number | null;
  consumed: number | null;
  burned: number | null;
};

export type SessionPoint = {
  id: string;
  date: string;
  title: string;
  pct: number;
  up: number;
  scored: number;
};

export type ExerciseTrend = {
  id: string;
  name: string;
  /** Set when the lift appears on more than one day of the split. */
  dayName: string | null;
  sessions: number;
  currentWeight: number;
  previousWeight: number | null;
  currentE1rm: number;
  firstE1rm: number;
  lastDate: string;
};

export type ProgressData = {
  days: DayPoint[];
  sessions: SessionPoint[];
  exercises: ExerciseTrend[];
  bodyComps: BodyComp[];
  habitRate: { date: string; ratio: number }[];
};

const WINDOW_DAYS = 90;

export async function getProgressData(
  today: string,
  maintenanceKcal: number,
): Promise<ProgressData> {
  const { supabase, user } = await requireUser();
  const from = addDaysISO(today, -(WINDOW_DAYS - 1));

  const [health, meals, sessions, sets, comps, habits, habitLogs, routineDays] = await Promise.all([
    supabase
      .from("health_days")
      .select("log_date, steps, weight_kg, active_kcal, basal_kcal")
      .eq("user_id", user.id)
      .gte("log_date", from)
      .lte("log_date", today),
    supabase
      .from("meals")
      .select("log_date, kcal")
      .eq("user_id", user.id)
      .gte("log_date", from)
      .lte("log_date", today),
    supabase
      .from("workout_sessions")
      .select("id, title, session_date, finished_at, routine_day_id")
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .order("session_date", { ascending: true })
      .limit(60),
    supabase
      .from("workout_sets")
      .select("session_id, exercise_id, set_index, weight_kg, reps, is_warmup, exercise:exercises(name)")
      .eq("user_id", user.id)
      .order("set_index")
      .limit(4000),
    supabase
      .from("body_comps")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_on", { ascending: true }),
    supabase.from("habits").select("id, target_per_day").eq("user_id", user.id).eq("is_active", true),
    supabase
      .from("habit_logs")
      .select("habit_id, log_date, count")
      .eq("user_id", user.id)
      .gte("log_date", addDaysISO(today, -29))
      .lte("log_date", today),
    supabase.from("routine_days").select("id, name").eq("user_id", user.id),
  ]);

  const firstError = [health, meals, sessions, sets, comps, habits, habitLogs, routineDays].find(
    (r) => r.error,
  )?.error;
  if (firstError) throw new Error(`Could not load your progress: ${firstError.message}`);

  // ---- daily series --------------------------------------------------------
  const healthByDate = new Map(
    (health.data ?? []).map((h) => [h.log_date, h] as const),
  );
  const kcalByDate = new Map<string, number>();
  for (const meal of meals.data ?? []) {
    kcalByDate.set(meal.log_date, (kcalByDate.get(meal.log_date) ?? 0) + (meal.kcal ?? 0));
  }

  const days: DayPoint[] = isoRange(today, WINDOW_DAYS).map((date) => {
    const h = healthByDate.get(date);
    const consumed = kcalByDate.get(date) ?? null;
    const basal = h?.basal_kcal ?? null;
    const active = h?.active_kcal ?? null;
    // Active energy only stacks on measured resting energy; on the estimate
    // path maintenance already covers ordinary movement. See dayBurn.
    const burned =
      basal !== null || active !== null
        ? dayBurn({ maintenanceKcal, basalKcal: basal, activeKcal: active }).total
        : null;
    return {
      date,
      steps: h?.steps ?? null,
      weightKg: h?.weight_kg !== null && h?.weight_kg !== undefined ? Number(h.weight_kg) : null,
      consumed,
      burned,
    };
  });

  // ---- per-session overload -----------------------------------------------
  type SetRow = {
    session_id: string;
    exercise_id: string;
    set_index: number;
    weight_kg: number | string;
    reps: number;
    is_warmup: boolean;
    exercise: { name: string } | null;
  };

  const sessionOrder = (sessions.data ?? []).map((s) => s.id);
  const sessionMeta = new Map((sessions.data ?? []).map((s) => [s.id, s] as const));
  const dayNames = new Map(
    (routineDays.data ?? []).map((d) => [d.id, d.name] as const),
  );

  // Keyed on exercise AND day of the split. The same lift on two days is two
  // histories: comparing 45kg on Lower A against 40kg on Lower B would show a
  // regression every other session that never happened.
  const byTrack = new Map<string, Map<string, LoggedSet[]>>();
  const trackMeta = new Map<string, { exerciseId: string; routineDayId: string | null }>();
  const exerciseNames = new Map<string, string>();

  const trackKey = (exerciseId: string, routineDayId: string | null) =>
    `${exerciseId}::${routineDayId ?? "unplanned"}`;

  for (const raw of (sets.data ?? []) as unknown as SetRow[]) {
    const session = sessionMeta.get(raw.session_id);
    if (!session) continue;
    if (raw.exercise?.name) exerciseNames.set(raw.exercise_id, raw.exercise.name);

    const key = trackKey(raw.exercise_id, session.routine_day_id);
    trackMeta.set(key, { exerciseId: raw.exercise_id, routineDayId: session.routine_day_id });

    const perTrack = byTrack.get(key) ?? new Map<string, LoggedSet[]>();
    const list = perTrack.get(raw.session_id) ?? [];
    list.push({
      weight_kg: Number(raw.weight_kg),
      reps: raw.reps,
      is_warmup: raw.is_warmup,
      set_index: raw.set_index,
    });
    perTrack.set(raw.session_id, list);
    byTrack.set(key, perTrack);
  }

  const comparisonsBySession = new Map<string, ReturnType<typeof compareSessions>[]>();

  for (const [, perSession] of byTrack) {
    // Sessions in chronological order for this one lift on this one day.
    const ordered = sessionOrder.filter((id) => perSession.has(id));
    for (const [index, sessionId] of ordered.entries()) {
      const current = perSession.get(sessionId)!;
      const previous = index > 0 ? (perSession.get(ordered[index - 1]) ?? []) : [];
      const list = comparisonsBySession.get(sessionId) ?? [];
      list.push(compareSessions(current, previous));
      comparisonsBySession.set(sessionId, list);
    }
  }

  const sessionPoints: SessionPoint[] = (sessions.data ?? [])
    .map((session) => {
      const score = overloadScore(comparisonsBySession.get(session.id) ?? []);
      return {
        id: session.id,
        date: session.session_date,
        title: session.title,
        pct: score.pct,
        up: score.up,
        scored: score.scored,
      };
    })
    .filter((point) => point.scored > 0)
    .slice(-12);

  // ---- per-lift strength ---------------------------------------------------
  // One row per lift per day, so a hip thrust done at two loads reads as two
  // honest lines rather than one that lurches.
  const dayCountByExercise = new Map<string, number>();
  for (const meta of trackMeta.values()) {
    dayCountByExercise.set(meta.exerciseId, (dayCountByExercise.get(meta.exerciseId) ?? 0) + 1);
  }

  const exercises: ExerciseTrend[] = [...byTrack.entries()]
    .map(([key, perSession]) => {
      const meta = trackMeta.get(key)!;
      const ordered = sessionOrder.filter((id) => perSession.has(id));
      if (ordered.length === 0) return null;
      const latestId = ordered.at(-1)!;
      const latest = perSession.get(latestId)!;
      const previous = ordered.length > 1 ? perSession.get(ordered.at(-2)!)! : null;
      const first = perSession.get(ordered[0])!;
      const splitAcrossDays = (dayCountByExercise.get(meta.exerciseId) ?? 1) > 1;

      return {
        id: key,
        name: exerciseNames.get(meta.exerciseId) ?? "Exercise",
        dayName: splitAcrossDays ? (dayNames.get(meta.routineDayId ?? "") ?? null) : null,
        sessions: ordered.length,
        currentWeight: workingWeight(latest),
        previousWeight: previous ? workingWeight(previous) : null,
        currentE1rm: bestOneRepMax(latest),
        firstE1rm: bestOneRepMax(first),
        lastDate: sessionMeta.get(latestId)?.session_date ?? today,
      };
    })
    .filter((e): e is ExerciseTrend => e !== null)
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.sessions - a.sessions);

  // ---- habit consistency ---------------------------------------------------
  const habitTargets = new Map((habits.data ?? []).map((h) => [h.id, h.target_per_day]));
  const doneByDate = new Map<string, number>();
  for (const log of habitLogs.data ?? []) {
    const target = habitTargets.get(log.habit_id);
    if (target && log.count >= target) {
      doneByDate.set(log.log_date, (doneByDate.get(log.log_date) ?? 0) + 1);
    }
  }
  const habitCount = habitTargets.size || 1;
  const habitRate = isoRange(today, 30).map((date) => ({
    date,
    ratio: (doneByDate.get(date) ?? 0) / habitCount,
  }));

  return {
    days,
    sessions: sessionPoints,
    exercises,
    bodyComps: (comps.data ?? []) as BodyComp[],
    habitRate,
  };
}
