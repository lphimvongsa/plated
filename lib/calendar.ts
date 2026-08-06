export type CalendarEvent = {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  description?: string | null;
};

function toGoogleDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
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

export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(event.startsAt)}/${toGoogleDate(event.endsAt)}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);
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
    `DTSTART:${toGoogleDate(event.startsAt)}`,
    `DTEND:${toGoogleDate(event.endsAt)}`,
    `SUMMARY:${escape(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
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
