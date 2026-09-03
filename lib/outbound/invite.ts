import { formatPartyWhen, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { invitePageUrl } from "@/lib/site";

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
