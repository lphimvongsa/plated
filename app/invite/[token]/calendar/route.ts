import { loadInvite } from "@/lib/actions/invite";
import { inviteCalendarEvent } from "@/lib/outbound/invite";
import { icsContent } from "@/lib/calendar";
import { icsFilename, invitePageUrl, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await loadInvite(token);
  if (invite.status === "revoked" || !invite.party) {
    return new Response("Invitation is no longer available.", { status: 404 });
  }

  const origin = siteUrl();
  const event = inviteCalendarEvent(
    {
      name: invite.party.name,
      startsAt: invite.party.starts_at,
      endsAt: invite.party.ends_at,
      timezone: invite.party.timezone,
      location: invite.party.location,
      description: invite.party.description,
      invitationMessage: invite.party.invitation_message,
      invitationHeadline: invite.party.invitation_headline,
    },
    invitePageUrl(token, origin),
  );
  event.uid = `plated-invite-${invite.party.id}-${invite.guest?.id ?? token}@plated`;
  const body = icsContent(event);
  const filename = icsFilename(invite.party.name);

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
