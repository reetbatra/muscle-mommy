import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { foodModel, hasFoodModel } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { buildAnalysisPrompt, mealAnalysisSchema } from "@/lib/domain/food-schema";
import { sumMeals } from "@/lib/domain/macros";
import {
  formatMemoriesForPrompt,
  memoryKey,
  shouldUpdateMemory,
  type FoodMemory,
} from "@/lib/domain/food-memory";

export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * One photo, or a sentence, or both. Stores the picture, asks the model what
 * is on the plate with this person's usual portions as context, writes the
 * meal, and remembers what it learned for next time.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!hasFoodModel()) {
    return NextResponse.json(
      { error: "No food model is configured. Add a meal by hand instead." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("photo");
  const note = String(form.get("note") ?? "").trim();
  const logDate = String(form.get("log_date") ?? "");
  const mealTypeHint = String(form.get("meal_type") ?? "");

  const hasPhoto = file instanceof File && file.size > 0;
  if (!hasPhoto && note.length === 0) {
    return NextResponse.json(
      { error: "Send a photo, or describe what you ate." },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return NextResponse.json({ error: "Missing the date for this meal." }, { status: 400 });
  }

  let bytes: Uint8Array | null = null;
  let path: string | null = null;

  if (hasPhoto) {
    const photo = file as File;
    if (photo.size > MAX_BYTES) {
      return NextResponse.json({ error: "That photo is over 12MB." }, { status: 413 });
    }
    if (!ACCEPTED.includes(photo.type)) {
      return NextResponse.json(
        { error: `Photos need to be JPEG, PNG, WebP or HEIC. That one is ${photo.type || "unknown"}.` },
        { status: 415 },
      );
    }

    bytes = new Uint8Array(await photo.arrayBuffer());
    const extension = photo.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    path = `${user.id}/${logDate}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("meal-photos")
      .upload(path, bytes, { contentType: photo.type, upsert: false });
    if (uploadError) {
      return NextResponse.json(
        { error: `Could not save the photo: ${uploadError.message}` },
        { status: 500 },
      );
    }
  }

  // What this person usually eats, and in what amounts.
  const { data: memoryRows } = await supabase
    .from("food_memories")
    .select("key, name, portion, kcal, protein_g, carbs_g, fat_g, fiber_g, times_logged, is_pinned")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("times_logged", { ascending: false })
    .limit(60);

  const memories = (memoryRows ?? []).map(toMemory);

  const userContent: (
    | { type: "text"; text: string }
    | { type: "file"; data: Uint8Array; mediaType: string }
  )[] = [
    {
      type: "text",
      text: hasPhoto
        ? mealTypeHint
          ? `This was logged as ${mealTypeHint}. Estimate what is on the plate.`
          : "Estimate what is on the plate."
        : `Estimate this meal from the description alone: ${note}`,
    },
  ];
  if (hasPhoto && bytes) {
    userContent.push({ type: "file", data: bytes, mediaType: (file as File).type });
  }

  let analysis;
  try {
    const result = await generateText({
      model: foodModel(hasPhoto ? "vision" : "text"),
      output: Output.object({ schema: mealAnalysisSchema, name: "meal_analysis" }),
      system: buildAnalysisPrompt({
        memories: formatMemoriesForPrompt(memories),
        note: note || null,
      }),
      messages: [{ role: "user", content: userContent }],
    });
    analysis = result.output;
  } catch (error) {
    if (path) await supabase.storage.from("meal-photos").remove([path]);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Could not read that meal: ${message}` }, { status: 502 });
  }

  const totals = sumMeals(analysis.items);

  const { data: meal, error: insertError } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      log_date: logDate,
      meal_type: analysis.meal_type,
      title: analysis.title,
      photo_path: path,
      note: note || null,
      kcal: Math.round(totals.kcal),
      protein_g: round1(totals.protein_g),
      carbs_g: round1(totals.carbs_g),
      fat_g: round1(totals.fat_g),
      fiber_g: round1(totals.fiber_g),
      items: analysis.items,
      ai_confidence: analysis.confidence,
      ai_note: analysis.note || null,
      source: hasPhoto ? "photo" : "text",
    })
    .select("*")
    .single();

  if (insertError) {
    if (path) await supabase.storage.from("meal-photos").remove([path]);
    return NextResponse.json(
      { error: `Could not save the meal: ${insertError.message}` },
      { status: 500 },
    );
  }

  const learned = await rememberFoods(supabase, user.id, analysis.items, memories, note.length > 0);

  return NextResponse.json({ meal, learned });
}

/**
 * Records the portion that was actually accepted for each food. A pinned
 * memory is the user's own statement, so an estimate never overwrites it, but
 * an explicitly stated amount does.
 */
async function rememberFoods(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  items: { name: string; portion: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }[],
  existing: FoodMemory[],
  fromUserNote: boolean,
): Promise<string[]> {
  const byKey = new Map(existing.map((m) => [m.key, m]));
  const learned: string[] = [];

  for (const item of items) {
    const key = memoryKey(item.name);
    if (!key) continue;

    const known = byKey.get(key) ?? null;
    if (!shouldUpdateMemory(known, fromUserNote)) continue;

    const { error } = await supabase.from("food_memories").upsert(
      {
        user_id: userId,
        key,
        name: item.name,
        portion: item.portion,
        kcal: Math.round(item.kcal),
        protein_g: round1(item.protein_g),
        carbs_g: round1(item.carbs_g),
        fat_g: round1(item.fat_g),
        fiber_g: round1(item.fiber_g),
        times_logged: (known?.times_logged ?? 0) + 1,
        is_pinned: known?.is_pinned ?? false,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    );
    // A failure to remember must never lose the meal that was already saved.
    if (!error && !known) learned.push(item.name);
  }

  return learned;
}

function toMemory(row: Record<string, unknown>): FoodMemory {
  return {
    key: String(row.key),
    name: String(row.name),
    portion: String(row.portion),
    kcal: Number(row.kcal),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
    fiber_g: Number(row.fiber_g),
    times_logged: Number(row.times_logged),
    is_pinned: Boolean(row.is_pinned),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
