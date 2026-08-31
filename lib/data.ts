import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import { safeTimezone, todayISO } from "@/lib/domain/dates";
import type {
  BodyComp,
  CycleDay,
  Goals,
  Habit,
  HealthDay,
  Meal,
  Profile,
  RoutineDay,
  RoutineExercise,
  WorkoutSession,
} from "@/lib/domain/types";
import type { LoadConfig, LoadType, LoggedSet } from "@/lib/domain/overload";
import { selectLatestSets, type HistoryRow } from "@/lib/domain/history";

export type SessionContext = {
  userId: string;
  email: string | null;
  profile: Profile & {
    dumbbell_rack: number[];
    machine_increment_kg: number;
    barbell_increment_kg: number;
  };
  goals: Goals;
  today: string;
  loadConfig: LoadConfig;
};

/**
 * Profile, goals, and the user's own idea of what day it is.
 *
 * One round trip, not two: goals are embedded in the profile row. Cached per
 * request because several loaders on the same page want it.
 */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const { supabase, user } = await requireUser();

  const { data: row, error } = await supabase
    .from("profiles")
    .select("*, goals(*)")
    .eq("id", user.id)
    .single();

  if (error) throw new Error(`Could not load your profile: ${error.message}`);

  const { goals: embedded, ...profile } = row as typeof row & { goals: Goals | Goals[] | null };
  const goals = (Array.isArray(embedded) ? embedded[0] : embedded) as Goals | undefined;
  if (!goals) throw new Error("Could not load your targets.");

  const timezone = safeTimezone(profile.timezone);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: { ...profile, timezone },
    goals,
    today: todayISO(timezone),
    loadConfig: {
      dumbbellRack: (profile.dumbbell_rack ?? []).map(Number),
      machineIncrementKg: Number(profile.machine_increment_kg),
      barbellIncrementKg: Number(profile.barbell_increment_kg),
    },
  };
});

export type RoutineExerciseFull = RoutineExercise & {
  display_name: string | null;
  load_type: LoadType;
  increment_kg: number | null;
  rep_ceiling_max: number;
  to_failure: boolean;
  exercise: { id: string; name: string; muscle_group: string; equipment: string | null };
};

export type RoutineDayFull = RoutineDay & {
  rest_after: boolean;
  routine_exercises: RoutineExerciseFull[];
};

export const getRoutine = cache(async (): Promise<RoutineDayFull[]> => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("routine_days")
    .select(
      "*, routine_exercises(*, exercise:exercises(id, name, muscle_group, equipment))",
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("day_index");

  if (error) throw new Error(`Could not load your split: ${error.message}`);

  return (data ?? []).map((day) => ({
    ...day,
    routine_exercises: [...(day.routine_exercises ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  })) as RoutineDayFull[];
});

/**
 * The most recent finished session's working sets for each exercise.
 *
 * `preferRoutineDayId` matters more than it looks. The same lift often appears
 * on two days of a split at two different working weights: a hip thrust at
 * 45kg on Lower A and 40kg on Lower B is one exercise with two honest
 * histories. Comparing across them would read as a regression every other
 * session and would prescribe the wrong weight. So the last session of the
 * same day wins, and anything else is only a fallback for a lift with no
 * history on this day yet.
 */
export async function getLastSetsByExercise(
  exerciseIds: string[],
  options: { excludeSessionId?: string; preferRoutineDayId?: string | null } = {},
): Promise<Record<string, LoggedSet[]>> {
  if (exerciseIds.length === 0) return {};
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      "exercise_id, session_id, set_index, weight_kg, reps, is_warmup, session:workout_sessions(session_date, finished_at, routine_day_id)",
    )
    .eq("user_id", user.id)
    .in("exercise_id", exerciseIds)
    .order("set_index")
    .limit(1500);

  if (error) throw new Error(`Could not load your history: ${error.message}`);

  type Row = {
    exercise_id: string;
    session_id: string;
    set_index: number;
    weight_kg: number | string;
    reps: number;
    is_warmup: boolean;
    session: {
      session_date: string;
      finished_at: string | null;
      routine_day_id: string | null;
    } | null;
  };

  const rows: HistoryRow[] = ((data ?? []) as unknown as Row[]).flatMap((raw) =>
    raw.session
      ? [
          {
            exerciseId: raw.exercise_id,
            sessionId: raw.session_id,
            sessionDate: raw.session.session_date,
            finishedAt: raw.session.finished_at,
            routineDayId: raw.session.routine_day_id,
            setIndex: raw.set_index,
            weightKg: Number(raw.weight_kg),
            reps: raw.reps,
            isWarmup: raw.is_warmup,
          },
        ]
      : [],
  );

  return selectLatestSets(rows, options);
}

export type TodayData = {
  habits: Habit[];
  habitCounts: Record<string, number>;
  habitHistory: Record<string, Set<string>>;
  meals: Meal[];
  health: HealthDay | null;
  cycle: CycleDay | null;
  periodFlow: { log_date: string; flow: string }[];
  openSession: WorkoutSession | null;
  lastFinishedSession: WorkoutSession | null;
  latestBodyComp: BodyComp | null;
};

export async function getTodayData(today: string, historyStart: string): Promise<TodayData> {
  const { supabase, user } = await requireUser();

  const [habits, logs, meals, health, cycleToday, flow, sessions, bodyComp] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("habit_logs")
      .select("habit_id, log_date, count")
      .eq("user_id", user.id)
      .gte("log_date", historyStart)
      .lte("log_date", today),
    supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .order("logged_at"),
    supabase.from("health_days").select("*").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase.from("cycle_days").select("*").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
    supabase
      .from("cycle_days")
      .select("log_date, flow")
      .eq("user_id", user.id)
      .neq("flow", "none")
      .order("log_date", { ascending: false })
      .limit(120),
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("body_comps")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = [habits, logs, meals, health, cycleToday, flow, sessions, bodyComp].find(
    (r) => r.error,
  )?.error;
  if (firstError) throw new Error(`Could not load today: ${firstError.message}`);

  const habitCounts: Record<string, number> = {};
  const habitHistory: Record<string, Set<string>> = {};
  const habitById = new Map((habits.data ?? []).map((h) => [h.id, h]));

  for (const log of logs.data ?? []) {
    const habit = habitById.get(log.habit_id);
    if (!habit) continue;
    if (log.log_date === today) habitCounts[log.habit_id] = log.count;
    if (log.count >= habit.target_per_day) {
      (habitHistory[log.habit_id] ??= new Set()).add(log.log_date);
    }
  }

  const allSessions = (sessions.data ?? []) as WorkoutSession[];

  return {
    habits: (habits.data ?? []) as Habit[],
    habitCounts,
    habitHistory,
    meals: (meals.data ?? []) as Meal[],
    health: (health.data ?? null) as HealthDay | null,
    cycle: (cycleToday.data ?? null) as CycleDay | null,
    periodFlow: (flow.data ?? []) as { log_date: string; flow: string }[],
    openSession: allSessions.find((s) => !s.finished_at) ?? null,
    lastFinishedSession: allSessions.find((s) => s.finished_at) ?? null,
    latestBodyComp: (bodyComp.data ?? null) as BodyComp | null,
  };
}
