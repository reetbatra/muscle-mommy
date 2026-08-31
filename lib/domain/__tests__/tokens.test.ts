import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Every var(--x) in the app has to resolve to something defined in
 * globals.css.
 *
 * This exists because renaming the palette silently broke 76 references at
 * once. An undefined custom property does not error, it just resolves to
 * nothing, so the macro bars rendered transparent and looked like a data bug
 * rather than a styling one.
 */

const ROOT = path.resolve(__dirname, "../../..");

function definedVariables(): Set<string> {
  const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
  return new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
}

function sourceFiles(): string[] {
  const dirs = ["app", "components", "lib"];
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      // The design preview owns a separate --p-* namespace in its own
      // stylesheet, and this test talks about var() in its own prose.
      if (full.includes("preview") || full.includes("__tests__")) continue;
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|css)$/.test(entry.name)) found.push(full);
    }
  };
  for (const dir of dirs) walk(path.join(ROOT, dir));
  return found;
}

describe("CSS custom properties", () => {
  it("resolves every var() used in the app", () => {
    const defined = definedVariables();
    const dangling: string[] = [];

    for (const file of sourceFiles()) {
      const contents = fs.readFileSync(file, "utf8");
      for (const match of contents.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const name = match[1];
        // Tailwind generates --color-*, --font-* and --radius-* from @theme.
        if (name.startsWith("--color-") || name.startsWith("--font-") || name.startsWith("--radius-")) {
          continue;
        }
        if (!defined.has(name)) {
          dangling.push(`${path.relative(ROOT, file)} uses ${name}`);
        }
      }
    }

    expect([...new Set(dangling)]).toEqual([]);
  });

  it("knows what a dangling reference looks like", () => {
    // Guards the test itself: if the parser broke, this would also pass empty.
    expect(definedVariables().has("--accent")).toBe(true);
    expect(definedVariables().has("--pink-deep")).toBe(false);
  });
});
