"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const toggleSchema = z.object({
  habitId: z.uuid(),
  date: z.iso.date(),
  delta: z.number().int().min(-12).max(12),
});

/**
 * Habits are counters, not booleans, because "brush twice" is a real target.
 * The write is an upsert so the very first tap of the day works the same as
 * the fifth.
 */
export async function adjustHabit(input: z.infer<typeof toggleSchema>) {
  const { habitId, date, delta } = toggleSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("id, target_per_day")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .single();
  if (habitError) throw new Error(`That habit does not exist: ${habitError.message}`);

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("count")
    .eq("habit_id", habitId)
    .eq("log_date", date)
    .maybeSingle();

  const next = Math.max(0, Math.min((existing?.count ?? 0) + delta, habit.target_per_day));

  const { error } = await supabase
    .from("habit_logs")
    .upsert(
      { user_id: user.id, habit_id: habitId, log_date: date, count: next },
      { onConflict: "habit_id,log_date" },
    );
  if (error) throw new Error(`Could not save that: ${error.message}`);

  revalidatePath("/today");
  return { count: next, target: habit.target_per_day };
}

const habitSchema = z.object({
  label: z.string().trim().min(1).max(60),
  hint: z.string().trim().max(120).nullable(),
  icon: z.string().trim().min(1).max(40),
  category: z.enum(["fuel", "wellness", "mind"]),
  target_per_day: z.number().int().min(1).max(12),
});

export async function createHabit(input: z.infer<typeof habitSchema>) {
  const values = habitSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: last } = await supabase
    .from("habits")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("habits").insert({
    ...values,
    user_id: user.id,
    key: `custom_${crypto.randomUUID().slice(0, 8)}`,
    sort_order: (last?.sort_order ?? 0) + 10,
  });
  if (error) throw new Error(`Could not add that habit: ${error.message}`);

  revalidatePath("/today");
  revalidatePath("/settings");
}

export async function updateHabit(habitId: string, input: z.infer<typeof habitSchema>) {
  const values = habitSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("habits")
    .update(values)
    .eq("id", z.uuid().parse(habitId))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not update that habit: ${error.message}`);
  revalidatePath("/today");
  revalidatePath("/settings");
}

/** Archives rather than deletes, so the streak history stays intact. */
export async function archiveHabit(habitId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("habits")
    .update({ is_active: false })
    .eq("id", z.uuid().parse(habitId))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not remove that habit: ${error.message}`);
  revalidatePath("/today");
  revalidatePath("/settings");
}

const pagesSchema = z.object({ date: z.iso.date(), pages: z.number().int().min(0).max(2000) });

export async function setPagesRead(input: z.infer<typeof pagesSchema>) {
  const { date, pages } = pagesSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("health_days")
    .upsert(
      { user_id: user.id, log_date: date, pages_read: pages, source: "manual" },
      { onConflict: "user_id,log_date" },
    );
  if (error) throw new Error(`Could not save your pages: ${error.message}`);
  revalidatePath("/today");
}
