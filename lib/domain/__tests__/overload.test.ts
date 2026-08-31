import { describe, expect, it } from "vitest";
import {
  BIG_JUMP_RATIO,
  DEFAULT_LOAD_CONFIG,
  compareSessions,
  describeSets,
  effectiveCeiling,
  estimateOneRepMax,
  estimateSessionKcal,
  nextWeight,
  overloadScore,
  prescribe,
  workingWeight,
  type LoadType,
  type LoggedSet,
} from "../overload";

/** Builds the set rows a session would have produced. */
function sets(weight: number, reps: number[]): LoggedSet[] {
  return reps.map((r, i) => ({
    weight_kg: weight,
    reps: r,
    is_warmup: false,
    set_index: i + 1,
  }));
}

const opts = (over: Partial<Parameters<typeof prescribe>[1]> = {}) => ({
  targetSets: 3,
  repLow: 8,
  repHigh: 12,
  repCeilingMax: 20,
  loadType: "machine" as LoadType,
  config: DEFAULT_LOAD_CONFIG,
  ...over,
});

describe("nextWeight", () => {
  it("steps a pin stack by the machine increment", () => {
    expect(nextWeight(18, "machine", DEFAULT_LOAD_CONFIG)).toBe(23);
    expect(nextWeight(25, "machine", DEFAULT_LOAD_CONFIG)).toBe(30);
  });

  it("steps a dumbbell to the next pair actually on the rack", () => {
    expect(nextWeight(2.5, "dumbbell_single", DEFAULT_LOAD_CONFIG)).toBe(5);
    expect(nextWeight(10, "dumbbell_pair", DEFAULT_LOAD_CONFIG)).toBe(12.5);
  });

  it("keeps the final gap going past the end of the rack", () => {
    expect(nextWeight(30, "dumbbell_pair", DEFAULT_LOAD_CONFIG)).toBe(35);
  });

  it("respects a per-exercise override", () => {
    expect(nextWeight(40, "machine", DEFAULT_LOAD_CONFIG, 7)).toBe(47);
  });

  it("returns null when there is no external load", () => {
    expect(nextWeight(0, "bodyweight", DEFAULT_LOAD_CONFIG)).toBeNull();
    expect(nextWeight(0, "banded", DEFAULT_LOAD_CONFIG)).toBeNull();
  });
});

describe("prescribe: add reps until every set hits the ceiling", () => {
  it("leg press 30kg after 10, 12, 10", () => {
    const p = prescribe(sets(30, [10, 12, 10]), opts());
    expect(p.status).toBe("add-reps");
    expect(p.weightKg).toBe(30);
    // The set already at the ceiling holds. The other two climb.
    expect(p.targets.map((t) => t.reps)).toEqual([11, 12, 11]);
    expect(p.targets.at(-1)?.toFailure).toBe(true);
  });

  it("leg extension 23kg after 8, 10, 8", () => {
    const p = prescribe(sets(23, [8, 10, 8]), opts());
    expect(p.weightKg).toBe(23);
    expect(p.targets.map((t) => t.reps)).toEqual([9, 11, 9]);
  });

  it("lat pulldown 25kg after 10, 10, 10", () => {
    const p = prescribe(sets(25, [10, 10, 10]), opts());
    expect(p.weightKg).toBe(25);
    expect(p.targets.map((t) => t.reps)).toEqual([11, 11, 11]);
  });

  it("hammer curl 10kg after 10, 10, 7", () => {
    const p = prescribe(sets(10, [10, 10, 7]), opts({ loadType: "dumbbell_single" }));
    expect(p.weightKg).toBe(10);
    expect(p.targets.map((t) => t.reps)).toEqual([11, 11, 8]);
  });

  it("incline dumbbell press 15kg after 12, 12, 10", () => {
    const p = prescribe(sets(15, [12, 12, 10]), opts({ loadType: "dumbbell_pair" }));
    expect(p.status).toBe("add-reps");
    expect(p.targets.map((t) => t.reps)).toEqual([12, 12, 11]);
  });
});

