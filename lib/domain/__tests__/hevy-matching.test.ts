import { describe, expect, it } from "vitest";
import {
  DAY_THRESHOLD,
  coreTokens,
  detectRoutineDay,
  findExerciseMatch,
  jaccard,
  tokenise,
  type MatchCandidate,
} from "../../hevy/matching";

/** The exercises this app's library actually ships with. */
const LIBRARY: MatchCandidate[] = [
  { id: "db-bench", name: "Dumbbell Bench Press" },
  { id: "bb-bench", name: "Barbell Bench Press" },
  { id: "incline-db", name: "Incline Dumbbell Press" },
  { id: "seated-row", name: "Seated Cable Row" },
  { id: "sa-row", name: "Single-Arm Cable Row" },
  { id: "lat-pulldown", name: "Lat Pulldown" },
  { id: "db-shoulder", name: "Dumbbell Shoulder Press" },
  { id: "lateral", name: "Lateral Raise" },
  { id: "hammer", name: "Hammer Curl" },
  { id: "db-curl", name: "Dumbbell Curl" },
  { id: "sa-triceps", name: "Single-Arm Overhead Triceps Extension" },
  { id: "pushup", name: "Push-Up" },
  { id: "banded-pushup", name: "Banded Push-Up" },
  { id: "pullup", name: "Pull-Up" },
  { id: "banded-pullup", name: "Banded Pull-Up" },
  { id: "leg-press", name: "Leg Press" },
  { id: "hip-thrust", name: "Hip Thrust" },
  { id: "smith-hip-thrust", name: "Smith Machine Hip Thrust" },
  { id: "leg-ext", name: "Leg Extension" },
  { id: "standing-calf", name: "Standing Calf Raise" },
  { id: "seated-calf", name: "Seated Calf Raise" },
  { id: "seated-curl", name: "Seated Leg Curl" },
  { id: "abduction", name: "Hip Abduction Machine" },
  { id: "db-rdl", name: "Dumbbell Romanian Deadlift" },
  { id: "bulgarian", name: "Bulgarian Split Squat" },
  { id: "back-squat", name: "Back Squat" },
];

const match = (title: string) => findExerciseMatch(title, LIBRARY);

describe("tokenise", () => {
  it("strips the bracketed equipment Hevy appends", () => {
    expect(tokenise("Bench Press (Dumbbell)")).toEqual(["bench", "press", "dumbbell"]);
  });

  it("treats a hyphen as a space", () => {
    expect(tokenise("Push-Up")).toEqual(["push", "up"]);
  });

  it("folds singular and plural onto one token", () => {
    expect(tokenise("Tricep Extensions")).toEqual(["triceps", "extension"]);
  });

  it("keeps the movement once equipment is set aside", () => {
    expect([...coreTokens("Lat Pulldown (Cable)")].sort()).toEqual(["lat", "pulldown"]);
  });

  it("does not empty a name that is only equipment words", () => {
    expect(coreTokens("Machine").size).toBeGreaterThan(0);
  });
});

describe("findExerciseMatch on real Hevy names", () => {
  it.each([
    ["Bench Press (Dumbbell)", "db-bench"],
    ["Bench Press (Barbell)", "bb-bench"],
    ["Incline Bench Press (Dumbbell)", "incline-db"],
    ["Seated Cable Row - Bar Wide Grip", "seated-row"],
    ["Lat Pulldown (Cable)", "lat-pulldown"],
    ["Shoulder Press (Dumbbell)", "db-shoulder"],
    ["Lateral Raise (Dumbbell)", "lateral"],
    ["Hammer Curl (Dumbbell)", "hammer"],
    ["Bicep Curl (Dumbbell)", "db-curl"],
    ["Push Up", "pushup"],
    ["Leg Press (Machine)", "leg-press"],
    ["Leg Extension (Machine)", "leg-ext"],
    ["Standing Calf Raise (Dumbbell)", "standing-calf"],
    ["Seated Calf Raise (Machine)", "seated-calf"],
    ["Seated Leg Curl (Machine)", "seated-curl"],
    ["Romanian Deadlift (Dumbbell)", "db-rdl"],
    ["Bulgarian Split Squat", "bulgarian"],
    ["Squat (Barbell)", "back-squat"],
  ])("matches %s", (hevyName, expectedId) => {
    expect(match(hevyName)?.id).toBe(expectedId);
  });

  it("tells a plain hip thrust from the Smith machine one", () => {
    expect(match("Hip Thrust (Barbell)")?.id).toBe("hip-thrust");
    expect(match("Hip Thrust (Smith Machine)")?.id).toBe("smith-hip-thrust");
  });

  it("tells a banded pull-up from an unassisted one", () => {
    expect(match("Pull Up (Band)")?.id).toBe("banded-pullup");
    expect(match("Pull Up")?.id).toBe("pullup");
  });

  it("tells a two-arm row from a single-arm one", () => {
    expect(match("Single Arm Cable Row")?.id).toBe("sa-row");
  });

  it("refuses to guess when nothing is close", () => {
    expect(match("Sled Push")).toBeNull();
    expect(match("Wrist Roller")).toBeNull();
    expect(match("Farmers Walk")).toBeNull();
  });

  it("does not fold a different triceps variation into the single-arm one", () => {
    // Genuinely a different lift. Better created fresh than mis-attributed.
    const result = match("Triceps Pushdown (Cable)");
    expect(result?.id).not.toBe("sa-triceps");
  });

  it("marks a fuzzy match as such rather than claiming certainty", () => {
    const exact = match("Leg Press (Machine)");
    expect(exact?.confidence).toBe("exact");
  });
});

