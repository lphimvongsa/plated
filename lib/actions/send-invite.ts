"use server";

import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/outbound/email";
import { buildInviteEmail, buildInviteSms, type InvitePartyDetails } from "@/lib/outbound/invite";
import { DEFAULT_PARTY_DURATION_MINUTES, partyEndsAt } from "@/lib/party/duration";
import { normalizePhone } from "@/lib/outbound/phone";
import { sendSms } from "@/lib/outbound/sms";
import { createClient } from "@/lib/supabase/server";

export type InviteChannel = "email" | "sms";

type PartyRow = {
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  invitation_headline: string | null;
  invitation_message: string | null;
};

function toPartyDetails(party: PartyRow): InvitePartyDetails {
  const startsAt = party.starts_at;
  const endsAt = party.ends_at || partyEndsAt(new Date(startsAt), DEFAULT_PARTY_DURATION_MINUTES).toISOString();
  return {
    name: party.name,
    startsAt,
    endsAt,
    timezone: party.timezone,
    location: party.location,
    description: party.description,
    invitationMessage: party.invitation_message,
    invitationHeadline: party.invitation_headline,
  };
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hostIdentity(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { email?: string; user_metadata?: { name?: string; full_name?: string } } | undefined;
  return {
    name: claims?.user_metadata?.name || claims?.user_metadata?.full_name || claims?.email || null,
    email: claims?.email ?? null,
  };
}

async function recordDelivery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    partyId: string;
    inviteId: string;
    guestId: string;
    channel: InviteChannel;
    recipient: string;
    status: "sent" | "failed";
    provider: string;
    providerMessageId?: string | null;
    error?: string | null;
  },
) {
  await supabase.from("invite_deliveries").insert({
    party_id: input.partyId,
    invite_id: input.inviteId,
    guest_id: input.guestId,
    channel: input.channel,
    recipient: input.recipient,
    status: input.status,
    provider: input.provider,
    provider_message_id: input.providerMessageId || null,
    error: input.error || null,
  });
  if (input.status === "sent") {
    await supabase
      .from("invites")
      .update({ last_sent_at: new Date().toISOString(), last_sent_channel: input.channel })
      .eq("id", input.inviteId);
  }
}

async function loadSendableInvite(partyId: string, guestId: string) {
  const supabase = await createClient();
  const [{ data: party }, { data: guest }, { data: invite }] = await Promise.all([
    supabase
      .from("parties")
      .select("name,description,starts_at,ends_at,timezone,location,invitation_headline,invitation_message")
      .eq("id", partyId)
      .maybeSingle(),
    supabase.from("guests").select("id,name,email,phone").eq("id", guestId).eq("party_id", partyId).maybeSingle(),
    supabase
      .from("invites")
      .select("id,token,revoked_at")
      .eq("party_id", partyId)
      .eq("guest_id", guestId)
      .maybeSingle(),
  ]);

  if (!party || !guest) return { error: "Guest not found." as const, supabase, party: null, guest: null, invite: null };

  let active = invite;
  if (!active) {
    const created = await supabase
      .from("invites")
      .insert({ party_id: partyId, guest_id: guestId })
      .select("id,token,revoked_at")
      .single();
    if (created.error || !created.data) return { error: created.error?.message ?? "Could not create an invite.", supabase, party: null, guest: null, invite: null };
    active = created.data;
  } else if (active.revoked_at) {
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const restored = await supabase
      .from("invites")
      .update({ token, revoked_at: null })
      .eq("id", active.id)
      .select("id,token,revoked_at")
      .single();
    if (restored.error || !restored.data) {
      return { error: restored.error?.message ?? "Could not restore this invite.", supabase, party: null, guest: null, invite: null };
    }
    active = restored.data;
  }

  return { error: null, supabase, party, guest, invite: active };
}

export async function sendGuestInvite(input: {
  partyId: string;
  guestId: string;
  channel: InviteChannel;
  recipient: string;
}): Promise<{ error: string | null }> {
  const loaded = await loadSendableInvite(input.partyId, input.guestId);
  if (loaded.error || !loaded.party || !loaded.guest || !loaded.invite) {
    return { error: loaded.error ?? "Could not send this invite." };
  }

  const { supabase, party, guest, invite } = loaded;
  const recipient = input.recipient.trim();
  const partyDetails = toPartyDetails(party);

  if (input.channel === "email") {
    if (!isEmail(recipient)) return { error: "Enter a valid email address." };
    await supabase.from("guests").update({ email: recipient }).eq("id", guest.id);
    const host = await hostIdentity(supabase);
    const email = buildInviteEmail({
      guestName: guest.name,
      hostName: host.name,
      party: partyDetails,
      token: invite.token,
    });
    const result = await sendEmail({
      to: recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      fromName: host.name ? `${host.name} via plated.` : "plated.",
      replyTo: host.email,
      ics: email.ics,
    });
    await recordDelivery(supabase, {
      partyId: input.partyId,
      inviteId: invite.id,
      guestId: guest.id,
      channel: "email",
      recipient,
      status: result.error ? "failed" : "sent",
      provider: "gmail",
      providerMessageId: result.id,
      error: result.error,
    });
    revalidatePath(`/app/parties/${input.partyId}/guests`);
    revalidatePath(`/app/parties/${input.partyId}/invitation`);
    return { error: result.error };
  }

  const phone = normalizePhone(recipient);
  if (!phone) return { error: "Enter a valid phone number, including country code if it is not US/Canada." };
  await supabase.from("guests").update({ phone }).eq("id", guest.id);
  const result = await sendSms({
    to: phone,
    body: buildInviteSms({ party: partyDetails, token: invite.token }),
  });
  await recordDelivery(supabase, {
    partyId: input.partyId,
    inviteId: invite.id,
    guestId: guest.id,
    channel: "sms",
    recipient: phone,
    status: result.error ? "failed" : "sent",
    provider: "twilio",
    providerMessageId: result.id,
    error: result.error,
  });
  revalidatePath(`/app/parties/${input.partyId}/guests`);
  revalidatePath(`/app/parties/${input.partyId}/invitation`);
  return { error: result.error };
}

export async function sendGuestInvites(input: {
  partyId: string;
  channel: InviteChannel;
  guestIds?: string[];
}): Promise<{ sent: number; skipped: number; failed: Array<{ name: string; error: string }> }> {
  const supabase = await createClient();
  let guestQuery = supabase.from("guests").select("id,name,email,phone").eq("party_id", input.partyId).order("created_at");
  if (input.guestIds?.length) guestQuery = guestQuery.in("id", input.guestIds);
  const { data: guests } = await guestQuery;

  let sent = 0;
  let skipped = 0;
  const failed: Array<{ name: string; error: string }> = [];

  for (const guest of guests ?? []) {
    const recipient = input.channel === "email" ? guest.email?.trim() : guest.phone?.trim();
    if (!recipient) {
      skipped += 1;
      continue;
    }
    const result = await sendGuestInvite({
      partyId: input.partyId,
      guestId: guest.id,
      channel: input.channel,
      recipient,
    });
    if (result.error) failed.push({ name: guest.name, error: result.error });
    else sent += 1;
  }

  return { sent, skipped, failed };
}

export async function markInviteLinkCopied(inviteId: string, partyId: string) {
  const supabase = await createClient();
  await supabase
    .from("invites")
    .update({ last_sent_at: new Date().toISOString(), last_sent_channel: "link" })
    .eq("id", inviteId)
    .eq("party_id", partyId);
  revalidatePath(`/app/parties/${partyId}/guests`);
  return { error: null };
}
