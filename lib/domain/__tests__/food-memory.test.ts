import { describe, expect, it } from "vitest";
import {
  formatMemoriesForPrompt,
  memoryKey,
  rankMemories,
  shouldUpdateMemory,
  type FoodMemory,
} from "../food-memory";

const memory = (over: Partial<FoodMemory>): FoodMemory => ({
  key: "paneer",
  name: "Paneer",
  portion: "100g",
  kcal: 265,
  protein_g: 18,
  carbs_g: 6,
  fat_g: 20,
  fiber_g: 0,
  times_logged: 1,
  is_pinned: false,
  ...over,
});

describe("memoryKey", () => {
  it("folds the ways one food gets written into a single key", () => {
    expect(memoryKey("Paneer")).toBe("paneer");
    expect(memoryKey("paneer (100g)")).toBe("paneer");
    expect(memoryKey("  Fresh Paneer  ")).toBe("paneer");
    expect(memoryKey("some paneer")).toBe("paneer");
  });

  it("keeps genuinely different dishes apart", () => {
    expect(memoryKey("Palak Paneer")).not.toBe(memoryKey("Paneer"));
    expect(memoryKey("Chicken Curry")).not.toBe(memoryKey("Chicken"));
  });

  it("folds plurals onto the singular", () => {
    expect(memoryKey("Rotis")).toBe(memoryKey("Roti"));
    expect(memoryKey("Almonds")).toBe(memoryKey("Almond"));
  });

  it("does not mangle a word that legitimately ends in double s", () => {
    expect(memoryKey("Cress")).toBe("cress");
  });

  it("returns an empty key for a name made only of filler", () => {
    expect(memoryKey("some of the")).toBe("");
  });
});

describe("rankMemories", () => {
  it("puts pinned entries first regardless of how often they are eaten", () => {
    const ranked = rankMemories([
      memory({ key: "rice", name: "Rice", times_logged: 40 }),
      memory({ key: "paneer", name: "Paneer", times_logged: 2, is_pinned: true }),
    ]);
    expect(ranked[0].name).toBe("Paneer");
  });

  it("orders the rest by how often they are eaten", () => {
    const ranked = rankMemories([
      memory({ key: "dal", name: "Dal", times_logged: 3 }),
      memory({ key: "rice", name: "Rice", times_logged: 9 }),
    ]);
    expect(ranked.map((m) => m.name)).toEqual(["Rice", "Dal"]);
  });
});

describe("formatMemoriesForPrompt", () => {
  it("says nothing at all when there is nothing to say", () => {
    expect(formatMemoriesForPrompt([])).toBe("");
  });

  it("states the portion and the macros for each food", () => {
    const prompt = formatMemoriesForPrompt([memory({})]);
    expect(prompt).toContain("Paneer: 100g = 265 kcal, P18 C6 F20 fib0");
  });

  it("marks a pinned food so the model does not second-guess it", () => {
    const prompt = formatMemoriesForPrompt([memory({ is_pinned: true })]);
    expect(prompt).toContain("[always this]");
  });

  it("caps the list, because this rides on every request", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      memory({ key: `food${i}`, name: `Food ${i}`, times_logged: i }),
    );
    const lines = formatMemoriesForPrompt(many, 30).split("\n").filter((l) => l.startsWith("- "));
    expect(lines).toHaveLength(30);
    // The most eaten survive the cap.
    expect(lines[0]).toContain("Food 59");
  });
});

describe("shouldUpdateMemory", () => {
  it("records a food it has never seen", () => {
    expect(shouldUpdateMemory(null, false)).toBe(true);
  });

  it("updates an ordinary memory from a new estimate", () => {
    expect(shouldUpdateMemory(memory({}), false)).toBe(true);
  });

  it("refuses to let an estimate overwrite what the user pinned", () => {
    expect(shouldUpdateMemory(memory({ is_pinned: true }), false)).toBe(false);
  });

  it("lets the user's own stated amount overwrite their pin", () => {
    expect(shouldUpdateMemory(memory({ is_pinned: true }), true)).toBe(true);
  });
});
