import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/auth",
  // Every API route authenticates itself: the health and Hevy cron endpoints
  // on a bearer token, the rest on a Supabase session. Redirecting them to a
  // sign-in page would hand a cron job an HTML login form.
  "/api",
  // The service worker serves this when the network is gone, and it has to
  // render whether or not there is a session.
  "/offline",
  // Generated icons and the manifest are fetched by the OS, not the browser,
  // and never carry a cookie.
  "/manifest.webmanifest",
  "/apple-icon",
  "/icon",
  // Temporary, unlisted design comparison. Comes out once a direction is picked.
  "/preview",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshes the auth cookie. Must run before any redirect decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, images, and the service worker.
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$).*)",
  ],
};
