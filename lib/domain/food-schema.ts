import { z } from "zod";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const mealItemSchema = z.object({
  name: z.string().min(1).describe("The food, as a person would say it out loud"),
  portion: z.string().min(1).describe("The portion you assumed, e.g. '1 medium bowl' or '150g'"),
  kcal: z.number().min(0).max(4000),
  protein_g: z.number().min(0).max(300),
  carbs_g: z.number().min(0).max(500),
  fat_g: z.number().min(0).max(300),
  fiber_g: z.number().min(0).max(120),
});

export const mealAnalysisSchema = z.object({
  title: z.string().min(1).max(70).describe("A short name for the whole plate"),
  meal_type: z.enum(MEAL_TYPES),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How sure you are. Low when portions are genuinely unclear."),
  note: z
    .string()
    .max(220)
    .describe("The main assumption you made, in one sentence. Empty string if there wasn't one."),
  items: z.array(mealItemSchema).min(1).max(12),
});

export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;

export const ANALYSIS_PROMPT = `You are estimating the nutrition of a meal for someone tracking macros in a calorie deficit. You may be given a photo, a written description, or both.

Break the plate into the separate foods you can actually see. For each one, state the portion you assumed and give calories, protein, carbohydrate, fat and fibre in grams.

Rules:
- Estimate portions from visual cues: plate and bowl size, cutlery, hands, cans and packets.
- Cooking fat is easy to miss and easy to overstate. For a dish that looks home-cooked, use the amount stated under "how this person cooks" below rather than a generic allowance, and say in the note how much you assumed. If the food is clearly fried or swimming in oil, use what you can actually see instead.
- Cover the cuisine you actually see, including South Asian, East Asian, Middle Eastern and Mediterranean dishes. Name dishes the way the person eating them would.
- If a food is ambiguous, choose the more common preparation and say so in the note.
- Prefer the smaller plausible portion when the size is genuinely unclear. An underestimate the person can correct is better than an overestimate they will not notice.
- Never return zero for every macro. If you truly cannot tell, mark confidence low and give your best single estimate anyway.
- Round calories to the nearest 5 and grams to the nearest 0.5.
- Pick the meal type from the food itself, not the time of day.

What the person tells you outranks what you see. If they write "200g paneer",
it is 200g of paneer, even if the photo looks like less. Only estimate the
things they did not state.

If you are given a description and no photo, estimate from the description
alone and mark confidence low when the portion is not stated.`;

/**
 * The full instruction for one request. Kept as a function because the memory
 * block and the user's note change on every call, and the base prompt does
 * not.
 */
export const COOKING_OIL = {
  none: { label: "No added oil", grams: 0, blurb: "Nothing in the pan" },
  spray: { label: "A spray", grams: 1.5, blurb: "One spray of oil per dish" },
  light: { label: "A teaspoon", grams: 5, blurb: "About a teaspoon per dish" },
  moderate: { label: "A tablespoon", grams: 14, blurb: "About a tablespoon per dish" },
  generous: { label: "Two tablespoons", grams: 28, blurb: "A generous pour" },
} as const;

export type CookingOil = keyof typeof COOKING_OIL;

export function buildAnalysisPrompt(options: {
  memories: string;
  note: string | null;
  cookingOil?: CookingOil;
}): string {
  const parts = [ANALYSIS_PROMPT];

  const oil = COOKING_OIL[options.cookingOil ?? "light"];
  parts.push(
    "",
    "How this person cooks:",
    oil.grams === 0
      ? "- They cook without added oil. Do not add any unless the dish is visibly fried."
      : `- They cook with roughly ${oil.grams}g of oil per dish, about ${oil.label.toLowerCase()}. Use that, not a generic allowance. That is roughly ${Math.round(oil.grams * 9)} kcal, not a tablespoon's ${Math.round(14 * 9)}.`,
    "- If they state a different amount of oil or butter, that wins.",
  );

  if (options.memories) {
    parts.push("", options.memories);
  }

  if (options.note?.trim()) {
    parts.push(
      "",
      "The person wrote this alongside the meal. Treat any amount in it as fact:",
      options.note.trim(),
    );
  }

  return parts.join("\n");
}
