/**
 * Progressive overload engine.
 *
 * The contract, in the user's own words: push every set to failure, and when
 * every set in an exercise reaches the rep ceiling, put the weight up.
 *
 * The part that needs care is "put the weight up", because the next weight is
 * a hardware fact, not arithmetic. A pin stack moves in 5kg steps. A dumbbell
 * rack moves to whatever pair is physically on the shelf. And when the only
 * jump available doubles the load, telling someone to add 2.5kg to a 2.5kg
 * dumbbell is useless advice, so the reps keep climbing instead until the
 * jump is survivable.
 */

export type LoadType =
  | "machine"
  | "dumbbell_pair"
  | "dumbbell_single"
  | "barbell"
  | "bodyweight"
  | "banded";

export type LoggedSet = {
  weight_kg: number;
  reps: number;
  is_warmup: boolean;
  set_index: number;
};

export type LoadConfig = {
  /** Every dumbbell pair actually available, ascending. */
  dumbbellRack: number[];
  machineIncrementKg: number;
  barbellIncrementKg: number;
};

export const DEFAULT_LOAD_CONFIG: LoadConfig = {
  dumbbellRack: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30],
  machineIncrementKg: 5,
  barbellIncrementKg: 2.5,
};

/**
 * Above this ratio, the next weight is treated as a cliff rather than a step,
 * and reps get extended instead. 2.5kg to 5kg is a doubling and qualifies.
 * 18kg to 23kg on a stack is 1.28 and does not.
 */
export const BIG_JUMP_RATIO = 1.5;

/** How far the rep ceiling stretches each time a cliff blocks the weight. */
const CEILING_STEP = 3;

export const WEIGHTLESS: LoadType[] = ["bodyweight", "banded"];

export function isWeightless(loadType: LoadType) {
  return WEIGHTLESS.includes(loadType);
}

// ---------------------------------------------------------------------------
// Load maths
// ---------------------------------------------------------------------------

/** The next usable weight, or null when the exercise carries no external load. */
export function nextWeight(
  current: number,
  loadType: LoadType,
  config: LoadConfig,
  override?: number | null,
): number | null {
  if (isWeightless(loadType)) return null;
  if (override && override > 0) return round2(current + override);

  if (loadType === "dumbbell_pair" || loadType === "dumbbell_single") {
    const rack = [...config.dumbbellRack].sort((a, b) => a - b);
    const next = rack.find((w) => w > current + 0.001);
    // Off the end of the rack: keep the rack's own final gap going.
    if (next === undefined) {
      const gap = rack.length >= 2 ? rack[rack.length - 1] - rack[rack.length - 2] : 2.5;
      return round2(current + gap);
    }
    return round2(next);
  }

  if (loadType === "barbell") return round2(current + config.barbellIncrementKg);
  return round2(current + config.machineIncrementKg);
}

