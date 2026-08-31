"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { estimateSessionKcal } from "@/lib/domain/overload";

/**
 * Starts today's session, or hands back the one already open. Opening the same
 * day twice from two devices must not create two sessions.
 */
export async function startSession(routineDayId: string, dateISO: string) {
  const id = z.uuid().parse(routineDayId);
  const date = z.iso.date().parse(dateISO);
  const { supabase, user } = await requireUser();

  const { data: open } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) redirect(`/lift/session/${open.id}`);

  const { data: day, error: dayError } = await supabase
    .from("routine_days")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (dayError) throw new Error(`That day is not in your split: ${dayError.message}`);

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id, routine_day_id: day.id, title: day.name, session_date: date })
    .select("id")
    .single();
  if (error) throw new Error(`Could not start the session: ${error.message}`);

  revalidatePath("/lift");
  redirect(`/lift/session/${session.id}`);
}

const setSchema = z.object({
  sessionId: z.uuid(),
  exerciseId: z.uuid(),
  setIndex: z.number().int().min(1).max(30),
  weightKg: z.number().min(0).max(700),
  reps: z.number().int().min(0).max(200),
  isWarmup: z.boolean().default(false),
  rpe: z.number().min(1).max(10).nullable().default(null),
});

export async function saveSet(input: z.infer<typeof setSchema>) {
  const values = setSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("workout_sets").upsert(
    {
      user_id: user.id,
      session_id: values.sessionId,
      exercise_id: values.exerciseId,
      set_index: values.setIndex,
      weight_kg: values.weightKg,
      reps: values.reps,
      is_warmup: values.isWarmup,
      rpe: values.rpe,
    },
    { onConflict: "session_id,exercise_id,set_index" },
  );
  if (error) throw new Error(`Could not log that set: ${error.message}`);

  revalidatePath(`/lift/session/${values.sessionId}`);
}

export async function deleteSet(sessionId: string, exerciseId: string, setIndex: number) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("user_id", user.id)
    .eq("session_id", z.uuid().parse(sessionId))
    .eq("exercise_id", z.uuid().parse(exerciseId))
    .eq("set_index", z.number().int().parse(setIndex));
  if (error) throw new Error(`Could not remove that set: ${error.message}`);
  revalidatePath(`/lift/session/${sessionId}`);
}

const finishSchema = z.object({
  sessionId: z.uuid(),
  feel: z.number().int().min(1).max(5).nullable().default(null),
  notes: z.string().trim().max(500).nullable().default(null),
});

export async function finishSession(input: z.infer<typeof finishSchema>) {
  const { sessionId, feel, notes } = finishSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: session, error: loadError } = await supabase
    .from("workout_sessions")
    .select("id, started_at, session_date")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (loadError) throw new Error(`Could not find that session: ${loadError.message}`);

  // Body weight for the energy estimate: today's Health reading, else the most
  // recent InBody, else nothing and the estimate is skipped.
  const [{ data: healthToday }, { data: latestComp }] = await Promise.all([
    supabase
      .from("health_days")
      .select("weight_kg")
      .eq("user_id", user.id)
      .eq("log_date", session.session_date)
      .maybeSingle(),
    supabase
      .from("body_comps")
      .select("weight_kg")
      .eq("user_id", user.id)
      .order("measured_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const bodyWeight = Number(healthToday?.weight_kg ?? latestComp?.weight_kg ?? 0);
  const minutes = Math.round((Date.now() - Date.parse(session.started_at)) / 60_000);
  const cappedMinutes = Math.min(Math.max(minutes, 0), 240);
  const estimated = bodyWeight > 0 ? estimateSessionKcal(cappedMinutes, bodyWeight) : null;

  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString(), feel, notes, estimated_kcal: estimated })
    .eq("id", sessionId)
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not finish the session: ${error.message}`);

  revalidatePath("/lift");
  revalidatePath("/today");
  revalidatePath("/progress");
  return { estimatedKcal: estimated, minutes: cappedMinutes };
}

export async function discardSession(sessionId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", z.uuid().parse(sessionId))
    .eq("user_id", user.id)
    .is("finished_at", null);
  if (error) throw new Error(`Could not discard the session: ${error.message}`);
  revalidatePath("/lift");
  redirect("/lift");
}