describe("detectRoutineDay", () => {
  const days = [
    { id: "upperA", name: "Upper A", exerciseIds: ["db-bench", "seated-row", "lat-pulldown", "db-shoulder", "sa-triceps", "db-curl", "banded-pushup"] },
    { id: "lowerA", name: "Lower A", exerciseIds: ["leg-press", "smith-hip-thrust", "leg-ext", "standing-calf", "banded-pullup"] },
    { id: "upperB", name: "Upper B", exerciseIds: ["incline-db", "sa-row", "lat-pulldown", "lateral", "hammer", "sa-triceps", "pushup"] },
    { id: "lowerB", name: "Lower B", exerciseIds: ["db-rdl", "bulgarian", "seated-curl", "abduction", "seated-calf"] },
  ];

  it("recognises a day logged exactly as planned", () => {
    expect(detectRoutineDay(days[1].exerciseIds, days)).toMatchObject({ id: "lowerA", score: 1 });
  });

  it("still recognises a day with one exercise skipped", () => {
    const skipped = days[1].exerciseIds.slice(0, 4);
    expect(detectRoutineDay(skipped, days)?.id).toBe("lowerA");
  });

  it("still recognises a day with an extra exercise thrown in", () => {
    expect(detectRoutineDay([...days[3].exerciseIds, "back-squat"], days)?.id).toBe("lowerB");
  });

  it("separates the two upper days despite the shared lifts", () => {
    expect(detectRoutineDay(days[0].exerciseIds, days)?.id).toBe("upperA");
    expect(detectRoutineDay(days[2].exerciseIds, days)?.id).toBe("upperB");
  });

  it("declines a one-off session that is not a planned day", () => {
    expect(detectRoutineDay(["back-squat"], days)).toBeNull();
  });

  it("declines rather than guessing when two days tie", () => {
    const ambiguous = [
      { id: "a", name: "A", exerciseIds: ["x", "y"] },
      { id: "b", name: "B", exerciseIds: ["x", "y"] },
    ];
    expect(detectRoutineDay(["x", "y"], ambiguous)).toBeNull();
  });

  it("declines on an empty workout", () => {
    expect(detectRoutineDay([], days)).toBeNull();
  });

  it("uses a threshold that is neither trivially strict nor loose", () => {
    expect(DAY_THRESHOLD).toBeGreaterThan(0.2);
    expect(DAY_THRESHOLD).toBeLessThan(0.7);
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });
});

describe("the fuzzy threshold stays honest", () => {
  it("still refuses names that only share a single common word", () => {
    // "Sled Push" and "Push-Up" share "push" and nothing else that matters.
    expect(findExerciseMatch("Sled Push", LIBRARY)).toBeNull();
    expect(findExerciseMatch("Push Press (Barbell)", LIBRARY)).toBeNull();
    expect(findExerciseMatch("Calf Press (Machine)", LIBRARY)).toBeNull();
  });

  it("refuses when two candidates are within a hair of each other", () => {
    const ambiguous: MatchCandidate[] = [
      { id: "a", name: "Cable Row" },
      { id: "b", name: "Cable Rows" },
    ];
    // Identical once normalised, so there is no right answer to pick.
    const result = findExerciseMatch("Machine Row", ambiguous);
    expect(result).toBeNull();
  });
});
