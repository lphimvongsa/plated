import { formatPartyWhen, googleCalendarUrl, icsContent, type CalendarEvent } from "@/lib/calendar";
import { icsFilename, invitePageUrl } from "@/lib/site";

export type InvitePartyDetails = {
  name: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string | null;
  description: string | null;
  invitationMessage: string | null;
  invitationHeadline: string | null;
};

export function inviteCalendarEvent(party: InvitePartyDetails, inviteUrl: string): CalendarEvent {
  const when = formatPartyWhen(party.startsAt, party.timezone);
  const intro = party.invitationMessage || party.description || `Dinner invitation for ${party.name}`;
  return {
    title: party.invitationHeadline || party.name,
    startsAt: party.startsAt,
    endsAt: party.endsAt || party.startsAt,
    location: party.location,
    description: `${intro}\n\n${when.date} at ${when.time}`,
    url: inviteUrl,
  };
}

export function inviteGoogleCalendarUrl(party: InvitePartyDetails, token: string, origin?: string) {
  return googleCalendarUrl(inviteCalendarEvent(party, invitePageUrl(token, origin)));
}

export function buildInviteEmail(input: {
  guestName: string;
  hostName?: string | null;
  party: InvitePartyDetails;
  token: string;
  origin?: string;
}) {
  const inviteUrl = invitePageUrl(input.token, input.origin);
  const event = inviteCalendarEvent(input.party, inviteUrl);
  const when = formatPartyWhen(input.party.startsAt, input.party.timezone);
  const headline = input.party.invitationHeadline || input.party.name;
  const message = input.party.invitationMessage || input.party.description || "Dinner, drinks, and a table worth lingering around.";
  const location = input.party.location || "Location to come";
  const greeting = input.guestName.trim() ? `Hi ${input.guestName.trim().split(/\s+/)[0]},` : "Hi,";
  const subject = input.hostName?.trim()
    ? `${input.hostName.trim()} invited you to ${input.party.name}`
    : `Invitation: ${input.party.name}`;

  const text = [
    greeting,
    "",
    `${input.hostName?.trim() || "A host"} invited you to ${headline}.`,
    `${when.date} at ${when.time}`,
    location,
    "",
    message,
    "",
    `RSVP here: ${inviteUrl}`,
    "Add it to your calendar from that page, or open the attached calendar file.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f0e7;color:#29231f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0e7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fffaf1;border:1px solid rgba(41,35,31,0.12);">
            <tr>
              <td style="padding:36px 32px 28px;font-family:Georgia,'Times New Roman',serif;">
                <p style="margin:0;font-size:16px;line-height:1.5;">${escapeHtml(greeting)}</p>
                <p style="margin:18px 0 0;font-size:16px;line-height:1.5;">${escapeHtml((input.hostName?.trim() || "A host") + " invited you to " + headline + ".")}</p>
                <p style="margin:22px 0 0;font-size:14px;letter-spacing:.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${escapeHtml(when.date)} · ${escapeHtml(when.time)}</p>
                <p style="margin:8px 0 0;font-size:15px;color:rgba(41,35,31,0.62);">${escapeHtml(location)}</p>
                <p style="margin:22px 0 0;font-size:18px;line-height:1.5;">${escapeHtml(message)}</p>
                <p style="margin:28px 0 0;">
                  <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#c84432;color:#fffaf1;text-decoration:none;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Open invitation and RSVP</a>
                </p>
                <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:rgba(41,35,31,0.5);font-family:Arial,Helvetica,sans-serif;">Google Calendar and a calendar file are on the invitation page. A .ics file is also attached.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    html,
    text,
    ics: { filename: icsFilename(input.party.name), content: icsContent(event) },
    inviteUrl,
  };
}

export function buildInviteSms(input: {
  party: InvitePartyDetails;
  token: string;
  origin?: string;
}) {
  const inviteUrl = invitePageUrl(input.token, input.origin);
  const when = formatPartyWhen(input.party.startsAt, input.party.timezone);
  const location = input.party.location ? ` at ${input.party.location}` : "";
  return `You're invited to ${input.party.name} — ${when.date} at ${when.time}${location}. RSVP + add to Google Calendar: ${inviteUrl}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
