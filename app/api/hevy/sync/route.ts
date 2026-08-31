import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncHevyForUser } from "@/lib/hevy/import";
import { HevyError } from "@/lib/hevy/client";

export const maxDuration = 120;

/** Signed-in user asks for their own sync. This is the app-open path. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("hevy_connections")
    .select("auto_sync, last_synced_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) return NextResponse.json({ skipped: "not_connected" });
  if (!connection.auto_sync) return NextResponse.json({ skipped: "auto_sync_off" });

  // Opening four screens in a minute should not mean four round trips to Hevy.
  if (connection.last_synced_at) {
    const age = Date.now() - Date.parse(connection.last_synced_at);
    if (age < 5 * 60_000) {
      return NextResponse.json({ skipped: "synced_recently", changed: 0 });
    }
  }

  try {
    const result = await syncHevyForUser(admin, user.id);
    return NextResponse.json({ ...result, changed: result.imported + result.updated + result.deleted });
  } catch (error) {
    const message = error instanceof HevyError ? error.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * The nightly backstop, so a workout logged on a day the app is never opened
 * still arrives. Vercel Cron sends CRON_SECRET as a bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: connections, error } = await admin
    .from("hevy_connections")
    .select("user_id")
    .eq("auto_sync", true);

  if (error) {
    return NextResponse.json({ error: `Could not list connections: ${error.message}` }, { status: 500 });
  }

  const results: { userId: string; ok: boolean; detail: string }[] = [];

  for (const connection of connections ?? []) {
    try {
      const result = await syncHevyForUser(admin, connection.user_id);
      results.push({
        userId: connection.user_id,
        ok: true,
        detail: `${result.imported} new, ${result.updated} updated, ${result.deleted} removed`,
      });
    } catch (syncError) {
      // One broken key must not stop everyone else's sync.
      results.push({
        userId: connection.user_id,
        ok: false,
        detail: syncError instanceof Error ? syncError.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
