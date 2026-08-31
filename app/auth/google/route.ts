import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function loginErrorRedirect(origin: string, message: string) {
  const login = new URL("/auth/login", origin);
  login.searchParams.set("error", message);
  return NextResponse.redirect(login);
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return loginErrorRedirect(origin, error?.message ?? "Unable to start Google sign-in.");
  }

  try {
    const authorize = await fetch(data.url, { redirect: "manual" });
    if (authorize.status >= 400) {
      const body = (await authorize.json().catch(() => null)) as {
        error?: string;
        error_description?: string;
        msg?: string;
        message?: string;
      } | null;
      const detail = body?.error_description ?? body?.msg ?? body?.message ?? body?.error ?? "";
      if (detail.toLowerCase().includes("not enabled")) {
        return loginErrorRedirect(origin, "google-disabled");
      }
      return loginErrorRedirect(origin, detail || "Unable to start Google sign-in.");
    }

    const location = authorize.headers.get("location");
    if (location) {
      return NextResponse.redirect(location);
    }
  } catch {
    // If the probe fails, send the browser to the authorize URL anyway.
  }

  return NextResponse.redirect(data.url);
}
