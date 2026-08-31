"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Implicit flow, deliberately, not PKCE.
 *
 * PKCE stores a code verifier in the browser that requested the sign-in link,
 * and the exchange only works in that same browser. Real life does not do
 * that: you ask for the link on a laptop and open it on a phone, or you tap it
 * out of Gmail and iOS hands it to a different context. The verifier is gone
 * and the sign-in dies with "PKCE code verifier not found in storage".
 *
 * Implicit flow returns the session in the URL fragment instead, so the link
 * works from anywhere. A fragment is never sent to a server, and SessionFromHash
 * strips it out of the address bar the moment the session is set.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { flowType: "implicit" },
  });
}
