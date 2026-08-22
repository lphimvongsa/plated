import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  const measuredFetch: typeof fetch = async (input, init) => {
    if (process.env.SUPABASE_PERF_LOGGING !== "1") return fetch(input, init);
    const startedAt = performance.now();
    const response = await fetch(input, init);
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    console.info("[supabase]", {
      method: init?.method ?? "GET",
      path: url.pathname,
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return response;
  };

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: measuredFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can be called from a Server Component where cookies are read-only.
            // Middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
