/**
 * Remembering what a portion means for one particular person.
 *
 * The model can tell paneer from tofu. It cannot tell whether this person's
 * paneer is 100g or 200g, and that single guess moves the calorie estimate by
 * more than any model swap would. So the portions that actually get accepted
 * are recorded and handed back as context next time.
 */

export type FoodMemory = {
  key: string;
  name: string;
  portion: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  times_logged: number;
  is_pinned: boolean;
};

const FILLERS = new Set([
  "a", "an", "the", "of", "with", "and", "some", "fresh", "homemade",
  "grilled", "cooked", "plain", "my", "usual",
]);

/**
 * Matching key for a food name. "Paneer (100g)", "paneer curry" and "Paneer"
 * should not become three separate memories, but paneer and palak paneer are
 * genuinely different dishes and stay apart.
 */
export function memoryKey(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !FILLERS.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));

  return words.join(" ").trim();
}

/** Highest signal first: pinned, then most often eaten, then most recent. */
export function rankMemories(memories: FoodMemory[]): FoodMemory[] {
  return [...memories].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return b.times_logged - a.times_logged;
  });
}

/**
 * The block handed to the model. Kept terse because it rides on every single
 * request, and long context on a repeated call is a real cost.
 */
export function formatMemoriesForPrompt(memories: FoodMemory[], limit = 30): string {
  const ranked = rankMemories(memories).slice(0, limit);
  if (ranked.length === 0) return "";

  const lines = ranked.map((m) => {
    const macros = `${Math.round(m.kcal)} kcal, P${round(m.protein_g)} C${round(m.carbs_g)} F${round(m.fat_g)} fib${round(m.fiber_g)}`;
    const pin = m.is_pinned ? " [always this]" : "";
    return `- ${m.name}: ${m.portion} = ${macros}${pin}`;
  });

  return [
    "This person's usual foods and the portions they actually eat.",
    "When you recognise one of these and they have not said a different amount,",
    "use their portion and these macros rather than estimating fresh.",
    "Entries marked [always this] are confirmed and should not be second-guessed.",
    ...lines,
  ].join("\n");
}

/**
 * Whether a newly logged item should overwrite what is remembered. A pinned
 * memory is the user's own statement and outranks any estimate.
 */
export function shouldUpdateMemory(existing: FoodMemory | null, fromUserNote: boolean): boolean {
  if (!existing) return true;
  if (existing.is_pinned) return fromUserNote;
  return true;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
