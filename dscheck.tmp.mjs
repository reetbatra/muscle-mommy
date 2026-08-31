process.env.DEEPSEEK_API_KEY = Object.fromEntries(
  (await import("node:fs")).readFileSync(".env.local","utf8").split("\n")
    .filter(l=>l.includes("=")&&!l.startsWith("#"))
    .map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1).replace(/^['"]|['"]$/g,"")])
).DEEP_SEEK;

const { generateText, Output } = await import("ai");
const { createDeepSeek } = await import("@ai-sdk/deepseek");
const { mealAnalysisSchema, buildAnalysisPrompt } = await import("./lib/domain/food-schema.ts");
const { formatMemoriesForPrompt } = await import("./lib/domain/food-memory.ts");

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

// Exactly the memory block the route builds, with a pinned portion.
const memories = formatMemoriesForPrompt([{
  key: "paneer", name: "Paneer", portion: "100g",
  kcal: 265, protein_g: 18, carbs_g: 6, fat_g: 20, fiber_g: 0,
  times_logged: 12, is_pinned: true,
}]);

for (const [label, note] of [
  ["no note, memory should set the portion", null],
  ["stated amount must beat the memory", "200g paneer and 2 rotis"],
]) {
  const r = await generateText({
    model: deepseek("deepseek-v4-pro"),
    output: Output.object({ schema: mealAnalysisSchema, name: "meal_analysis" }),
    system: buildAnalysisPrompt({ memories, note }),
    prompt: note ?? "paneer with rotis",
  });
  const paneer = r.output.items.find(i => /paneer/i.test(i.name));
  console.log(`\n${label}`);
  console.log("  paneer portion ->", paneer?.portion, "|", paneer?.kcal, "kcal");
  console.log("  title:", r.output.title, "| confidence:", r.output.confidence);
}
