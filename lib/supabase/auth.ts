import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Verify the signed access token and return its subject without a round-trip to
 * the Supabase Auth user endpoint on every Server Component navigation.
 *
 * `getClaims()` verifies the JWT signature (and caches the project's JWKS),
 * while `getUser()` always calls the Auth server. Middleware still protects the
 * route; this helper avoids repeating that remote auth request inside pages.
 */
export const getAuthenticatedUserId = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return String(data.claims.sub);
});
