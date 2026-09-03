import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/site";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Verify the JWT locally (JWKS is cached) instead of making an Auth-server
  // round-trip for every page navigation and every Next.js prefetch request.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ? String(claimsData.claims.sub) : null;

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/app") || path.startsWith("/onboarding");
  const isAuthRoute = path.startsWith("/auth");

  if (!userId && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    const requested = `${path}${request.nextUrl.search}`;
    url.search = "";
    url.searchParams.set("next", requested);
    return NextResponse.redirect(url);
  }

  const isOAuthHandshake = path === "/auth/callback" || path === "/auth/google";
  const isPasswordReset = path === "/auth/reset";
  if (userId && isAuthRoute && !isOAuthHandshake && !isPasswordReset) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    const url = request.nextUrl.clone();
    url.search = "";
    if (next.startsWith("/collaborate/")) {
      url.pathname = next;
      return NextResponse.redirect(url);
    }
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
