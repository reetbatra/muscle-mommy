import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLastSetsByExercise, getSessionContext } from "@/lib/data";
import { getDayPlan } from "@/lib/plan";
import { requireUser } from "@/lib/supabase/server";
import { compareSessions, overloadScore, type LoggedSet } from "@/lib/domain/overload";
import { prettyDate } from "@/lib/domain/dates";
import { Screen } from "@/components/screen";
import { SessionLogger, type ExerciseBlock } from "@/components/lift/session-logger";
import { SessionSummary, type SummaryItem } from "@/components/lift/session-summary";

export const metadata: Metadata = { title: "Session" };
export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const ctx = await getSessionContext();
  const { supabase, user } = await requireUser();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();

  const { data: setRows } = await supabase
    .from("workout_sets")
    .select("exercise_id, set_index, weight_kg, reps, is_warmup")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("set_index");

  const byExercise = new Map<string, LoggedSet[]>();
  for (const row of setRows ?? []) {
    const list = byExercise.get(row.exercise_id) ?? [];
    list.push({
      weight_kg: Number(row.weight_kg),
      reps: row.reps,
      is_warmup: row.is_warmup,
      set_index: row.set_index,
    });
    byExercise.set(row.exercise_id, list);
  }

  const plan = session.routine_day_id
    ? await getDayPlan(session.routine_day_id, ctx.loadConfig, { excludeSessionId: sessionId })
    : null;

  // ---- Finished: show what actually happened, not what was planned. -------
  if (session.finished_at) {
    const exerciseIds = [...byExercise.keys()];
    const [previous, { data: exercises }] = await Promise.all([
      getLastSetsByExercise(exerciseIds, { excludeSessionId: sessionId }),
      supabase.from("exercises").select("id, name").in("id", exerciseIds.length ? exerciseIds : [""]),
    ]);

    const nameById = new Map((exercises ?? []).map((e) => [e.id, e.name]));
    const orderedIds = plan
      ? plan.items.map((i) => i.routineExercise.exercise_id).filter((id) => byExercise.has(id))
      : exerciseIds;
    const remaining = exerciseIds.filter((id) => !orderedIds.includes(id));

    const items: SummaryItem[] = [...orderedIds, ...remaining].map((exerciseId) => {
      const planned = plan?.items.find((i) => i.routineExercise.exercise_id === exerciseId);
      const sets = byExercise.get(exerciseId) ?? [];
      return {
        id: exerciseId,
        name: planned?.name ?? nameById.get(exerciseId) ?? "Exercise",
        loadType: planned?.routineExercise.load_type ?? "machine",
        sets,
        comparison: compareSessions(sets, previous[exerciseId] ?? []),
      };
    });

    const minutes = Math.max(
      0,
      Math.round((Date.parse(session.finished_at) - Date.parse(session.started_at)) / 60_000),
    );

    return (
      <Screen>
        <SessionSummary
          title={session.title}
          dateLabel={prettyDate(session.session_date, ctx.today)}
          minutes={minutes || null}
          estimatedKcal={session.estimated_kcal ?? null}
          score={overloadScore(items.map((i) => i.comparison))}
          items={items}
          notes={session.notes}
        />
      </Screen>
    );
  }

  // ---- In progress: hand the plan to the logger. -------------------------
  if (!plan) notFound();

  const blocks: ExerciseBlock[] = plan.items.map((item) => ({
    routineExerciseId: item.routineExercise.id,
    exerciseId: item.routineExercise.exercise_id,
    name: item.name,
    notes: item.routineExercise.notes,
    restSeconds: item.routineExercise.rest_seconds,
    loadType: item.routineExercise.load_type,
    prescription: item.prescription,
    loggedSets: (byExercise.get(item.routineExercise.exercise_id) ?? []).map((s) => ({
      set_index: s.set_index,
      weight_kg: s.weight_kg,
      reps: s.reps,
    })),
  }));

  return (
    <Screen className="pt-0">
      <SessionLogger sessionId={sessionId} title={session.title} blocks={blocks} />
    </Screen>
  );
}
