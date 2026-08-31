import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEvents, fetchRecentWorkouts, HevyError, type HevyWorkout } from "./client";
import { detectRoutineDay, findExerciseMatch, type MatchCandidate } from "./matching";
import { estimateSessionKcal } from "@/lib/domain/overload";
import { safeTimezone } from "@/lib/domain/dates";

export type SyncResult = {
  imported: number;
  updated: number;
  deleted: number;
  newExercises: string[];
  unmatchedTitles: string[];
  recognisedDays: number;
  cursor: string;
};

type Admin = SupabaseClient;

/**
 * Pulls finished workouts out of Hevy and turns them into sessions this app
 * can reason about.
 *
 * The first run walks the recent history. Every run after that asks Hevy only
 * what changed, which is what makes a sync on app open cheap enough to do
 * every time the page loads.
 */
export async function syncHevyForUser(admin: Admin, userId: string): Promise<SyncResult> {
  const { data: connection, error: connectionError } = await admin
    .from("hevy_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (connectionError) throw new Error(`Could not read the Hevy connection: ${connectionError.message}`);
  if (!connection) throw new Error("Hevy is not connected for this account.");

  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  const timezone = safeTimezone(profile?.timezone);

  const startedAt = new Date().toISOString();

  let workouts: HevyWorkout[] = [];
  let deletedIds: string[] = [];

  try {
    if (!connection.last_event_cursor) {
      workouts = await fetchRecentWorkouts(connection.api_key);
    } else {
      const events = await fetchEvents(connection.api_key, connection.last_event_cursor);
      for (const event of events) {
        if (event.type === "updated") workouts.push(event.workout);
        else deletedIds.push(event.id);
      }
    }
  } catch (error) {
    const message = error instanceof HevyError ? error.message : "Could not reach Hevy.";
    await admin
      .from("hevy_connections")
      .update({ last_error: message, last_synced_at: startedAt })
      .eq("user_id", userId);
    throw error;
  }

  const context = await loadContext(admin, userId);

  const result: SyncResult = {
    imported: 0,
    updated: 0,
    deleted: 0,
    newExercises: [],
    unmatchedTitles: [],
    recognisedDays: 0,
    cursor: startedAt,
  };

  for (const workout of workouts) {
    const outcome = await importWorkout(admin, userId, workout, context, timezone);
    if (outcome.created) result.imported += 1;
    else result.updated += 1;
    if (outcome.routineDayId) result.recognisedDays += 1;
    result.newExercises.push(...outcome.newExercises);
    result.unmatchedTitles.push(...outcome.unmatchedTitles);
  }

  for (const hevyId of deletedIds) {
    const { data: link } = await admin
      .from("hevy_workout_links")
      .select("session_id")
      .eq("user_id", userId)
      .eq("hevy_workout_id", hevyId)
      .maybeSingle();
    if (!link) continue;
    await admin.from("workout_sessions").delete().eq("id", link.session_id).eq("user_id", userId);
    result.deleted += 1;
  }

  await admin
    .from("hevy_connections")
    .update({
      last_synced_at: startedAt,
      last_event_cursor: startedAt,
      last_error: null,
      workouts_imported: (connection.workouts_imported ?? 0) + result.imported,
    })
    .eq("user_id", userId);

  return result;
}

// ---------------------------------------------------------------------------

type Context = {
  candidates: MatchCandidate[];
  mapping: Map<string, string>;
  days: { id: string; name: string; exerciseIds: string[] }[];
  bodyWeightKg: number;
};

async function loadContext(admin: Admin, userId: string): Promise<Context> {
  const [{ data: exercises }, { data: mapRows }, { data: days }, { data: weight }] =
    await Promise.all([
      admin.from("exercises").select("id, name").or(`user_id.is.null,user_id.eq.${userId}`),
      admin.from("hevy_exercise_map").select("hevy_template_id, exercise_id").eq("user_id", userId),
      admin
        .from("routine_days")
        .select("id, name, routine_exercises(exercise_id)")
        .eq("user_id", userId)
        .eq("is_active", true),
      admin
        .from("body_comps")
        .select("weight_kg")
        .eq("user_id", userId)
        .order("measured_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    candidates: (exercises ?? []) as MatchCandidate[],
    mapping: new Map((mapRows ?? []).map((r) => [r.hevy_template_id, r.exercise_id])),
    days: (days ?? []).map((day) => ({
      id: day.id,
      name: day.name,
      exerciseIds: (day.routine_exercises ?? []).map(
        (re: { exercise_id: string }) => re.exercise_id,
      ),
    })),
    bodyWeightKg: Number(weight?.weight_kg ?? 0),
  };
}

async function importWorkout(
  admin: Admin,
  userId: string,
  workout: HevyWorkout,
  context: Context,
  timezone: string,
) {
  const newExercises: string[] = [];
  const unmatchedTitles: string[] = [];

  // Resolve every Hevy exercise to one of ours, learning the match as we go.
  const resolved: { exerciseId: string; sets: HevyWorkout["exercises"][number]["sets"] }[] = [];

  for (const exercise of workout.exercises) {
    const known = context.mapping.get(exercise.exercise_template_id);
    let exerciseId: string;

    if (known) {
      exerciseId = known;
    } else {
      const match = findExerciseMatch(exercise.title, context.candidates);
      if (match) {
        exerciseId = match.id;
      } else {
        // Never drop a lift. Create it under the user's own library so the
        // sets survive, and let them remap it later if they want.
        const { data: created, error } = await admin
          .from("exercises")
          .insert({
            user_id: userId,
            name: exercise.title,
            muscle_group: "From Hevy",
            equipment: null,
          })
          .select("id, name")
          .single();
        if (error) throw new Error(`Could not add ${exercise.title}: ${error.message}`);
        exerciseId = created.id;
        context.candidates.push({ id: created.id, name: created.name });
        newExercises.push(exercise.title);
        unmatchedTitles.push(exercise.title);
      }

      await admin.from("hevy_exercise_map").upsert(
        {
          user_id: userId,
          hevy_template_id: exercise.exercise_template_id,
          exercise_id: exerciseId,
          hevy_title: exercise.title,
          auto_matched: true,
        },
        { onConflict: "user_id,hevy_template_id" },
      );
      context.mapping.set(exercise.exercise_template_id, exerciseId);
    }

    resolved.push({ exerciseId, sets: exercise.sets });
  }

  const day = detectRoutineDay(
    [...new Set(resolved.map((r) => r.exerciseId))],
    context.days,
  );

  const sessionDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(workout.start_time));

  const endTime = workout.end_time ?? workout.start_time;
  const minutes = Math.min(
    240,
    Math.max(0, Math.round((Date.parse(endTime) - Date.parse(workout.start_time)) / 60_000)),
  );
  const estimatedKcal =
    context.bodyWeightKg > 0 ? estimateSessionKcal(minutes, context.bodyWeightKg) : null;

  const { data: existing } = await admin
    .from("hevy_workout_links")
    .select("session_id")
    .eq("user_id", userId)
    .eq("hevy_workout_id", workout.id)
    .maybeSingle();

  const payload = {
    user_id: userId,
    routine_day_id: day?.id ?? null,
    // The split's own name when we recognised it, otherwise whatever Hevy
    // called it. Never a generic placeholder.
    title: day?.name ?? workout.title,
    source_title: workout.title,
    session_date: sessionDate,
    started_at: workout.start_time,
    finished_at: endTime,
    notes: workout.description || null,
    estimated_kcal: estimatedKcal,
    source: "hevy" as const,
  };

  let sessionId: string;
  let created = false;

  if (existing) {
    sessionId = existing.session_id;
    const { error } = await admin
      .from("workout_sessions")
      .update(payload)
      .eq("id", sessionId)
      .eq("user_id", userId);
    if (error) throw new Error(`Could not update that session: ${error.message}`);
    // Sets are replaced wholesale, because an edit in Hevy can remove a set
    // and a merge would leave the removed one behind forever.
    await admin.from("workout_sets").delete().eq("session_id", sessionId);
  } else {
    const { data: inserted, error } = await admin
      .from("workout_sessions")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`Could not save that session: ${error.message}`);
    sessionId = inserted.id;
    created = true;
  }

  // One running index per exercise, so a lift performed in two blocks does
  // not collide on the (session, exercise, set_index) key.
  const setIndexes = new Map<string, number>();
  const rows = resolved.flatMap(({ exerciseId, sets }) =>
    sets
      .filter((set) => (set.reps ?? 0) > 0)
      .map((set) => {
        const next = (setIndexes.get(exerciseId) ?? 0) + 1;
        setIndexes.set(exerciseId, next);
        return {
          user_id: userId,
          session_id: sessionId,
          exercise_id: exerciseId,
          set_index: next,
          weight_kg: set.weight_kg ?? 0,
          reps: set.reps ?? 0,
          rpe: set.rpe ?? null,
          is_warmup: set.type === "warmup",
        };
      }),
  );

  if (rows.length > 0) {
    const { error } = await admin.from("workout_sets").insert(rows);
    if (error) throw new Error(`Could not save those sets: ${error.message}`);
  }

  await admin.from("hevy_workout_links").upsert(
    {
      user_id: userId,
      hevy_workout_id: workout.id,
      session_id: sessionId,
      hevy_updated_at: workout.updated_at ?? null,
    },
    { onConflict: "user_id,hevy_workout_id" },
  );

  return { created, routineDayId: day?.id ?? null, newExercises, unmatchedTitles };
}
