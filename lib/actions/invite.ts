"use server";

import type { InvitePayload } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

function revoked(error?: string): InvitePayload {
  return { status: "revoked", ok: false, error };
}

export async function loadInvite(token: string): Promise<InvitePayload> {
  try {
    const cleaned = String(token ?? "").trim();
    if (!cleaned) return revoked("invalid_token");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: cleaned });
    if (error || !data) return revoked(error?.message ?? "invalid_token");

    const payload = data as InvitePayload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return revoked("invalid_payload");
    }
    return payload;
  } catch (error) {
    console.error("[invite] loadInvite failed", error);
    return revoked(error instanceof Error ? error.message : "load_failed");
  }
}

export async function submitRsvp(input: {
  token: string;
  name: string;
  rsvpStatus: "attending" | "maybe" | "not_attending";
  allergies?: string | null;
  plusOneCount?: number;
  notes?: string;
}): Promise<InvitePayload> {
  try {
    const cleaned = String(input.token ?? "").trim();
    if (!cleaned) return revoked("invalid_token");

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("rsvp_via_invite_token", {
      p_token: cleaned,
      p_name: input.name,
      p_email: "",
      p_rsvp_status: input.rsvpStatus,
      p_allergies: input.allergies || undefined,
      p_plus_one_count: input.plusOneCount ?? 0,
      p_notes: input.notes || undefined,
    });

    if (error || !data) return revoked(error?.message ?? "failed");

    const payload = data as InvitePayload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return revoked("invalid_payload");
    }

    if (payload.ok && payload.party?.id) {
      try {
        await (supabase as any).rpc("queue_rsvp_notification", {
          p_party_id: payload.party.id,
          p_guest_name: input.name,
        });
      } catch {
        // Notifications are best-effort and must never fail an RSVP.
      }
    }
    return payload;
  } catch (error) {
    console.error("[invite] submitRsvp failed", error);
    return revoked(error instanceof Error ? error.message : "rsvp_failed");
  }
}
