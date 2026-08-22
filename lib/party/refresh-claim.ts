import "server-only";

import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
export type RefreshKind = "shopping" | "timeline";

export async function claimPartyRefresh(
  supabase: ServerClient,
  partyId: string,
  kind: RefreshKind,
) {
  const { data, error } = await supabase.rpc("claim_party_refresh", {
    p_party_id: partyId,
    p_kind: kind,
  });
  if (error) return { token: null, error: error.message };
  if (!data) return { token: null, error: `The ${kind} refresh is already running.` };
  return { token: data, error: null };
}

export async function finishPartyRefresh(
  supabase: ServerClient,
  partyId: string,
  kind: RefreshKind,
  token: string,
  success: boolean,
) {
  const { error } = await supabase.rpc("finish_party_refresh", {
    p_party_id: partyId,
    p_kind: kind,
    p_token: token,
    p_success: success,
  });
  if (error) console.error("[finishPartyRefresh]", { partyId, kind, error: error.message });
}