describe("prescribe: raise the weight once every set clears the ceiling", () => {
  it("single-arm cable row 18kg after 13, 13, 12 goes to 23kg", () => {
    const p = prescribe(sets(18, [13, 13, 12]), opts());
    expect(p.status).toBe("add-weight");
    expect(p.weightKg).toBe(23);
    expect(p.weightChanged).toBe(true);
    expect(p.targets.map((t) => t.reps)).toEqual([8, 8, 8]);
  });

  it("smith machine hip thrust 45kg after 15, 16, 14 goes to 50kg", () => {
    const p = prescribe(sets(45, [15, 16, 14]), opts());
    expect(p.status).toBe("add-weight");
    expect(p.weightKg).toBe(50);
  });

  it("lateral raise 5kg after 12, 13, 13 goes to 7.5kg", () => {
    // 5 to 7.5 is exactly 1.5x, which is a step rather than a cliff.
    const p = prescribe(
      sets(5, [12, 13, 13]),
      opts({ loadType: "dumbbell_pair", repLow: 10, repHigh: 12 }),
    );
    expect(p.status).toBe("add-weight");
    expect(p.weightKg).toBe(7.5);
    expect(p.targets.map((t) => t.reps)).toEqual([10, 10, 10]);
  });
});

describe("prescribe: a doubling is a cliff, so reps stretch instead", () => {
  it("2.5kg tricep extension after 15, 14, 12 chases 15 reps, not 5kg", () => {
    const p = prescribe(sets(2.5, [15, 14, 12]), opts({ loadType: "dumbbell_single" }));
    expect(p.status).toBe("extend-reps");
    expect(p.weightKg).toBe(2.5);
    expect(p.ceiling).toBe(15);
    expect(p.targets.map((t) => t.reps)).toEqual([15, 15, 13]);
    expect(p.detail).toContain("5kg");
  });

  it("2.5kg tricep extension after 11, 12, 7 just adds reps", () => {
    const p = prescribe(sets(2.5, [11, 12, 7]), opts({ loadType: "dumbbell_single" }));
    expect(p.status).toBe("add-reps");
    expect(p.targets.map((t) => t.reps)).toEqual([12, 12, 8]);
  });

  it("walks the ceiling up in threes and eventually takes the jump", () => {
    const config = { loadType: "dumbbell_single" as LoadType };
    expect(prescribe(sets(2.5, [15, 15, 15]), opts(config)).ceiling).toBe(18);
    expect(prescribe(sets(2.5, [18, 18, 18]), opts(config)).ceiling).toBe(20);

    const forced = prescribe(sets(2.5, [20, 20, 20]), opts(config));
    expect(forced.status).toBe("add-weight");
    expect(forced.weightKg).toBe(5);
    expect(forced.targets.map((t) => t.reps)).toEqual([8, 8, 8]);
  });

  it("only treats a jump as a cliff above the ratio threshold", () => {
    expect(5 / 2.5).toBeGreaterThan(BIG_JUMP_RATIO);
    expect(23 / 18).toBeLessThan(BIG_JUMP_RATIO);
  });
});

describe("prescribe: bodyweight and banded work", () => {
  it("banded push-ups after 5, 6 fill out the third set and add a rep", () => {
    const p = prescribe(
      sets(0, [5, 6]),
      opts({ loadType: "banded", repLow: 5, repHigh: 12 }),
    );
    expect(p.weightKg).toBeNull();
    expect(p.targets.map((t) => t.reps)).toEqual([6, 7, 7]);
  });

  it("banded pull-ups after 8, 7, 6", () => {
    const p = prescribe(sets(0, [8, 7, 6]), opts({ loadType: "banded", repLow: 5, repHigh: 12 }));
    expect(p.targets.map((t) => t.reps)).toEqual([9, 8, 7]);
  });

  it("keeps adding reps past the ceiling because there is nothing to load", () => {
    const p = prescribe(
      sets(0, [15, 14, 13]),
      opts({ loadType: "bodyweight", repLow: 5, repHigh: 12 }),
    );
    expect(p.status).toBe("add-reps");
    expect(p.targets.map((t) => t.reps)).toEqual([16, 15, 14]);
  });
});

describe("prescribe: first session", () => {
  it("asks for a starting weight instead of inventing one", () => {
    const p = prescribe([], opts());
    expect(p.isFirstTime).toBe(true);
    expect(p.weightKg).toBeNull();
    expect(p.targets).toHaveLength(3);
  });
});

