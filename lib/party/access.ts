import "server-only";

import { canEditPartyRole, canManagePartyRole } from "@/lib/party/roles";
import { createClient } from "@/lib/supabase/server";

export { canEditPartyRole, canManagePartyRole, formatPartyRole, type CollaboratorRole } from "@/lib/party/roles";

export async function getPartyMembershipRole(partyId: string, userId?: string | null) {
  const supabase = await createClient();
  let uid = userId ?? null;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data.user?.id ?? null;
  }
  if (!uid) return null;
  const { data } = await supabase
    .from("party_members")
    .select("role")
    .eq("party_id", partyId)
    .eq("user_id", uid)
    .maybeSingle();
  return data?.role ?? null;
}

export async function requirePartyEditor(partyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, user: null, role: null as string | null };
  const role = await getPartyMembershipRole(partyId, user.id);
  if (!canEditPartyRole(role)) {
    return { error: "You can view this party but cannot make changes.", supabase, user, role };
  }
  return { error: null as string | null, supabase, user, role };
}

export async function requirePartyManager(partyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, user: null, role: null as string | null };
  const role = await getPartyMembershipRole(partyId, user.id);
  if (!canManagePartyRole(role)) {
    return { error: "Only the owner or a co-owner can manage collaborators.", supabase, user, role };
  }
  return { error: null as string | null, supabase, user, role };
}
