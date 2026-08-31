"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Some sign-in links come back with the session in the URL fragment rather
 * than as a code in the query string. A fragment never reaches the server, so
 * /auth/callback cannot see it and would otherwise send the user back here
 * with "missing_code" while holding a perfectly good session.
 *
 * This picks the fragment up on the client, sets the session, and moves on.
 */
export function SessionFromHash() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const hashError = params.get("error_description") ?? params.get("error");

    if (hashError) {
      setState("failed");
      setMessage(hashError.replace(/\+/g, " "));
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    if (!accessToken || !refreshToken) return;

    setState("working");
    const supabase = createClient();

    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        // Clear the tokens out of the address bar either way.
        window.history.replaceState(null, "", window.location.pathname);
        if (error) {
          setState("failed");
          setMessage(error.message);
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setState("failed");
          setMessage("That link has already been used. Ask for a new one.");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded_at")
          .eq("id", user.id)
          .maybeSingle();

        const next = searchParams.get("next");
        const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
        router.replace(profile?.onboarded_at ? safeNext : "/onboarding");
        router.refresh();
      });
  }, [router, searchParams]);

  if (state === "idle") return null;

  if (state === "working") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-4 flex items-center gap-2.5 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm font-semibold text-ink"
      >
        <Loader2 className="size-4 animate-spin text-[var(--pink-deep)]" aria-hidden />
        Signing you in
      </div>
    );
  }

  return (
    <p
      role="alert"
      className="mb-4 rounded-2xl border border-[var(--coral)] bg-surface-2 px-4 py-3 text-sm font-medium text-ink"
    >
      {message ?? "That link did not work. Ask for a new one below."}
    </p>
  );
}
