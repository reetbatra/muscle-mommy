/**
 * Matching Hevy's exercise names to this app's library.
 *
 * Hevy names a lift "Bench Press (Dumbbell)". This app calls the same lift
 * "Dumbbell Bench Press". Neither is wrong, and a plain string compare finds
 * nothing, so names are reduced to a set of tokens and compared on the part
 * that carries the meaning.
 *
 * Nothing here guesses when it is unsure. An unmatched exercise gets created
 * under the user's own library rather than quietly folded into a lift it is
 * not, because a wrong match corrupts the progression history silently and a
 * missing one is visible and fixable.
 */

/**
 * Words that describe the hardware or the grip rather than the movement.
 * "Seated Cable Row - Bar Wide Grip" and "Seated Cable Row" are the same lift.
 */
const EQUIPMENT_TOKENS = new Set([
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "smith",
  "band",
  "bodyweight",
  "assisted",
  "weighted",
  "plate",
  "loaded",
  "lever",
  "sled",
  "kettlebell",
  "ez",
  "bar",
  "rope",
  "hammerstrength",
  "grip",
  "wide",
  "close",
  "narrow",
  "neutral",
  "pronated",
  "supinated",
  "underhand",
  "overhand",
  "straight",
  "angled",
]);

/**
 * Words that change which lift it is. If one name has one of these and the
 * other does not, they are different exercises, however well the rest lines
 * up. This is what stops an incline press folding into a flat bench press.
 */
const QUALIFIER_TOKENS = new Set([
  "incline",
  "decline",
  "seated",
  "standing",
  "lying",
  "kneeling",
  "overhead",
  "single",
  "reverse",
  "front",
  "hack",
  "sumo",
  "romanian",
  "bulgarian",
  "preacher",
  "concentration",
]);

/**
 * Hevy names a handful of lifts by their generic name where the specific one
 * is unambiguous in practice. Guessing these is safe; guessing anything else
 * is not.
 */
const ALIASES: Record<string, string> = {
  "barbell squat": "back squat",
  "squat barbell": "back squat",
  "barbell deadlift": "conventional deadlift",
  "deadlift barbell": "conventional deadlift",
  // Hevy says "Bicep Curl", this app says "Dumbbell Curl". Same lift, and the
  // muscle name is not a discriminator here the way it is for, say, a leg
  // extension against a triceps extension.
  "biceps curl dumbbell": "dumbbell curl",
  "biceps curl": "dumbbell curl",
  "biceps curl barbell": "barbell curl",
};

const SYNONYMS: Record<string, string> = {
  tricep: "triceps",
  bicep: "biceps",
  banded: "band",
  bands: "band",
  db: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
  ohp: "overhead",
  rdl: "romanian",
  bulgarian: "bulgarian",
  abduction: "abduction",
  abductor: "abduction",
  adductor: "adduction",
  raises: "raise",
  curls: "curl",
  rows: "row",
  presses: "press",
  extensions: "extension",
  pulldowns: "pulldown",
  squats: "squat",
  thrusts: "thrust",
  singlearm: "single arm",
  onearm: "single arm",
  unilateral: "single arm",
};

export function tokenise(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[()\[\]]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => (SYNONYMS[token] ?? token).split(" "))
    .filter((token) => token.length > 1 || /\d/.test(token));
}

/** The movement, with the hardware words removed. */
export function coreTokens(name: string): Set<string> {
  const tokens = tokenise(name).filter((t) => !EQUIPMENT_TOKENS.has(t));
  // A name that is nothing but equipment words keeps them, so it still has
  // something to match on.
  return new Set(tokens.length > 0 ? tokens : tokenise(name));
}

export function allTokens(name: string): Set<string> {
  return new Set(tokenise(name));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((token) => b.has(token));
}

export type MatchCandidate = { id: string; name: string };

export type MatchResult = {
  id: string;
  name: string;
  confidence: "exact" | "likely";
  score: number;
};

/** Below this, a fuzzy match is a guess rather than a match. */
export const FUZZY_THRESHOLD = 0.6;

function qualifiers(tokens: Set<string>): Set<string> {
  return new Set([...tokens].filter((token) => QUALIFIER_TOKENS.has(token)));
}

export function findExerciseMatch(
  hevyTitle: string,
  candidates: MatchCandidate[],
): MatchResult | null {
  const aliased = ALIASES[[...allTokens(hevyTitle)].sort().join(" ")] ?? hevyTitle;
  const hevyCore = coreTokens(aliased);
  const hevyAll = allTokens(aliased);
  const hevyQualifiers = qualifiers(hevyAll);

  // Any candidate whose qualifiers disagree is a different lift, full stop.
  const eligible = candidates.filter((candidate) =>
    sameSet(hevyQualifiers, qualifiers(allTokens(candidate.name))),
  );

  // Pass one: same movement once the hardware words are set aside. Ties break
  // on how well the hardware words agree too, which is what separates a plain
  // hip thrust from the Smith machine one.
  const coreMatches = eligible
    .map((candidate) => ({ candidate, score: jaccard(hevyAll, allTokens(candidate.name)) }))
    .filter(({ candidate }) => sameSet(hevyCore, coreTokens(candidate.name)))
    .sort((a, b) => b.score - a.score);

  if (coreMatches.length > 0) {
    const best = coreMatches[0];
    // Two candidates that normalise identically are a coin toss, and a wrong
    // match corrupts progression history silently. Better to leave it unmatched
    // and visible.
    const tied = coreMatches.length > 1 && coreMatches[1].score >= best.score - 0.001;
    if (!tied) {
      return {
        id: best.candidate.id,
        name: best.candidate.name,
        confidence: "exact",
        score: best.score,
      };
    }
    return null;
  }

  // Pass two: close enough overall to accept, weighting the movement words
  // above the hardware words.
  const ranked = eligible
    .map((candidate) => {
      const core = jaccard(hevyCore, coreTokens(candidate.name));
      const all = jaccard(hevyAll, allTokens(candidate.name));
      return { candidate, score: core * 0.7 + all * 0.3 };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < FUZZY_THRESHOLD) return null;
  // A near tie is a coin toss, and a wrong match corrupts history silently.
  if (ranked.length > 1 && best.score - ranked[1].score < 0.05) return null;

  return {
    id: best.candidate.id,
    name: best.candidate.name,
    confidence: "likely",
    score: best.score,
  };
}

// ---------------------------------------------------------------------------

export type DayCandidate = { id: string; name: string; exerciseIds: string[] };

export type DayMatch = { id: string; name: string; score: number };

/** Below this, the workout is not recognisably one of the split's days. */
export const DAY_THRESHOLD = 0.4;

/**
 * Works out which day of the split a workout was, by how much its exercises
 * overlap each day's plan. This is what makes an imported Hevy session say
 * "Lower A" instead of "Morning Workout".
 */
export function detectRoutineDay(
  workoutExerciseIds: string[],
  days: DayCandidate[],
): DayMatch | null {
  const workout = new Set(workoutExerciseIds);
  if (workout.size === 0) return null;

  const scored = days
    .map((day) => ({ day, score: jaccard(workout, new Set(day.exerciseIds)) }))
    .filter(({ score }) => score >= DAY_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  // A clear winner only. Two days scoring the same means the split has
  // overlapping days and picking one would be a coin toss.
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;

  return { id: scored[0].day.id, name: scored[0].day.name, score: scored[0].score };
}
