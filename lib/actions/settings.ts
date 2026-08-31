"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, createClient } from "@/lib/supabase/server";
import { safeTimezone } from "@/lib/domain/dates";
import { hashToken, mintToken } from "@/lib/tokens";

const goalsSchema = z.object({
  calorie_target: z.number().int().min(800).max(6000),
  maintenance_kcal: z.number().int().min(800).max(6000),
  protein_g: z.number().int().min(20).max(400),
  carbs_g: z.number().int().min(0).max(800),
  fat_g: z.number().int().min(10).max(300),
  fiber_g: z.number().int().min(5).max(120),
  step_target: z.number().int().min(1000).max(40000),
  pages_target: z.number().int().min(1).max(500),
  weight_goal_kg: z.number().min(30).max(250).nullable(),
});

export async function updateGoals(input: z.infer<typeof goalsSchema>) {
  const values = goalsSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("goals").update(values).eq("user_id", user.id);
  if (error) throw new Error(`Could not save your targets: ${error.message}`);
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/food");
}

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(40),
  timezone: z.string().min(1).max(60),
  weight_unit: z.enum(["kg", "lb"]),
  dumbbell_rack: z.array(z.number().min(0.5).max(80)).min(1).max(40),
  machine_increment_kg: z.number().min(0.5).max(25),
  barbell_increment_kg: z.number().min(0.5).max(25),
});

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const values = profileSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...values,
      timezone: safeTimezone(values.timezone),
      dumbbell_rack: [...new Set(values.dumbbell_rack)].sort((a, b) => a - b),
    })
    .eq("id", user.id);
  if (error) throw new Error(`Could not save your settings: ${error.message}`);
  revalidatePath("/settings");
  revalidatePath("/lift");
}

// ---------------------------------------------------------------------------
// Apple Health bridge tokens
// ---------------------------------------------------------------------------

/**
 * Mints a token and returns it in the clear exactly once. Only the hash is
 * stored, so a lost token gets replaced rather than recovered.
 */
export async function createIngestToken(label: string) {
  const { supabase, user } = await requireUser();
  const token = mintToken();

  const { error } = await supabase.from("ingest_tokens").insert({
    user_id: user.id,
    token_hash: await hashToken(token),
    token_prefix: token.slice(0, 8),
    label: z.string().trim().min(1).max(40).parse(label),
  });
  if (error) throw new Error(`Could not create a token: ${error.message}`);

  revalidatePath("/settings");
  return { token };
}

