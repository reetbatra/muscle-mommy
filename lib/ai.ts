import "server-only";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";

/**
 * Which model reads your meals.
 *
 * DeepSeek is used when a key is present, falling back to Claude through the
 * Vercel AI Gateway otherwise, so the app still works with neither configured
 * locally. Both model ids are overridable by environment variable, which means
 * trying a different one is a config change rather than a deploy.
 *
 * DeepSeek serves vision from a separate experimental model. Sending an image
 * to the text model returns nothing useful, so the two are resolved apart.
 */

const VISION_FALLBACK = "anthropic/claude-sonnet-5";
const TEXT_FALLBACK = "anthropic/claude-sonnet-5";

function deepseekKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY ?? process.env.DEEP_SEEK;
}

export function hasFoodModel(): boolean {
  return Boolean(deepseekKey() || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export function foodModel(kind: "vision" | "text"): LanguageModel {
  const key = deepseekKey();

  if (key) {
    const deepseek = createDeepSeek({ apiKey: key });
    const id =
      kind === "vision"
        ? (process.env.DEEPSEEK_VISION_MODEL ?? "deepseek-v4-flash-vision-exp")
        : (process.env.DEEPSEEK_TEXT_MODEL ?? "deepseek-v4-pro");
    return deepseek(id);
  }

  return kind === "vision"
    ? (process.env.FOOD_VISION_MODEL ?? VISION_FALLBACK)
    : (process.env.FOOD_TEXT_MODEL ?? TEXT_FALLBACK);
}

export function foodModelName(): string {
  return deepseekKey() ? "DeepSeek" : "Claude";
}
