import type { LoadType } from "./overload";

/**
 * Starter programs offered during onboarding.
 *
 * `startingWeightKg` and `startingReps` are suggestions, not gospel. They get
 * pre-filled on the baseline screen so the overload engine has history from
 * day one instead of spending a full week saying "first time logged", and the
 * user overwrites anything that is not theirs.
 */

export type TemplateExercise = {
  /** Must match a name in the shared exercise library exactly. */
  exercise: string;
  /** Overrides the library name in the UI when the user calls it something else. */
  displayAs?: string;
  sets: number;
  repLow: number;
  repHigh: number;
  loadType: LoadType;
  restSeconds?: number;
  incrementKg?: number;
  repCeilingMax?: number;
  notes?: string;
  startingWeightKg?: number;
  startingReps?: number[];
};

export type TemplateDay = {
  name: string;
  subtitle: string;
  accent: "pink" | "lilac" | "cyan" | "mint";
  restAfter?: boolean;
  exercises: TemplateExercise[];
};

export type ProgramTemplate = {
  id: string;
  name: string;
  blurb: string;
  cadence: string;
  days: TemplateDay[];
};

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "upper-lower-4",
    name: "Upper / Lower, four days",
    blurb:
      "Two upper days, two lower days, a rest day in the middle. Every muscle gets hit twice a week, which is the easiest structure to overload on.",
    cadence: "Upper A, Lower A, rest, Upper B, Lower B",
    days: [
      {
        name: "Upper A",
        subtitle: "Push and pull, heavier",
        accent: "pink",
        exercises: [
          {
            exercise: "Dumbbell Bench Press",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "dumbbell_pair",
            restSeconds: 90,
          },
          {
            exercise: "Seated Cable Row",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 90,
          },
          {
            exercise: "Lat Pulldown",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 90,
            startingWeightKg: 25,
            startingReps: [10, 10, 10],
          },
          {
            exercise: "Dumbbell Shoulder Press",
            displayAs: "Shoulder Press",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "dumbbell_pair",
            restSeconds: 90,
          },
          {
            exercise: "Single-Arm Overhead Triceps Extension",
            displayAs: "Single-Arm Tricep Extension",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "dumbbell_single",
            restSeconds: 60,
            startingWeightKg: 2.5,
            startingReps: [11, 12, 7],
            notes: "Next dumbbell up is a big jump, so reps climb first.",
          },
          {
            exercise: "Dumbbell Curl",
            displayAs: "Bicep Curl",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "dumbbell_single",
            restSeconds: 60,
            startingWeightKg: 5,
            startingReps: [8, 8, 8],
            notes: "One arm at a time.",
          },
          {
            exercise: "Banded Push-Up",
            sets: 3,
            repLow: 5,
            repHigh: 12,
            loadType: "banded",
            restSeconds: 60,
            startingReps: [5, 6],
          },
        ],
      },
      {
        name: "Lower A",
        subtitle: "Quads and glutes",
        accent: "lilac",
        restAfter: true,
        exercises: [
          {
            exercise: "Leg Press",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 120,
            startingWeightKg: 30,
            startingReps: [10, 12, 10],
            notes: "Hands off the knees. The weight came down on purpose.",
          },
          {
            exercise: "Smith Machine Hip Thrust",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 120,
            startingWeightKg: 45,
            startingReps: [15, 16, 14],
          },
          {
            exercise: "Leg Extension",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 90,
            startingWeightKg: 23,
            startingReps: [8, 10, 8],
          },
          {
            exercise: "Standing Calf Raise",
            sets: 3,
            repLow: 10,
            repHigh: 15,
            loadType: "dumbbell_pair",
            restSeconds: 60,
            startingWeightKg: 10,
            startingReps: [13, 9, 12],
            notes: "Weight is per hand.",
          },
          {
            exercise: "Banded Pull-Up",
            sets: 3,
            repLow: 5,
            repHigh: 12,
            loadType: "banded",
            restSeconds: 90,
            startingReps: [8, 7, 6],
            notes: "Medium universal band. Numbers from the thicker band do not carry over.",
          },
        ],
      },
      {
        name: "Upper B",
        subtitle: "Incline and lateral work",
        accent: "cyan",
        exercises: [
          {
            exercise: "Incline Dumbbell Press",
            displayAs: "Incline Bench Press",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "dumbbell_pair",
            restSeconds: 90,
            startingWeightKg: 15,
            startingReps: [12, 12, 10],
          },
          {
            exercise: "Single-Arm Cable Row",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 90,
            startingWeightKg: 18,
            startingReps: [13, 13, 12],
          },
          {
            exercise: "Lat Pulldown",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 90,
            startingWeightKg: 25,
            startingReps: [10, 10, 10],
          },
          {
            exercise: "Lateral Raise",
            sets: 3,
            repLow: 10,
            repHigh: 15,
            loadType: "dumbbell_pair",
            restSeconds: 60,
            startingWeightKg: 5,
            startingReps: [12, 13, 13],
            notes: "Check this one. Last session was logged as 5kg per hand.",
          },
          {
            exercise: "Hammer Curl",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "dumbbell_single",
            restSeconds: 60,
            startingWeightKg: 10,
            startingReps: [10, 10, 7],
          },
          {
            exercise: "Single-Arm Overhead Triceps Extension",
            displayAs: "Single-Arm Tricep Extension",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "dumbbell_single",
            restSeconds: 60,
            startingWeightKg: 2.5,
            startingReps: [15, 14, 12],
          },
          {
            exercise: "Push-Up",
            sets: 3,
            repLow: 5,
            repHigh: 15,
            loadType: "bodyweight",
            restSeconds: 60,
            startingReps: [5, 9, 8],
          },
        ],
      },
      {
        name: "Lower B",
        subtitle: "Squat led",
        accent: "mint",
        exercises: [
          {
            exercise: "Smith Machine Squat",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 120,
            startingWeightKg: 20,
            startingReps: [10, 10, 12],
          },
          {
            exercise: "Smith Machine Hip Thrust",
            displayAs: "Hip Thrust",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 120,
            // Same 45kg as Lower A. No reps seeded here on purpose: the 15s
            // were done at 40kg and say nothing about 45kg, so this day falls
            // back to the Lower A history until it has its own.
            startingWeightKg: 45,
          },
          {
            exercise: "Seated Leg Curl",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 90,
            startingWeightKg: 18,
            startingReps: [10, 8, 10],
          },
          {
            exercise: "Leg Press",
            sets: 3,
            repLow: 8,
            repHigh: 12,
            loadType: "machine",
            restSeconds: 120,
            startingWeightKg: 30,
            notes: "Hands off the knees. The weight came down on purpose.",
          },
          {
            exercise: "Banded Pull-Up",
            sets: 3,
            repLow: 5,
            repHigh: 12,
            loadType: "banded",
            restSeconds: 90,
            startingReps: [8, 7, 6],
            notes: "Medium universal band. The 15s were on a thicker band, so they do not carry over.",
          },
        ],
      },
    ],
  },
  {
    id: "glute-focus-4",
    name: "Glute focus, four days",
    blurb:
      "Lower body twice with the glutes leading, upper split into push and pull. Pick this if the goal is shape more than balanced strength.",
    cadence: "Glutes and quads, back and biceps, rest, hams and glutes, chest and shoulders",
    days: [
      {
        name: "Glutes + Quads",
        subtitle: "Heavy hinge and squat",
        accent: "pink",
        exercises: [
          { exercise: "Hip Thrust", sets: 4, repLow: 8, repHigh: 12, loadType: "barbell", restSeconds: 120 },
          { exercise: "Leg Press", sets: 3, repLow: 8, repHigh: 12, loadType: "machine", restSeconds: 120 },
          { exercise: "Bulgarian Split Squat", sets: 3, repLow: 8, repHigh: 12, loadType: "dumbbell_pair" },
          { exercise: "Leg Extension", sets: 3, repLow: 10, repHigh: 15, loadType: "machine" },
          { exercise: "Hip Abduction Machine", sets: 3, repLow: 12, repHigh: 20, loadType: "machine" },
        ],
      },
      {
        name: "Back + Biceps",
        subtitle: "Vertical and horizontal pull",
        accent: "lilac",
        restAfter: true,
        exercises: [
          { exercise: "Lat Pulldown", sets: 3, repLow: 8, repHigh: 12, loadType: "machine" },
          { exercise: "Seated Cable Row", sets: 3, repLow: 8, repHigh: 12, loadType: "machine" },
          { exercise: "Single-Arm Dumbbell Row", sets: 3, repLow: 8, repHigh: 12, loadType: "dumbbell_single" },
          { exercise: "Face Pull", sets: 3, repLow: 12, repHigh: 20, loadType: "machine" },
          { exercise: "Hammer Curl", sets: 3, repLow: 8, repHigh: 12, loadType: "dumbbell_single" },
        ],
      },
      {
        name: "Hams + Glutes",
        subtitle: "Hinge led",
        accent: "cyan",
        exercises: [
          { exercise: "Romanian Deadlift", sets: 4, repLow: 8, repHigh: 12, loadType: "barbell", restSeconds: 120 },
          { exercise: "Smith Machine Hip Thrust", sets: 3, repLow: 8, repHigh: 12, loadType: "machine" },
          { exercise: "Seated Leg Curl", sets: 3, repLow: 10, repHigh: 15, loadType: "machine" },
          { exercise: "Cable Kickback", sets: 3, repLow: 12, repHigh: 20, loadType: "machine" },
          { exercise: "Standing Calf Raise", sets: 3, repLow: 10, repHigh: 15, loadType: "machine" },
        ],
      },
      {
        name: "Chest + Shoulders",
        subtitle: "Press and raise",
        accent: "mint",
        exercises: [
          { exercise: "Incline Dumbbell Press", sets: 3, repLow: 8, repHigh: 12, loadType: "dumbbell_pair" },
          { exercise: "Machine Chest Press", sets: 3, repLow: 8, repHigh: 12, loadType: "machine" },
          { exercise: "Dumbbell Shoulder Press", sets: 3, repLow: 8, repHigh: 12, loadType: "dumbbell_pair" },
          { exercise: "Lateral Raise", sets: 3, repLow: 10, repHigh: 15, loadType: "dumbbell_pair" },
          { exercise: "Rope Pushdown", sets: 3, repLow: 10, repHigh: 15, loadType: "machine" },
        ],
      },
    ],
  },
  {
    id: "blank",
    name: "Build it myself",
    blurb: "Four empty days you name and fill in. Everything is editable later either way.",
    cadence: "Your call",
    days: [
      { name: "Day 1", subtitle: "", accent: "pink", exercises: [] },
      { name: "Day 2", subtitle: "", accent: "lilac", restAfter: true, exercises: [] },
      { name: "Day 3", subtitle: "", accent: "cyan", exercises: [] },
      { name: "Day 4", subtitle: "", accent: "mint", exercises: [] },
    ],
  },
];

export function templateById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((t) => t.id === id);
}
