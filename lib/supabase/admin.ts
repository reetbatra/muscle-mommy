import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. Only for the Apple Shortcut ingest route, which
 * authenticates with its own bearer token instead of a Supabase session and
 * therefore has to bypass row level security deliberately.
 */
export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. The health ingest endpoint needs it.");
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
