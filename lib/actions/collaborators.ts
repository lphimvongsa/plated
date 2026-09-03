"use server";

import { revalidatePath } from "next/cache";
import { requirePartyManager } from "@/lib/party/access";
import { sendEmail } from "@/lib/outbound/email";
import { buildCollaboratorInviteEmail } from "@/lib/outbound/collaborator";
import type { CollaboratorRole } from "@/lib/party/roles";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function newInviteToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function hostIdentity(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { email?: string; user_metadata?: { name?: string; full_name?: string } } | undefined;
  return {
    name: claims?.user_metadata?.name || claims?.user_metadata?.full_name || claims?.email || null,
    email: claims?.email ?? null,
  };
}

function revalidateCollaborators(partyId: string) {
  revalidatePath(`/app/parties/${partyId}`, "layout");
  revalidatePath(`/app/parties/${partyId}/settings`);
  revalidatePath(`/app/parties/${partyId}/timeline`);
  revalidatePath("/app");
  revalidatePath("/app/parties");
  revalidatePath("/app/inbox");
}

async function sendInviteMail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { partyId: string; email: string; role: CollaboratorRole; token: string },
) {
  const [{ data: party }, host] = await Promise.all([
    supabase
      .from("parties")
      .select("name, starts_at, timezone, location")
      .eq("id", input.partyId)
      .maybeSingle(),
    hostIdentity(supabase),
  ]);
  if (!party) return { error: "Party not found." };

  const email = buildCollaboratorInviteEmail({
    hostName: host.name,
    party: {
      name: party.name,
      startsAt: party.starts_at,
      timezone: party.timezone,
      location: party.location,
    },
    role: input.role,
    token: input.token,
  });
  const result = await sendEmail({
    to: input.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    fromName: host.name ? `${host.name} via plated.` : "plated.",
    replyTo: host.email,
  });
  return { error: result.error };
}

