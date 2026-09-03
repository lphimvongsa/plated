import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type EventBody = {
  secret?: string;
  event: "rsvp" | "collaborator_invite" | "collaborator_accept";
  partyId?: string;
  inviteToken?: string;
  collaboratorEmail?: string;
  actorName?: string;
  guestName?: string;
  rsvpStatus?: string;
};

const cors = { "content-type": "application/json" };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: cors });
  const body = await req.json() as EventBody;
  const requiredSecret = Deno.env.get("NOTIFICATION_DISPATCH_SECRET");
  if (!requiredSecret || body.secret !== requiredSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, service, { auth: { persistSession: false } });
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@plated.app";
  if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey);

  const targets = new Map<string, { title: string; body: string; href: string; partyId: string | null; type: EventBody["event"] }>();

  if (body.event === "rsvp" && body.partyId) {
    const [{ data: party }, { data: members }] = await Promise.all([
      supabase.from("parties").select("id,name,owner_id").eq("id", body.partyId).maybeSingle(),
      supabase.from("party_members").select("user_id,role").eq("party_id", body.partyId).in("role", ["owner","co_owner"]),
    ]);
    if (party) {
      const ids = new Set<string>([party.owner_id, ...(members ?? []).map((m) => m.user_id)]);
      for (const id of ids) targets.set(id, {
        title: `${body.guestName || "A guest"} RSVP’d`,
        body: `${body.rsvpStatus || "Response received"} · ${party.name}`,
        href: `/app/parties/${party.id}/guests`, partyId: party.id, type: body.event,
      });
    }
  }

  if (body.event === "collaborator_invite" && body.collaboratorEmail && body.partyId) {
    const [{ data: profile }, { data: party }] = await Promise.all([
      supabase.from("profiles").select("id,profile_discoverable").ilike("email", body.collaboratorEmail).maybeSingle(),
      supabase.from("parties").select("id,name").eq("id", body.partyId).maybeSingle(),
    ]);
    if (profile?.profile_discoverable && party) targets.set(profile.id, {
      title: "New collaborator invitation",
      body: `${body.actorName || "A host"} invited you to ${party.name}.`,
      href: "/app/inbox", partyId: party.id, type: body.event,
    });
  }

  if (body.event === "collaborator_accept" && body.inviteToken) {
    const { data: invite } = await supabase.from("party_collaborator_invites")
      .select("party_id,invited_by,email").eq("token", body.inviteToken).maybeSingle();
    if (invite) {
      const [{ data: party }, { data: owner }] = await Promise.all([
        supabase.from("parties").select("id,name,owner_id").eq("id", invite.party_id).maybeSingle(),
        supabase.from("profiles").select("name").ilike("email", invite.email).maybeSingle(),
      ]);
      if (party) {
        const ids = new Set<string>([invite.invited_by, party.owner_id]);
        for (const id of ids) targets.set(id, {
          title: "Collaborator accepted",
          body: `${owner?.name || invite.email} joined ${party.name}.`,
          href: `/app/parties/${party.id}/settings`, partyId: party.id, type: body.event,
        });
      }
    }
  }

  let pushed = 0;
  for (const [userId, note] of targets) {
    const { data: profile } = await supabase.from("profiles").select("notification_master,notify_rsvps,notify_collaborator_invites,notify_collaborator_accepts").eq("id", userId).maybeSingle();
    const preference = note.type === "rsvp" ? profile?.notify_rsvps : note.type === "collaborator_invite" ? profile?.notify_collaborator_invites : profile?.notify_collaborator_accepts;
    await supabase.from("notifications").insert({ user_id: userId, party_id: note.partyId, type: note.type, title: note.title, body: note.body, href: note.href });
    if (!profile?.notification_master || preference === false || !publicKey || !privateKey) continue;
    const { data: subs } = await supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", userId);
    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(note));
        pushed++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, targets: targets.size, pushed }), { headers: cors });
});
