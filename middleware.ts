import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only routes that require authentication or auth-route redirects pay for
  // Supabase's remote user validation/session refresh.
  matcher: ["/app/:path*", "/onboarding/:path*", "/auth/:path*"],
};