export async function revokeIngestToken(tokenId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("ingest_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(tokenId))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not revoke that token: ${error.message}`);
  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Body composition
// ---------------------------------------------------------------------------

const bodyCompSchema = z.object({
  measured_on: z.iso.date(),
  weight_kg: z.number().min(30).max(250).nullable(),
  skeletal_muscle_kg: z.number().min(5).max(80).nullable(),
  body_fat_kg: z.number().min(1).max(120).nullable(),
  body_fat_pct: z.number().min(3).max(70).nullable(),
  bmr: z.number().int().min(600).max(4000).nullable(),
  visceral_fat: z.number().min(0).max(40).nullable(),
  inbody_score: z.number().int().min(0).max(120).nullable(),
  notes: z.string().trim().max(300).nullable(),
});

export async function saveBodyComp(input: z.infer<typeof bodyCompSchema>) {
  const values = bodyCompSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("body_comps")
    .upsert({ ...values, user_id: user.id }, { onConflict: "user_id,measured_on" });
  if (error) throw new Error(`Could not save that scan: ${error.message}`);
  revalidatePath("/progress");
  revalidatePath("/settings");
}

export async function deleteBodyComp(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("body_comps")
    .delete()
    .eq("id", z.uuid().parse(id))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not delete that scan: ${error.message}`);
  revalidatePath("/progress");
}

// ---------------------------------------------------------------------------
// Split editing
// ---------------------------------------------------------------------------

const daySchema = z.object({
  name: z.string().trim().min(1).max(40),
  subtitle: z.string().trim().max(60).nullable(),
  rest_after: z.boolean(),
});

export async function updateRoutineDay(dayId: string, input: z.infer<typeof daySchema>) {
  const values = daySchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("routine_days")
    .update(values)
    .eq("id", z.uuid().parse(dayId))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not rename that day: ${error.message}`);
  revalidatePath("/lift");
}

const routineExerciseSchema = z.object({
  target_sets: z.number().int().min(1).max(12),
  rep_low: z.number().int().min(1).max(50),
  rep_high: z.number().int().min(1).max(60),
  rep_ceiling_max: z.number().int().min(1).max(60),
  rest_seconds: z.number().int().min(0).max(600),
  load_type: z.enum(["machine", "dumbbell_pair", "dumbbell_single", "barbell", "bodyweight", "banded"]),
  increment_kg: z.number().min(0.25).max(25).nullable(),
  display_name: z.string().trim().max(50).nullable(),
  notes: z.string().trim().max(200).nullable(),
  to_failure: z.boolean(),
});

export async function updateRoutineExercise(
  id: string,
  input: z.infer<typeof routineExerciseSchema>,
) {
  const values = routineExerciseSchema.parse(input);
  if (values.rep_high < values.rep_low) {
    throw new Error("The top of the rep range has to be at least the bottom of it.");
  }
  if (values.rep_ceiling_max < values.rep_high) {
    throw new Error("The hard rep cap has to be at least the top of the rep range.");
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("routine_exercises")
    .update(values)
    .eq("id", z.uuid().parse(id))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not update that exercise: ${error.message}`);
  revalidatePath("/lift");
}

export async function addRoutineExercise(dayId: string, exerciseId: string) {
  const { supabase, user } = await requireUser();
  const routineDayId = z.uuid().parse(dayId);

  const { data: last } = await supabase
    .from("routine_exercises")
    .select("position")
    .eq("routine_day_id", routineDayId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("equipment")
    .eq("id", z.uuid().parse(exerciseId))
    .single();

  const { error } = await supabase.from("routine_exercises").insert({
    user_id: user.id,
    routine_day_id: routineDayId,
    exercise_id: exerciseId,
    position: (last?.position ?? -1) + 1,
    load_type: loadTypeFor(exercise?.equipment ?? null),
  });
  if (error) throw new Error(`Could not add that exercise: ${error.message}`);
  revalidatePath("/lift");
}

export async function removeRoutineExercise(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("routine_exercises")
    .delete()
    .eq("id", z.uuid().parse(id))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not remove that exercise: ${error.message}`);
  revalidatePath("/lift");
}

export async function reorderRoutineExercises(dayId: string, orderedIds: string[]) {
  const { supabase, user } = await requireUser();
  z.uuid().parse(dayId);
  const ids = z.array(z.uuid()).min(1).parse(orderedIds);

  for (const [position, id] of ids.entries()) {
    const { error } = await supabase
      .from("routine_exercises")
      .update({ position })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("routine_day_id", dayId);
    if (error) throw new Error(`Could not reorder: ${error.message}`);
  }
  revalidatePath("/lift");
}

/** A sensible default so adding an exercise does not demand five decisions. */
function loadTypeFor(equipment: string | null) {
  switch (equipment) {
    case "Dumbbell":
      return "dumbbell_pair";
    case "Barbell":
      return "barbell";
    case "Bodyweight":
      return "bodyweight";
    case "Band":
      return "banded";
    default:
      return "machine";
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Sets a password on the signed-in account.
 *
 * This is what makes sign-in reliable here. The project's built-in mail is
 * rate limited to a couple of messages an hour and cannot be customised on
 * this plan, so anything that depends on receiving an email is fragile. A
 * password does not depend on anything.
 */
export async function setPassword(password: string) {
  const value = z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128)
    .parse(password);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const { error } = await supabase.auth.updateUser({ password: value });
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  return { email: user.email ?? null };
}
