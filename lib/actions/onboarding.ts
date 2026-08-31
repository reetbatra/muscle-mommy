"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { addDaysISO, safeTimezone } from "@/lib/domain/dates";
import { suggestCalorieTarget, suggestMaintenance, suggestProtein } from "@/lib/domain/macros";
import { templateById } from "@/lib/domain/templates";
import { cycleOffsets } from "@/lib/domain/schedule";

const baselineSchema = z.object({
  /** Index into the template's flattened exercise list. */
  dayIndex: z.number().int().min(0).max(7),
  position: z.number().int().min(0).max(30),
  weightKg: z.number().min(0).max(700).nullable(),
  reps: z.array(z.number().int().min(0).max(200)).max(12),
});

const schema = z.object({
  displayName: z.string().trim().min(1).max(40),
  timezone: z.string().min(1).max(60),
  heightCm: z.number().min(120).max(220),
  age: z.number().int().min(14).max(90),
  weightKg: z.number().min(30).max(250),
  activity: z.enum(["sedentary", "light", "moderate", "active"]),
  stepTarget: z.number().int().min(1000).max(40000),
  /** Overrides the suggested numbers when the user edited them. */
  calorieTarget: z.number().int().min(1000).max(6000).nullable().default(null),
  proteinG: z.number().int().min(20).max(400).nullable().default(null),
  templateId: z.string().min(1),
  /** Index of the day just trained, so "next up" is right from the first open. */
  lastCompletedDayIndex: z.number().int().min(0).max(7).nullable().default(null),
  baselines: z.array(baselineSchema).max(60).default([]),
});

export type OnboardingInput = z.infer<typeof schema>;

/**
 * Writes everything a new account needs in one go: who they are, what they are
 * eating toward, their split, and one backdated session per day so the
 * overload engine has something to compare against instead of spending the
 * first week saying "first time logged".
 */
export async function completeOnboarding(input: OnboardingInput) {
  const values = schema.parse(input);
  const { supabase, user } = await requireUser();

  const template = templateById(values.templateId);
  if (!template) throw new Error(`Unknown program template: ${values.templateId}`);

  const timezone = safeTimezone(values.timezone);
  const maintenance = suggestMaintenance({
    weightKg: values.weightKg,
    heightCm: values.heightCm,
    age: values.age,
    activity: values.activity,
  });
  const calorieTarget = values.calorieTarget ?? suggestCalorieTarget(maintenance);
  const protein = values.proteinG ?? suggestProtein(values.weightKg);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: values.displayName,
      timezone,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) throw new Error(`Could not save your profile: ${profileError.message}`);

  const { error: goalsError } = await supabase
    .from("goals")
    .update({
      maintenance_kcal: maintenance,
      calorie_target: calorieTarget,
      protein_g: protein,
      // Fat at 25% of target calories, the rest of the calories go to carbs.
      fat_g: Math.round((calorieTarget * 0.25) / 9),
      carbs_g: Math.round((calorieTarget - protein * 4 - (calorieTarget * 0.25)) / 4),
      fiber_g: 30,
      step_target: values.stepTarget,
    })
    .eq("user_id", user.id);
  if (goalsError) throw new Error(`Could not save your targets: ${goalsError.message}`);

  // Fresh start: onboarding can be re-run, and a second split would be worse
  // than no split at all.
  await supabase.from("routine_days").delete().eq("user_id", user.id);

  const names = [...new Set(template.days.flatMap((d) => d.exercises.map((e) => e.exercise)))];
  const { data: library, error: libraryError } = await supabase
    .from("exercises")
    .select("id, name")
    .is("user_id", null)
    .in("name", names);
  if (libraryError) throw new Error(`Could not load the exercise library: ${libraryError.message}`);

  const idByName = new Map((library ?? []).map((e) => [e.name, e.id]));
  const missing = names.filter((n) => !idByName.has(n));
  if (missing.length > 0) {
    throw new Error(`These exercises are missing from the library: ${missing.join(", ")}`);
  }

  const baselineKey = (dayIndex: number, position: number) => `${dayIndex}:${position}`;
  const overrides = new Map(
    values.baselines.map((b) => [baselineKey(b.dayIndex, b.position), b]),
  );

  const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const dayOffsets = cycleOffsets(template.days, values.lastCompletedDayIndex);

  for (const [dayIndex, day] of template.days.entries()) {
    const { data: routineDay, error: dayError } = await supabase
      .from("routine_days")
      .insert({
        user_id: user.id,
        name: day.name,
        subtitle: day.subtitle || null,
        day_index: dayIndex + 1,
        accent: day.accent,
        rest_after: day.restAfter ?? false,
      })
      .select("id")
      .single();
    if (dayError) throw new Error(`Could not create ${day.name}: ${dayError.message}`);

    if (day.exercises.length === 0) continue;

    const rows = day.exercises.map((exercise, position) => ({
      user_id: user.id,
      routine_day_id: routineDay.id,
      exercise_id: idByName.get(exercise.exercise)!,
      display_name: exercise.displayAs ?? null,
      position,
      target_sets: exercise.sets,
      rep_low: exercise.repLow,
      rep_high: exercise.repHigh,
      rest_seconds: exercise.restSeconds ?? 90,
      load_type: exercise.loadType,
      increment_kg: exercise.incrementKg ?? null,
      rep_ceiling_max: exercise.repCeilingMax ?? 20,
      notes: exercise.notes ?? null,
    }));

    const { error: exerciseError } = await supabase.from("routine_exercises").insert(rows);
    if (exerciseError) {
      throw new Error(`Could not add exercises to ${day.name}: ${exerciseError.message}`);
    }

    // The backdated baseline session.
    const seedSets = day.exercises.flatMap((exercise, position) => {
      const override = overrides.get(baselineKey(dayIndex, position));
      const reps = override ? override.reps : (exercise.startingReps ?? []);
      const weight = override ? (override.weightKg ?? 0) : (exercise.startingWeightKg ?? 0);
      return reps
        .filter((r) => r > 0)
        .map((r, i) => ({
          user_id: user.id,
          exercise_id: idByName.get(exercise.exercise)!,
          set_index: i + 1,
          weight_kg: weight,
          reps: r,
          is_warmup: false,
        }));
    });

    if (seedSets.length === 0) continue;

    // Backdated so the split lands where the user actually is in the cycle,
    // rather than all four days appearing to have happened last week.
    const sessionDate = addDaysISO(todayLocal, dayOffsets.get(dayIndex) ?? -1);

    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        routine_day_id: routineDay.id,
        title: day.name,
        session_date: sessionDate,
        started_at: `${sessionDate}T09:00:00Z`,
        finished_at: `${sessionDate}T10:00:00Z`,
        notes: "Starting numbers, entered during setup.",
      })
      .select("id")
      .single();
    if (sessionError) {
      throw new Error(`Could not save your starting numbers: ${sessionError.message}`);
    }

    const { error: setsError } = await supabase
      .from("workout_sets")
      .insert(seedSets.map((s) => ({ ...s, session_id: session.id })));
    if (setsError) {
      throw new Error(`Could not save your starting sets: ${setsError.message}`);
    }
  }

  revalidatePath("/", "layout");
  redirect("/today");
}

