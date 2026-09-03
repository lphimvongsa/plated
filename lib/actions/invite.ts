"use server";

import type { InvitePayload } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export async function loadInvite(token: string): Promise<InvitePayload> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });
  if (error || !data) return { status: "revoked" };
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

  if (error || !data) return { status: "revoked", ok: false, error: error?.message ?? "failed" };

  const payload = data as InvitePayload;
  if (payload.ok && payload.party?.id) {
    await (supabase as any).rpc("queue_rsvp_notification", { p_party_id: payload.party.id, p_guest_name: input.name }).catch(() => null);
  }
  return payload;
}
