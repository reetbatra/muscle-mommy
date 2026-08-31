import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Where the magic link lands. Trades the code for a session, then moves on. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/today";
  // Never redirect somewhere off-site on the strength of a query parameter.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/today";

  // Supabase reports its own failures here before any code is issued.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, url.origin),
    );
  }

  // No code is the normal case now: the session comes back in the URL fragment,
  // which a server can never see. Bounce to the login page with the fragment
  // intact and let the browser finish the job. No error, because nothing is
  // wrong.
  if (!code) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(safeNext)}`, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.onboarded_at) {
      return NextResponse.redirect(new URL("/onboarding", url.origin));
    }
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