/** Epley. Honest up to roughly 12 reps, which is where this program lives. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function workingSets(sets: LoggedSet[]): LoggedSet[] {
  return sets.filter((s) => !s.is_warmup && s.reps > 0).sort((a, b) => a.set_index - b.set_index);
}

export function totalVolume(sets: LoggedSet[]): number {
  return workingSets(sets).reduce((sum, s) => sum + Math.max(s.weight_kg, 0) * s.reps, 0);
}

export function bestSet(sets: LoggedSet[]): LoggedSet | null {
  const working = workingSets(sets);
  if (working.length === 0) return null;
  return working.reduce((best, s) => {
    const better = estimateOneRepMax(s.weight_kg, s.reps) > estimateOneRepMax(best.weight_kg, best.reps);
    // Bodyweight sets all estimate to zero, so fall back to raw reps.
    if (s.weight_kg === 0 && best.weight_kg === 0) return s.reps > best.reps ? s : best;
    return better ? s : best;
  });
}

export function bestOneRepMax(sets: LoggedSet[]): number {
  const top = bestSet(sets);
  return top ? estimateOneRepMax(top.weight_kg, top.reps) : 0;
}

/** The weight carried by the most sets. Ties go to the heavier one. */
export function workingWeight(sets: LoggedSet[]): number {
  const working = workingSets(sets);
  if (working.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const s of working) counts.set(s.weight_kg, (counts.get(s.weight_kg) ?? 0) + 1);
  let best = working[0].weight_kg;
  let bestCount = 0;
  for (const [weight, count] of counts) {
    if (count > bestCount || (count === bestCount && weight > best)) {
      best = weight;
      bestCount = count;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Prescription
// ---------------------------------------------------------------------------

export type PrescriptionStatus = "first" | "add-reps" | "extend-reps" | "add-weight";

export type SetTarget = {
  /** 1-based, matching how sets are numbered in the logger. */
  setIndex: number;
  weightKg: number | null;
  reps: number;
  previousReps: number | null;
  /** The final set is an as-many-reps-as-possible set. */
  toFailure: boolean;
};

export type Prescription = {
  status: PrescriptionStatus;
  targets: SetTarget[];
  weightKg: number | null;
  previousWeightKg: number | null;
  weightChanged: boolean;
  /** The rep number that counts as "done" for every set this session. */
  ceiling: number;
  headline: string;
  detail: string;
  previousLabel: string | null;
  isFirstTime: boolean;
};

export type PrescribeOptions = {
  targetSets: number;
  repLow: number;
  repHigh: number;
  repCeilingMax: number;
  loadType: LoadType;
  incrementKg?: number | null;
  toFailure?: boolean;
  config?: LoadConfig;
};

/**
 * Works out the effective ceiling. It only stretches past rep_high when the
 * next weight is a cliff and the previous session already cleared the current
 * ceiling on every set.
 */
export function effectiveCeiling(
  previousReps: number[],
  opts: { repHigh: number; repCeilingMax: number; blockedByBigJump: boolean },
): number {
  const { repHigh, repCeilingMax, blockedByBigJump } = opts;
  if (!blockedByBigJump || previousReps.length === 0) return repHigh;
  let ceiling = repHigh;
  while (ceiling < repCeilingMax && previousReps.every((r) => r >= ceiling)) {
    ceiling = Math.min(ceiling + CEILING_STEP, repCeilingMax);
  }
  return ceiling;
}

export function prescribe(previous: LoggedSet[], opts: PrescribeOptions): Prescription {
  const {
    targetSets,
    repLow,
    repHigh,
    repCeilingMax,
    loadType,
    incrementKg,
    toFailure = true,
    config = DEFAULT_LOAD_CONFIG,
  } = opts;

  const working = workingSets(previous);
  const weightless = isWeightless(loadType);

  if (working.length === 0) {
    return {
      status: "first",
      targets: Array.from({ length: targetSets }, (_, i) => ({
        setIndex: i + 1,
        weightKg: null,
        reps: repHigh,
        previousReps: null,
        toFailure: toFailure && i === targetSets - 1,
      })),
      weightKg: null,
      previousWeightKg: null,
      weightChanged: false,
      ceiling: repHigh,
      headline: `${targetSets} sets, ${repLow} to ${repHigh} reps`,
      detail: weightless
        ? "First time logged. Do what you can and the app takes it from here."
        : "First time logged. Pick a weight you could stop two reps short of, then log it.",
      previousLabel: null,
      isFirstTime: true,
    };
  }

  const weight = weightless ? 0 : workingWeight(working);
  const previousLabel = describeSets(working, loadType);

  // Reps from last time, in set order, padded out if the plan grew.
  const previousReps = padReps(
    working.map((s) => s.reps),
    targetSets,
  );

  const candidate = weightless ? null : nextWeight(weight, loadType, config, incrementKg);
  const jumpRatio = candidate !== null && weight > 0 ? candidate / weight : 1;
  const blockedByBigJump = candidate !== null && jumpRatio > BIG_JUMP_RATIO;

  const ceiling = effectiveCeiling(previousReps, { repHigh, repCeilingMax, blockedByBigJump });
  const allAtCeiling = previousReps.every((r) => r >= ceiling);

  const build = (
    reps: number[],
    weightKg: number | null,
    status: PrescriptionStatus,
    headline: string,
    detail: string,
  ): Prescription => ({
    status,
    targets: reps.map((r, i) => ({
      setIndex: i + 1,
      weightKg,
      reps: r,
      previousReps: previousReps[i] ?? null,
      toFailure: toFailure && i === reps.length - 1,
    })),
    weightKg,
    previousWeightKg: weightless ? null : weight,
    weightChanged: !weightless && weightKg !== null && Math.abs(weightKg - weight) > 0.001,
    ceiling,
    headline,
    detail,
    previousLabel,
    isFirstTime: false,
  });

  const weightLabel = weightless ? "bodyweight" : `${trim(weight)}kg`;

  // Case 1: still climbing toward the ceiling. Add a rep to whatever lags.
  if (!allAtCeiling) {
    const reps = previousReps.map((r) => (r >= ceiling ? r : r + 1));
    const lagging = previousReps.filter((r) => r < ceiling).length;

    // The ceiling only sits above rep_high when a weight cliff pushed it
    // there, and that is worth saying rather than leaving as a mystery.
    if (ceiling > repHigh && candidate !== null) {
      return build(
        reps,
        weight,
        "extend-reps",
        `Stay at ${weightLabel}, chase ${ceiling} reps`,
        `The next weight up is ${trim(candidate)}kg, which is nearly double. Build every set to ${ceiling} first so the jump is survivable.`,
      );
    }

    return build(
      reps,
      weightless ? null : weight,
      "add-reps",
      `Stay at ${weightLabel}`,
      `Add one rep to ${lagging === previousReps.length ? "every set" : `${lagging} ${lagging === 1 ? "set" : "sets"}`}. All sets at ${ceiling} unlocks the next weight.`,
    );
  }

  // Case 2: no external load, so reps are the only lever there is.
  if (candidate === null) {
    const reps = previousReps.map((r) => r + 1);
    return build(
      reps,
      null,
      "add-reps",
      "One more rep everywhere",
      "No weight to add here, so reps are the whole progression. Last set to failure.",
    );
  }

  // Case 3: earned it. Up the weight, reps reset to the bottom of the range.
  // Reaching here with a cliff ahead means the ceiling is already maxed out,
  // so the jump has been deferred as long as it usefully can be.
  const reps = previousReps.map(() => repLow);
  return build(
    reps,
    candidate,
    "add-weight",
    `Go up to ${trim(candidate)}kg`,
    `Every set hit ${ceiling} at ${weightLabel}. Reps will drop, and that is exactly right.`,
  );
}

function padReps(reps: number[], targetSets: number): number[] {
  if (reps.length >= targetSets) return reps.slice(0, targetSets);
  const last = reps.at(-1) ?? 0;
  return [...reps, ...Array.from({ length: targetSets - reps.length }, () => last)];
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export type Verdict = "up" | "same" | "down" | "first";

export type ExerciseComparison = {
  verdict: Verdict;
  volume: number;
  previousVolume: number;
  volumeDeltaPct: number;
  bestE1rm: number;
  previousBestE1rm: number;
  topSet: LoggedSet | null;
  previousTopSet: LoggedSet | null;
  reason: string;
};

const EPS = 0.001;

export function compareSessions(current: LoggedSet[], previous: LoggedSet[]): ExerciseComparison {
  const cur = workingSets(current);
  const prev = workingSets(previous);

  const volume = totalVolume(current);
  const previousVolume = totalVolume(previous);
  const bestE1rm = bestOneRepMax(current);
  const previousBestE1rm = bestOneRepMax(previous);
  const topSet = bestSet(current);
  const previousTopSet = bestSet(previous);
  const volumeDeltaPct = previousVolume > 0 ? ((volume - previousVolume) / previousVolume) * 100 : 0;

  const base = {
    volume,
    previousVolume,
    volumeDeltaPct,
    bestE1rm,
    previousBestE1rm,
    topSet,
    previousTopSet,
  };

  if (prev.length === 0) {
    return { ...base, verdict: "first", reason: "First time logged. This is the baseline." };
  }
  if (cur.length === 0) {
    return { ...base, verdict: "down", reason: "No working sets logged." };
  }

  const curReps = cur.reduce((n, s) => n + s.reps, 0);
  const prevReps = prev.reduce((n, s) => n + s.reps, 0);
  const curWeight = workingWeight(cur);
  const prevWeight = workingWeight(prev);

  // Bodyweight work only has reps to compare.
  if (curWeight === 0 && prevWeight === 0) {
    if (curReps > prevReps) {
      return { ...base, verdict: "up", reason: `${curReps - prevReps} more total reps.` };
    }
    if (curReps === prevReps) {
      return { ...base, verdict: "same", reason: "Same total reps as last time." };
    }
    return { ...base, verdict: "down", reason: `${prevReps - curReps} fewer total reps.` };
  }

  // Moving up a weight always costs reps, and the app is the thing that asked
  // for it. As long as the estimated max held, that is progress, not a dip.
  if (curWeight > prevWeight + EPS && bestE1rm >= previousBestE1rm - EPS) {
    return { ...base, verdict: "up", reason: `Up ${trim(curWeight - prevWeight)}kg on your working sets.` };
  }
  if (Math.abs(curWeight - prevWeight) <= EPS && curReps > prevReps) {
    const gain = curReps - prevReps;
    return {
      ...base,
      verdict: "up",
      reason: `Same ${trim(curWeight)}kg, ${gain} more ${gain === 1 ? "rep" : "reps"}.`,
    };
  }
  if (bestE1rm > previousBestE1rm * 1.01) {
    const pct = Math.round(((bestE1rm - previousBestE1rm) / previousBestE1rm) * 100);
    return { ...base, verdict: "up", reason: `Estimated max up ${pct}%.` };
  }
  if (volume > previousVolume + EPS) {
    return { ...base, verdict: "up", reason: `${Math.round(volumeDeltaPct)}% more total volume.` };
  }
  if (Math.abs(volume - previousVolume) <= EPS) {
    return { ...base, verdict: "same", reason: "Identical to last time. Held the line." };
  }
  if (volume >= previousVolume * 0.97) {
    return { ...base, verdict: "same", reason: "Roughly level with last time." };
  }
  return {
    ...base,
    verdict: "down",
    reason: `${Math.abs(Math.round(volumeDeltaPct))}% less volume than last time.`,
  };
}

/** "3 x 10 @ 40kg", or "13, 9, 12 @ 10kg each hand" when reps drifted. */
export function describeSets(sets: LoggedSet[], loadType: LoadType = "machine"): string {
  const working = workingSets(sets);
  if (working.length === 0) return "nothing logged";

  const reps = working.map((s) => s.reps);
  const uniqueReps = [...new Set(reps)];
  const weights = [...new Set(working.map((s) => s.weight_kg))];

  if (isWeightless(loadType) || weights.every((w) => w === 0)) {
    return uniqueReps.length === 1
      ? `${working.length} x ${uniqueReps[0]}`
      : reps.join(", ");
  }

  const suffix = loadType === "dumbbell_pair" ? "kg each hand" : "kg";
  const weightLabel =
    weights.length === 1
      ? `${trim(weights[0])}${suffix}`
      : `${trim(Math.min(...weights))}-${trim(Math.max(...weights))}${suffix}`;

  return uniqueReps.length === 1
    ? `${working.length} x ${uniqueReps[0]} @ ${weightLabel}`
    : `${reps.join(", ")} @ ${weightLabel}`;
}

/** Share of exercises in a session that beat their previous session. */
export function overloadScore(comparisons: ExerciseComparison[]) {
  const tally = { up: 0, same: 0, down: 0, first: 0 };
  for (const c of comparisons) tally[c.verdict] += 1;
  const scored = tally.up + tally.same + tally.down;
  return { ...tally, scored, pct: scored === 0 ? 0 : Math.round((tally.up / scored) * 100) };
}

// ---------------------------------------------------------------------------
// Energy
// ---------------------------------------------------------------------------

/**
 * Rough energy cost of a lifting session, used only when Apple Health has not
 * reported a workout for the day. Resistance training sits near 5 METs, and
 * the standard MET equation is kcal/min = MET * 3.5 * kg / 200.
 */
export function estimateSessionKcal(minutes: number, bodyWeightKg: number, mets = 5): number {
  if (minutes <= 0 || bodyWeightKg <= 0) return 0;
  return Math.round(((mets * 3.5 * bodyWeightKg) / 200) * minutes);
}

function trim(n: number) {
  return Number(n.toFixed(2)).toString();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
