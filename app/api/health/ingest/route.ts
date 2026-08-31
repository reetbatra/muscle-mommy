import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { parseHealthNumber } from "@/lib/domain/numbers";

/**
 * The Apple Health bridge.
 *
 * Safari cannot read HealthKit, so an Apple Shortcut automation runs on the
 * phone each morning, pulls the numbers out of Health, and posts them here
 * with a bearer token. This route authenticates on that token alone, which is
 * why it uses the service-role client deliberately rather than a session.
 */

const numberish = z.union([z.number(), z.string()]).transform(parseHealthNumber);

const daySchema = z.object({
  date: z.iso.date(),
  steps: numberish.nullish(),
  active_kcal: numberish.nullish(),
  basal_kcal: numberish.nullish(),
  workout_kcal: numberish.nullish(),
  exercise_minutes: numberish.nullish(),
  resting_hr: numberish.nullish(),
  sleep_minutes: numberish.nullish(),
  weight_kg: numberish.nullish(),
  flow: z.enum(["none", "spotting", "light", "medium", "heavy"]).nullish(),
});

const payloadSchema = z.union([daySchema, z.object({ days: z.array(daySchema).min(1).max(120) })]);

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json(
      { error: "Add an Authorization header of 'Bearer <your token>'." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The body was not valid JSON." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That payload does not match what this endpoint expects.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const supabase = createAdminClient();
  const { data: tokenRow, error: tokenError } = await supabase
    .from("ingest_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", await hashToken(token))
    .maybeSingle();

  if (tokenError) {
    return NextResponse.json({ error: "Could not check that token." }, { status: 500 });
  }
  if (!tokenRow || tokenRow.revoked_at) {
    return NextResponse.json({ error: "That token is not valid." }, { status: 401 });
  }

  const days = "days" in parsed.data ? parsed.data.days : [parsed.data];

  const healthRows = days.map((day) => ({
    user_id: tokenRow.user_id,
    log_date: day.date,
    steps: intOrNull(day.steps),
    active_kcal: intOrNull(day.active_kcal),
    basal_kcal: intOrNull(day.basal_kcal),
    workout_kcal: intOrNull(day.workout_kcal),
    exercise_minutes: intOrNull(day.exercise_minutes),
    resting_hr: intOrNull(day.resting_hr),
    sleep_minutes: intOrNull(day.sleep_minutes),
    weight_kg: day.weight_kg ?? null,
    source: "shortcut",
  }));

  // Only overwrite fields the payload actually carried, so a steps-only push
  // does not wipe yesterday's weight.
  for (const row of healthRows) {
    const { data: existing } = await supabase
      .from("health_days")
      .select("*")
      .eq("user_id", row.user_id)
      .eq("log_date", row.log_date)
      .maybeSingle();

    const merged = { ...(existing ?? {}), ...stripNulls(row) };
    const { error } = await supabase
      .from("health_days")
      .upsert(merged, { onConflict: "user_id,log_date" });
    if (error) {
      return NextResponse.json({ error: `Could not save ${row.log_date}: ${error.message}` }, { status: 500 });
    }
  }

  const cycleRows = days
    .filter((day) => day.flow)
    .map((day) => ({ user_id: tokenRow.user_id, log_date: day.date, flow: day.flow! }));

  if (cycleRows.length > 0) {
    const { error } = await supabase
      .from("cycle_days")
      .upsert(cycleRows, { onConflict: "user_id,log_date" });
    if (error) {
      return NextResponse.json({ error: `Could not save cycle data: ${error.message}` }, { status: 500 });
    }
  }

  await supabase
    .from("ingest_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.json({
    ok: true,
    saved: days.length,
    dates: days.map((d) => d.date),
  });
}

/** A quick way to check the token from a browser or the Shortcuts test run. */
export async function GET(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return NextResponse.json({ ok: false, reason: "No token supplied." }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ingest_tokens")
    .select("id, revoked_at, label")
    .eq("token_hash", await hashToken(token))
    .maybeSingle();

  if (!data || data.revoked_at) {
    return NextResponse.json({ ok: false, reason: "That token is not valid." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, label: data.label });
}

function intOrNull(value: number | null | undefined) {
  return value === null || value === undefined ? null : Math.round(value);
}

function stripNulls<T extends Record<string, unknown>>(row: T): Partial<T> {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null)) as Partial<T>;
}
