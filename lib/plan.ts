import "server-only";
import { getLastSetsByExercise, getRoutine, type RoutineDayFull, type RoutineExerciseFull } from "@/lib/data";
import { prescribe, type LoadConfig, type LoggedSet, type Prescription } from "@/lib/domain/overload";

export type PlannedExercise = {
  routineExercise: RoutineExerciseFull;
  name: string;
  prescription: Prescription;
  lastSets: LoggedSet[];
};

export type DayPlan = {
  day: RoutineDayFull;
  items: PlannedExercise[];
};

/**
 * Turns a day of the split into a list of concrete targets by feeding each
 * exercise's last finished session into the progression engine.
 */
export async function getDayPlan(
  dayId: string,
  loadConfig: LoadConfig,
  options: { excludeSessionId?: string } = {},
): Promise<DayPlan | null> {
  const routine = await getRoutine();
  const day = routine.find((d) => d.id === dayId);
  if (!day) return null;

  const exerciseIds = day.routine_exercises.map((re) => re.exercise_id);
  const history = await getLastSetsByExercise(exerciseIds, options);

  return {
    day,
    items: day.routine_exercises.map((routineExercise) => {
      const lastSets = history[routineExercise.exercise_id] ?? [];
      return {
        routineExercise,
        name: routineExercise.display_name ?? routineExercise.exercise.name,
        lastSets,
        prescription: prescribe(lastSets, {
          targetSets: routineExercise.target_sets,
          repLow: routineExercise.rep_low,
          repHigh: routineExercise.rep_high,
          repCeilingMax: routineExercise.rep_ceiling_max,
          loadType: routineExercise.load_type,
          incrementKg: routineExercise.increment_kg,
          toFailure: routineExercise.to_failure,
          config: loadConfig,
        }),
      };
    }),
  };
}
