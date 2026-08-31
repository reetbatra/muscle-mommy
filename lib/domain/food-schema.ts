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

export const ANALYSIS_PROMPT = `You are estimating the nutrition of a meal from a photo for someone tracking macros in a calorie deficit.

Break the plate into the separate foods you can actually see. For each one, state the portion you assumed and give calories, protein, carbohydrate, fat and fibre in grams.

Rules:
- Estimate portions from visual cues: plate and bowl size, cutlery, hands, cans and packets.
- Home-cooked food usually carries more oil than a restaurant photo suggests. Account for cooking fat you cannot see, especially in curries, stir fries and anything fried.
- Cover the cuisine you actually see, including South Asian, East Asian, Middle Eastern and Mediterranean dishes. Name dishes the way the person eating them would.
- If a food is ambiguous, choose the more common preparation and say so in the note.
- Never return zero for every macro. If you truly cannot tell, mark confidence low and give your best single estimate anyway.
- Round calories to the nearest 5 and grams to the nearest 0.5.
- Pick the meal type from the food itself, not the time of day.`;
