"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { MEAL_TYPES } from "@/lib/domain/food-schema";
import { memoryKey } from "@/lib/domain/food-memory";

const mealSchema = z.object({
  logDate: z.iso.date(),
  mealType: z.enum(MEAL_TYPES),
  title: z.string().trim().min(1).max(70),
  kcal: z.number().min(0).max(6000),
  protein_g: z.number().min(0).max(400),
  carbs_g: z.number().min(0).max(800),
  fat_g: z.number().min(0).max(400),
  fiber_g: z.number().min(0).max(200),
});

export async function createMeal(input: z.infer<typeof mealSchema>) {
  const values = mealSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("meals").insert({
    user_id: user.id,
    log_date: values.logDate,
    meal_type: values.mealType,
    title: values.title,
    kcal: Math.round(values.kcal),
    protein_g: values.protein_g,
    carbs_g: values.carbs_g,
    fat_g: values.fat_g,
    fiber_g: values.fiber_g,
    source: "manual",
  });
  if (error) throw new Error(`Could not save that meal: ${error.message}`);

  revalidatePath("/food");
  revalidatePath("/today");
}

export async function updateMeal(mealId: string, input: z.infer<typeof mealSchema>) {
  const values = mealSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("meals")
    .update({
      meal_type: values.mealType,
      title: values.title,
      kcal: Math.round(values.kcal),
      protein_g: values.protein_g,
      carbs_g: values.carbs_g,
      fat_g: values.fat_g,
      fiber_g: values.fiber_g,
    })
    .eq("id", z.uuid().parse(mealId))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not update that meal: ${error.message}`);

  revalidatePath("/food");
  revalidatePath("/today");
}

export async function deleteMeal(mealId: string) {
  const id = z.uuid().parse(mealId);
  const { supabase, user } = await requireUser();

  const { data: meal } = await supabase
    .from("meals")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("meals").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(`Could not delete that meal: ${error.message}`);

  if (meal?.photo_path) {
    await supabase.storage.from("meal-photos").remove([meal.photo_path]);
  }

  revalidatePath("/food");
  revalidatePath("/today");
}

/** Signed URLs for the day's photos. The bucket is private on purpose. */
export async function signMealPhotos(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { supabase } = await requireUser();
  const { data, error } = await supabase.storage
    .from("meal-photos")
    .createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(`Could not load your photos: ${error.message}`);

  const pairs = (data ?? []).flatMap((entry) =>
    entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : [],
  );
  return Object.fromEntries(pairs);
}

// ---------------------------------------------------------------------------
// Food memory
// ---------------------------------------------------------------------------

/** Pinned means the user's own statement, which no estimate may overwrite. */
export async function setFoodMemoryPinned(memoryId: string, pinned: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("food_memories")
    .update({ is_pinned: z.boolean().parse(pinned) })
    .eq("id", z.uuid().parse(memoryId))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not change that: ${error.message}`);
  revalidatePath("/settings");
}

export async function deleteFoodMemory(memoryId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("food_memories")
    .delete()
    .eq("id", z.uuid().parse(memoryId))
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not forget that: ${error.message}`);
  revalidatePath("/settings");
}

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  portion: z.string().trim().min(1).max(80),
  kcal: z.number().min(0).max(4000),
  protein_g: z.number().min(0).max(300),
  carbs_g: z.number().min(0).max(500),
  fat_g: z.number().min(0).max(300),
  fiber_g: z.number().min(0).max(120),
});

/**
 * Corrects the individual foods in a meal, not just its total.
 *
 * Editing only the total left the items saying one thing and the meal saying
 * another, and the food memory kept whatever the estimate had guessed. Here the
 * totals are recomputed from the corrected items and the memory is rewritten to
 * match, so a correction actually teaches it something.
 */
export async function updateMealItems(
  mealId: string,
  items: z.infer<typeof itemSchema>[],
  meta?: { title?: string; mealType?: (typeof MEAL_TYPES)[number] },
) {
  const id = z.uuid().parse(mealId);
  const corrected = z.array(itemSchema).max(20).parse(items);
  const title = meta?.title ? z.string().trim().min(1).max(70).parse(meta.title) : undefined;
  const mealType = meta?.mealType ? z.enum(MEAL_TYPES).parse(meta.mealType) : undefined;
  const { supabase, user } = await requireUser();

  const totals = corrected.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
      fiber_g: acc.fiber_g + item.fiber_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  );

  const { error } = await supabase
    .from("meals")
    .update({
      ...(title ? { title } : {}),
      ...(mealType ? { meal_type: mealType } : {}),
      items: corrected,
      kcal: Math.round(totals.kcal),
      protein_g: round1(totals.protein_g),
      carbs_g: round1(totals.carbs_g),
      fat_g: round1(totals.fat_g),
      fiber_g: round1(totals.fiber_g),
      // A hand-corrected meal is no longer an estimate.
      ai_confidence: "high",
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not save those corrections: ${error.message}`);

  // Teach the memory what the corrected portions actually are, and pin them:
  // a number the user typed outranks anything a model guesses later.
  for (const item of corrected) {
    const key = memoryKey(item.name);
    if (!key) continue;
    const { error: memoryError } = await supabase.from("food_memories").upsert(
      {
        user_id: user.id,
        key,
        name: item.name,
        portion: item.portion,
        kcal: Math.round(item.kcal),
        protein_g: round1(item.protein_g),
        carbs_g: round1(item.carbs_g),
        fat_g: round1(item.fat_g),
        fiber_g: round1(item.fiber_g),
        is_pinned: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    );
    if (memoryError) throw new Error(`Could not remember that portion: ${memoryError.message}`);
  }

  revalidatePath("/food");
  revalidatePath("/today");
  revalidatePath("/settings");
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
