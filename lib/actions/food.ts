"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { MEAL_TYPES } from "@/lib/domain/food-schema";

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
