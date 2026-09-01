"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { isEditableDate, safeTimezone, todayISO } from "@/lib/domain/dates";

/**
 * Manual health entry.
 *
 * The Apple Health Shortcut is the happy path, but it is a Shortcut: it breaks
 * quietly, it needs the phone unlocked, and it stops running the week you need
 * it most. Everything it posts can also be typed, so a broken automation never
 * means a day of missing numbers.
 *
 * Resting energy matters more than it looks. Without it the app can only fall
 * back to the maintenance estimate for the whole day, and active energy cannot
 * be added on top without counting ordinary walking twice.
 */
const entrySchema = z.object({
  date: z.iso.date(),
  steps: z.number().int().min(0).max(200_000).nullable(),
  activeKcal: z.number().int().min(0).max(10_000).nullable(),
  basalKcal: z.number().int().min(0).max(6_000).nullable(),
  exerciseMinutes: z.number().int().min(0).max(1_440).nullable(),
  sleepMinutes: z.number().int().min(0).max(1_440).nullable(),
});

export type HealthEntryInput = z.infer<typeof entrySchema>;

export async function setHealthDay(input: HealthEntryInput) {
  const values = entrySchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const today = todayISO(safeTimezone(profile?.timezone));
  if (!isEditableDate(values.date, today)) {
    throw new Error("That day is outside the window you can edit.");
  }

  // A blank field means "I do not know this", which is a null, not a zero.
  // Written as an upsert so the first entry of the day behaves like the fifth.
  const { error } = await supabase.from("health_days").upsert(
    {
      user_id: user.id,
      log_date: values.date,
      steps: values.steps,
      active_kcal: values.activeKcal,
      basal_kcal: values.basalKcal,
      exercise_minutes: values.exerciseMinutes,
      sleep_minutes: values.sleepMinutes,
      source: "manual",
    },
    { onConflict: "user_id,log_date" },
  );
  if (error) throw new Error(`Could not save your movement: ${error.message}`);

  revalidatePath("/today");
  revalidatePath("/food");
  revalidatePath("/progress");
}
