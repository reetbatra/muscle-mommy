"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAccount, fetchWorkoutCount, HevyError } from "@/lib/hevy/client";
import { syncHevyForUser } from "@/lib/hevy/import";

export type HevyStatus = {
  connected: boolean;
  username: string | null;
  autoSync: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  workoutsImported: number;
  unmatched: { hevyTemplateId: string; hevyTitle: string; exerciseId: string; exerciseName: string }[];
};

/**
 * The key never goes back to the browser after this. Status is read through a
 * service-role client so the row itself stays unreadable from the client.
 */
export async function getHevyStatus(): Promise<HevyStatus> {
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data: connection } = await admin
    .from("hevy_connections")
    .select("hevy_username, auto_sync, last_synced_at, last_error, workouts_imported")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) {
    return {
      connected: false,
      username: null,
      autoSync: true,
      lastSyncedAt: null,
      lastError: null,
      workoutsImported: 0,
      unmatched: [],
    };
  }

  // Anything that landed in the catch-all group is a match the app could not
  // make, and the user is the only one who can resolve it.
  const { data: unmatched } = await admin
    .from("hevy_exercise_map")
    .select("hevy_template_id, hevy_title, exercise_id, exercise:exercises!inner(name, muscle_group)")
    .eq("user_id", user.id)
    .eq("exercises.muscle_group", "From Hevy");

  return {
    connected: true,
    username: connection.hevy_username,
    autoSync: connection.auto_sync,
    lastSyncedAt: connection.last_synced_at,
    lastError: connection.last_error,
    workoutsImported: connection.workouts_imported ?? 0,
    unmatched: (unmatched ?? []).map((row) => {
      const exercise = row.exercise as unknown as { name: string };
      return {
        hevyTemplateId: row.hevy_template_id,
        hevyTitle: row.hevy_title,
        exerciseId: row.exercise_id,
        exerciseName: exercise?.name ?? row.hevy_title,
      };
    }),
  };
}

const keySchema = z.string().trim().min(20).max(200);

export async function connectHevy(apiKey: string) {
  const key = keySchema.parse(apiKey);
  const { user } = await requireUser();
  const admin = createAdminClient();

  // Prove the key works before storing it, so a typo fails here rather than
  // silently at 4am on the next cron run.
  let account: { username: string | null };
  let workoutCount = 0;
  try {
    account = await fetchAccount(key);
    workoutCount = await fetchWorkoutCount(key);
  } catch (error) {
    if (error instanceof HevyError) throw new Error(error.message);
    throw new Error("Could not reach Hevy. Try again in a moment.");
  }

  const { error } = await admin.from("hevy_connections").upsert(
    {
      user_id: user.id,
      api_key: key,
      hevy_username: account.username,
      last_error: null,
      // A fresh connection re-imports from scratch.
      last_event_cursor: null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not save the connection: ${error.message}`);

  const result = await syncHevyForUser(admin, user.id);

  revalidatePath("/settings");
  revalidatePath("/lift");
  revalidatePath("/today");

  return { username: account.username, workoutCount, ...result };
}

export async function syncHevyNow() {
  const { user } = await requireUser();
  const admin = createAdminClient();

  try {
    const result = await syncHevyForUser(admin, user.id);
    revalidatePath("/settings");
    revalidatePath("/lift");
    revalidatePath("/today");
    revalidatePath("/progress");
    return result;
  } catch (error) {
    if (error instanceof HevyError) throw new Error(error.message);
    throw error;
  }
}

export async function setHevyAutoSync(enabled: boolean) {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin
    .from("hevy_connections")
    .update({ auto_sync: z.boolean().parse(enabled) })
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not change that: ${error.message}`);
  revalidatePath("/settings");
}

export async function disconnectHevy() {
  const { user } = await requireUser();
  const admin = createAdminClient();
  // Imported sessions stay. Deleting them would throw away real training
  // history just because the connection went away.
  const { error } = await admin.from("hevy_connections").delete().eq("user_id", user.id);
  if (error) throw new Error(`Could not disconnect: ${error.message}`);
  revalidatePath("/settings");
}

/** Points a Hevy exercise at one of the user's own, and moves its history over. */
export async function remapHevyExercise(hevyTemplateId: string, exerciseId: string) {
  const templateId = z.string().min(1).max(80).parse(hevyTemplateId);
  const targetId = z.uuid().parse(exerciseId);
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("hevy_exercise_map")
    .select("exercise_id")
    .eq("user_id", user.id)
    .eq("hevy_template_id", templateId)
    .maybeSingle();

  const { error } = await admin.from("hevy_exercise_map").upsert(
    { user_id: user.id, hevy_template_id: templateId, exercise_id: targetId, hevy_title: "", auto_matched: false },
    { onConflict: "user_id,hevy_template_id" },
  );
  if (error) throw new Error(`Could not remap that: ${error.message}`);

  if (current && current.exercise_id !== targetId) {
    // Move every set already imported under the old exercise, otherwise the
    // progression engine keeps comparing against a stub.
    await admin
      .from("workout_sets")
      .update({ exercise_id: targetId })
      .eq("user_id", user.id)
      .eq("exercise_id", current.exercise_id);

    // The stub only ever existed to hold those sets.
    await admin
      .from("exercises")
      .delete()
      .eq("id", current.exercise_id)
      .eq("user_id", user.id)
      .eq("muscle_group", "From Hevy");
  }

  revalidatePath("/settings");
  revalidatePath("/lift");
  revalidatePath("/progress");
}