describe("supporting maths", () => {
  it("picks the weight carried by the most sets", () => {
    expect(workingWeight(sets(30, [10, 10, 10]))).toBe(30);
    expect(
      workingWeight([
        { weight_kg: 30, reps: 10, is_warmup: false, set_index: 1 },
        { weight_kg: 30, reps: 9, is_warmup: false, set_index: 2 },
        { weight_kg: 35, reps: 6, is_warmup: false, set_index: 3 },
      ]),
    ).toBe(30);
  });

  it("ignores warm-up sets", () => {
    const withWarmup: LoggedSet[] = [
      { weight_kg: 10, reps: 15, is_warmup: true, set_index: 1 },
      ...sets(30, [10, 12, 10]).map((s) => ({ ...s, set_index: s.set_index + 1 })),
    ];
    const p = prescribe(withWarmup, opts());
    expect(p.weightKg).toBe(30);
    expect(p.targets.map((t) => t.reps)).toEqual([11, 12, 11]);
  });

  it("estimates a one rep max with Epley", () => {
    expect(estimateOneRepMax(40, 1)).toBe(40);
    expect(estimateOneRepMax(30, 10)).toBeCloseTo(40, 5);
  });

  it("stretches the ceiling only when a cliff blocks the weight", () => {
    expect(effectiveCeiling([12, 12, 12], { repHigh: 12, repCeilingMax: 20, blockedByBigJump: false })).toBe(12);
    expect(effectiveCeiling([12, 12, 12], { repHigh: 12, repCeilingMax: 20, blockedByBigJump: true })).toBe(15);
  });

  it("describes a session the way it would be said out loud", () => {
    expect(describeSets(sets(25, [10, 10, 10]))).toBe("3 x 10 @ 25kg");
    expect(describeSets(sets(10, [13, 9, 12]), "dumbbell_pair")).toBe("13, 9, 12 @ 10kg each hand");
    expect(describeSets(sets(0, [8, 7, 6]), "banded")).toBe("8, 7, 6");
  });
});

describe("compareSessions", () => {
  it("calls more reps at the same weight an improvement", () => {
    const c = compareSessions(sets(30, [11, 12, 11]), sets(30, [10, 12, 10]));
    expect(c.verdict).toBe("up");
    expect(c.reason).toContain("more");
  });

  it("calls a heavier working weight an improvement even as reps fall", () => {
    const c = compareSessions(sets(23, [8, 8, 8]), sets(18, [13, 13, 12]));
    expect(c.verdict).toBe("up");
  });

  it("compares bodyweight sets on reps alone", () => {
    expect(compareSessions(sets(0, [9, 8, 7]), sets(0, [8, 7, 6])).verdict).toBe("up");
    expect(compareSessions(sets(0, [8, 7, 6]), sets(0, [8, 7, 6])).verdict).toBe("same");
    expect(compareSessions(sets(0, [7, 6, 5]), sets(0, [8, 7, 6])).verdict).toBe("down");
  });

  it("flags a real regression", () => {
    const c = compareSessions(sets(20, [8, 8, 8]), sets(30, [10, 12, 10]));
    expect(c.verdict).toBe("down");
  });

  it("scores a whole session", () => {
    const score = overloadScore([
      compareSessions(sets(30, [11, 12, 11]), sets(30, [10, 12, 10])),
      compareSessions(sets(25, [10, 10, 10]), sets(25, [10, 10, 10])),
      compareSessions(sets(20, [8, 8, 8]), sets(30, [10, 12, 10])),
      compareSessions(sets(15, [12, 12, 12]), []),
    ]);
    expect(score).toMatchObject({ up: 1, same: 1, down: 1, first: 1, scored: 3, pct: 33 });
  });
});

describe("estimateSessionKcal", () => {
  it("uses the MET equation", () => {
    // 5 METs, 60kg, 45 minutes.
    expect(estimateSessionKcal(45, 60)).toBe(236);
  });

  it("returns zero for a session with no duration", () => {
    expect(estimateSessionKcal(0, 60)).toBe(0);
  });
});
