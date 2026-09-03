import "server-only";

type NotificationEvent = {
  event: "rsvp" | "collaborator_invite" | "collaborator_accept";
  partyId?: string;
  inviteToken?: string;
  collaboratorEmail?: string;
  actorName?: string;
  guestName?: string;
  rsvpStatus?: string;
};

export async function dispatchNotification(event: NotificationEvent) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.NOTIFICATION_DISPATCH_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(`${url}/functions/v1/push-notifications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...event, secret }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Push delivery is best-effort and must not block the underlying action.
  }
}
