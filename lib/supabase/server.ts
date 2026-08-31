import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Throws instead of returning null, so pages never render half-signed-in.
 *
 * Wrapped in React's per-request cache because a single page calls this from
 * three or four different loaders, and getUser() is a network round trip to
 * Supabase every time. Without the cache, rendering Today cost four auth calls
 * to Mumbai before a single row of real data was fetched.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("NOT_AUTHENTICATED");
  return { supabase, user };
});