export async function inviteCollaborator(partyId: string, formData: FormData) {
  const access = await requirePartyManager(partyId);
  if (access.error || !access.user) return { error: access.error ?? "Not signed in." };
  const { supabase, user } = access;

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = String(formData.get("role") ?? "helper") as CollaboratorRole;
  if (!isEmail(email)) return { error: "Enter a valid email address." };
  if (role !== "co_owner" && role !== "helper") return { error: "Choose co-owner or helper." };

  const host = await hostIdentity(supabase);
  if (host.email && normalizeEmail(host.email) === email) {
    return { error: "You already have access to this party." };
  }

  const { data: members } = await supabase.from("party_members").select("user_id").eq("party_id", partyId);
  const memberIds = (members ?? []).map((member) => member.user_id);
  if (memberIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", memberIds);
    if ((profiles ?? []).some((profile) => profile.email && normalizeEmail(profile.email) === email)) {
      return { error: "That person is already a collaborator on this party." };
    }
  }

  const { data: pending } = await supabase
    .from("party_collaborator_invites")
    .select("id, token")
    .eq("party_id", partyId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .ilike("email", email)
    .maybeSingle();

  const token = newInviteToken();
  if (pending) {
    const { error } = await supabase
      .from("party_collaborator_invites")
      .update({ token, role, last_sent_at: new Date().toISOString() })
      .eq("id", pending.id);
    if (error) return { error: error.message };
    const sent = await sendInviteMail(supabase, { partyId, email, role, token });
    await (supabase as any).rpc("queue_collaborator_invite_notification", { p_email: email, p_party_id: partyId }).catch(() => null);
    revalidateCollaborators(partyId);
    return sent.error ? { error: sent.error } : { error: null };
  }

  const { data: created, error } = await supabase
    .from("party_collaborator_invites")
    .insert({
      party_id: partyId,
      email,
      role,
      token,
      invited_by: user.id,
      last_sent_at: new Date().toISOString(),
    })
    .select("token")
    .single();
  if (error || !created) return { error: error?.message ?? "Could not create the invite." };

  const sent = await sendInviteMail(supabase, { partyId, email, role, token: created.token });
  await (supabase as any).rpc("queue_collaborator_invite_notification", { p_email: email, p_party_id: partyId }).catch(() => null);
  revalidateCollaborators(partyId);
  if (sent.error) {
    return { error: `${sent.error} The invite is waiting in pending invites — you can resend it.` };
  }
  return { error: null };
}

export async function resendCollaboratorInvite(partyId: string, inviteId: string) {
  const access = await requirePartyManager(partyId);
  if (access.error) return { error: access.error };
  const { supabase } = access;

  const { data: invite } = await supabase
    .from("party_collaborator_invites")
    .select("id, email, role, token, accepted_at, revoked_at")
    .eq("id", inviteId)
    .eq("party_id", partyId)
    .maybeSingle();
  if (!invite || invite.accepted_at || invite.revoked_at) {
    return { error: "That invite is no longer pending." };
  }

  const token = newInviteToken();
  const { error } = await supabase
    .from("party_collaborator_invites")
    .update({ token, last_sent_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (error) return { error: error.message };

  const sent = await sendInviteMail(supabase, {
    partyId,
    email: invite.email,
    role: invite.role as CollaboratorRole,
    token,
  });
  revalidateCollaborators(partyId);
  return { error: sent.error };
}

export async function revokeCollaboratorInvite(partyId: string, inviteId: string) {
  const access = await requirePartyManager(partyId);
  if (access.error) return { error: access.error };

  const { error } = await access.supabase
    .from("party_collaborator_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("party_id", partyId)
    .is("accepted_at", null);
  if (error) return { error: error.message };
  revalidateCollaborators(partyId);
  return { error: null };
}

export async function updateCollaboratorRole(partyId: string, userId: string, role: CollaboratorRole) {
  const access = await requirePartyManager(partyId);
  if (access.error) return { error: access.error };
  if (role !== "co_owner" && role !== "helper") return { error: "Choose co-owner or helper." };
  if (userId === access.user?.id) return { error: "You cannot change your own role." };

  const { data: member } = await access.supabase
    .from("party_members")
    .select("role")
    .eq("party_id", partyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return { error: "Collaborator not found." };
  if (member.role === "owner") return { error: "The party owner role cannot be changed." };

  const { error } = await access.supabase
    .from("party_members")
    .update({ role })
    .eq("party_id", partyId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  revalidateCollaborators(partyId);
  return { error: null };
}

export async function removeCollaborator(partyId: string, userId: string) {
  const access = await requirePartyManager(partyId);
  if (access.error) return { error: access.error };
  if (userId === access.user?.id) return { error: "Leave the party from your own account instead." };

  const { error } = await access.supabase
    .from("party_members")
    .delete()
    .eq("party_id", partyId)
    .eq("user_id", userId)
    .neq("role", "owner");
  if (error) return { error: error.message };
  revalidateCollaborators(partyId);
  return { error: null };
}

export async function loadCollaboratorInvite(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_collaborator_invite_by_token", { p_token: token });
  if (error || !data) {
    return { status: "missing" as const };
  }
  return data as {
    status: "pending" | "accepted" | "revoked" | "missing";
    email?: string;
    role?: CollaboratorRole;
    inviter_name?: string;
    party?: {
      id: string;
      name: string;
      starts_at: string;
      timezone: string;
      location: string | null;
      hero_image: string | null;
    };
  };
}

export async function acceptCollaboratorInvite(token: string) {
  const supabase = await createClient();
  const { data: inviteMeta } = await (supabase as any).from("party_collaborator_invites").select("party_id,invited_by,email").eq("token",token).maybeSingle();
  const { data, error } = await supabase.rpc("accept_collaborator_invite", { p_token: token });
  if (error) return { ok: false as const, error: error.message, partyId: null as string | null, status: "error" };

  const payload = data as Json;
  const result = (payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {}) as {
    ok?: boolean;
    error?: string;
    status?: string;
    party_id?: string;
  };
  if (!result.ok || !result.party_id) {
    return {
      ok: false as const,
      error: result.error ?? "Could not accept this invite.",
      partyId: null as string | null,
      status: result.status ?? "error",
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("name").eq("id",user.id).maybeSingle() : { data: null };
  if (inviteMeta?.invited_by) await (supabase as any).rpc("queue_collaborator_accept_notification", { p_party_id: result.party_id, p_invited_by: inviteMeta.invited_by, p_name: profile?.name || inviteMeta.email || "Collaborator" }).catch(() => null);
  revalidateCollaborators(result.party_id);
  return { ok: true as const, error: null, partyId: result.party_id, status: "accepted" };
}
