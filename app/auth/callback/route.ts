import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (next === "/auth/reset") {
          return NextResponse.redirect(`${origin}${next}`);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", user.id)
          .maybeSingle();

        const destination = profile?.onboarding_complete
          ? next
          : next !== "/app"
            ? `/onboarding?next=${encodeURIComponent(next)}`
            : "/onboarding";
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }

    const login = new URL("/auth/login", origin);
    login.searchParams.set("error", error?.message ?? "auth");
    return NextResponse.redirect(login);
  }

  const login = new URL("/auth/login", origin);
  login.searchParams.set("error", oauthError || "auth");
  return NextResponse.redirect(login);
}
