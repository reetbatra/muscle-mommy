import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { createClient } from "@/lib/supabase/server";
import { ANALYSIS_PROMPT, mealAnalysisSchema } from "@/lib/domain/food-schema";
import { sumMeals } from "@/lib/domain/macros";

export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Takes one photo, stores it, asks the model what is on the plate, and writes
 * the meal. One round trip, because the whole point is that logging food is a
 * single tap on a phone.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json(
      { error: "Photo logging needs AI_GATEWAY_API_KEY to be set. Add a meal by hand instead." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("photo");
  const logDate = String(form.get("log_date") ?? "");
  const mealTypeHint = String(form.get("meal_type") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo was attached." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is over 12MB." }, { status: 413 });
  }
  if (!ACCEPTED.includes(file.type)) {
    return NextResponse.json(
      { error: `Photos need to be JPEG, PNG, WebP or HEIC. That one is ${file.type || "unknown"}.` },
      { status: 415 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return NextResponse.json({ error: "Missing the date for this meal." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${user.id}/${logDate}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("meal-photos")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json(
      { error: `Could not save the photo: ${uploadError.message}` },
      { status: 500 },
    );
  }

  let analysis;
  try {
    const result = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: mealAnalysisSchema, name: "meal_analysis" }),
      system: ANALYSIS_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: mealTypeHint
                ? `This was logged as ${mealTypeHint}. Estimate what is on the plate.`
                : "Estimate what is on the plate.",
            },
            { type: "image", image: bytes, mediaType: file.type },
          ],
        },
      ],
    });
    analysis = result.output;
  } catch (error) {
    // The photo is already stored, so clean it up rather than orphan it.
    await supabase.storage.from("meal-photos").remove([path]);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Could not read that photo: ${message}` },
      { status: 502 },
    );
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
      kcal: Math.round(totals.kcal),
      protein_g: round1(totals.protein_g),
      carbs_g: round1(totals.carbs_g),
      fat_g: round1(totals.fat_g),
      fiber_g: round1(totals.fiber_g),
      items: analysis.items,
      ai_confidence: analysis.confidence,
      ai_note: analysis.note || null,
      source: "photo",
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from("meal-photos").remove([path]);
    return NextResponse.json(
      { error: `Could not save the meal: ${insertError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ meal });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
