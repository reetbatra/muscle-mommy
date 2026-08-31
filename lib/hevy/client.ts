import { z } from "zod";

/**
 * Hevy's public API. Requires a Hevy Pro subscription; the key comes from
 * hevy.com/settings?developer and goes in an `api-key` header.
 */

const BASE = "https://api.hevyapp.com";
const PAGE_SIZE = 10;

export const hevySetSchema = z.object({
  index: z.number(),
  type: z.string().nullish(),
  weight_kg: z.number().nullish(),
  reps: z.number().nullish(),
  distance_meters: z.number().nullish(),
  duration_seconds: z.number().nullish(),
  rpe: z.number().nullish(),
});

export const hevyExerciseSchema = z.object({
  index: z.number(),
  title: z.string(),
  notes: z.string().nullish(),
  exercise_template_id: z.string(),
  supersets_id: z.number().nullish(),
  sets: z.array(hevySetSchema).default([]),
});

export const hevyWorkoutSchema = z.object({
  id: z.string(),
  title: z.string().default("Workout"),
  description: z.string().nullish(),
  routine_id: z.string().nullish(),
  start_time: z.string(),
  end_time: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_at: z.string().nullish(),
  exercises: z.array(hevyExerciseSchema).default([]),
});

export type HevyWorkout = z.infer<typeof hevyWorkoutSchema>;
export type HevySet = z.infer<typeof hevySetSchema>;

const workoutsPage = z.object({
  page: z.number(),
  page_count: z.number(),
  workouts: z.array(hevyWorkoutSchema).default([]),
});

const eventsPage = z.object({
  page: z.number(),
  page_count: z.number(),
  events: z
    .array(
      z.union([
        z.object({ type: z.literal("updated"), workout: hevyWorkoutSchema }),
        z.object({ type: z.literal("deleted"), id: z.string(), deleted_at: z.string().nullish() }),
      ]),
    )
    .default([]),
});

export type HevyEvent = z.infer<typeof eventsPage>["events"][number];

export class HevyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HevyError";
  }
}

async function request(path: string, apiKey: string, params: Record<string, string | number> = {}) {
  const url = new URL(path, BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const response = await fetch(url, {
    headers: { "api-key": apiKey, Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    // Hevy's own messages are terse, so translate the ones that matter.
    if (response.status === 401 || response.status === 403) {
      throw new HevyError(
        "Hevy rejected that key. Check it is copied whole, and that your Hevy Pro subscription is still active.",
        response.status,
      );
    }
    if (response.status === 429) {
      throw new HevyError("Hevy is rate limiting us. Try again in a minute.", 429);
    }
    throw new HevyError(`Hevy returned ${response.status}.`, response.status);
  }

  return response.json();
}

/** Confirms a key works and returns the account it belongs to. */
export async function fetchAccount(apiKey: string): Promise<{ username: string | null }> {
  const body = await request("/v1/user/info", apiKey);
  const parsed = z.object({ username: z.string().nullish() }).safeParse(body);
  return { username: parsed.success ? (parsed.data.username ?? null) : null };
}

export async function fetchWorkoutCount(apiKey: string): Promise<number> {
  const body = await request("/v1/workouts/count", apiKey);
  const parsed = z.object({ workout_count: z.number() }).safeParse(body);
  return parsed.success ? parsed.data.workout_count : 0;
}

/** Newest first. `maxPages` caps a first-time import so it stays quick. */
export async function fetchRecentWorkouts(
  apiKey: string,
  maxPages = 6,
): Promise<HevyWorkout[]> {
  const workouts: HevyWorkout[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const body = await request("/v1/workouts", apiKey, { page, pageSize: PAGE_SIZE });
    const parsed = workoutsPage.safeParse(body);
    if (!parsed.success) {
      throw new HevyError("Hevy sent back a workout list this app could not read.", 502);
    }
    workouts.push(...parsed.data.workouts);
    if (page >= parsed.data.page_count) break;
  }
  return workouts;
}

/** Everything that changed since `since`, including deletions. */
export async function fetchEvents(
  apiKey: string,
  since: string,
  maxPages = 20,
): Promise<HevyEvent[]> {
  const events: HevyEvent[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const body = await request("/v1/workouts/events", apiKey, {
      page,
      pageSize: PAGE_SIZE,
      since,
    });
    const parsed = eventsPage.safeParse(body);
    if (!parsed.success) {
      throw new HevyError("Hevy sent back a change list this app could not read.", 502);
    }
    events.push(...parsed.data.events);
    if (page >= parsed.data.page_count) break;
  }
  return events;
}
