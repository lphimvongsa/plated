"use server";

import { cookies } from "next/headers";
import type { InvitePayload } from "@/lib/database.types";
import { shareRsvpCookieName } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function loadInvite(token: string): Promise<InvitePayload> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });
  if (error || !data) {
    return { status: "revoked" };
  }
  return data as InvitePayload;
}

export async function submitRsvp(input: {
  token: string;
  name: string;
  rsvpStatus: "attending" | "maybe" | "not_attending";
  allergies?: string | null;
  plusOneCount?: number;
  notes?: string;
}): Promise<InvitePayload> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rsvp_via_invite_token", {
    p_token: input.token,
    p_name: input.name,
    p_email: "",
    p_rsvp_status: input.rsvpStatus,
    p_allergies: input.allergies || undefined,
    p_plus_one_count: input.plusOneCount ?? 0,
    p_notes: input.notes || undefined,
  });

  if (error || !data) {
    return { status: "revoked", ok: false, error: error?.message ?? "failed" };
  }

  const payload = data as InvitePayload;
  if (payload.personal_token && payload.personal_token !== input.token) {
    const cookieStore = await cookies();
    cookieStore.set(shareRsvpCookieName(input.token), payload.personal_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }

  return payload;
}
