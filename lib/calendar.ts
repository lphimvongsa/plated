export type CalendarEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  uid?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toGoogleDate(iso: string) {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function foldIcsLine(line: string) {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  let first = true;
  while (remaining.length > 0) {
    const size = first ? 75 : 74;
    chunks.push(`${first ? "" : " "}${remaining.slice(0, size)}`);
    remaining = remaining.slice(size);
    first = false;
  }
  return chunks.join("\r\n");
}

export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(event.startsAt)}/${toGoogleDate(event.endsAt)}`,
  });
  if (event.location) params.set("location", event.location);
  const details = [event.description, event.url ? `RSVP: ${event.url}` : ""]
    .filter(Boolean)
    .join("\n\n");
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsContent(event: CalendarEvent) {
  const escape = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//plated.//invite//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escape(event.uid || `${event.title}-${event.startsAt}@plated`)}`,
    `DTSTAMP:${toGoogleDate(new Date().toISOString())}`,
    `DTSTART:${toGoogleDate(event.startsAt)}`,
    `DTEND:${toGoogleDate(event.endsAt)}`,
    `SUMMARY:${escape(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
  if (event.organizerEmail) {
    const cn = escape(event.organizerName || event.organizerEmail);
    lines.push(`ORGANIZER;CN=${cn}:mailto:${escape(event.organizerEmail)}`);
  }
  if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
  if (event.url) lines.push(`URL:${escape(event.url)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n");
}

export function icsDataUri(event: CalendarEvent) {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent(event))}`;
}

export function formatPartyWhen(startsAt: string, timeZone = "America/New_York") {
  const start = new Date(startsAt);
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(start);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(start);
  return { date, time };
}
