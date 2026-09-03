import { DEFAULT_TIMEZONE } from "@/lib/timezone";

const RSVP_LABELS: Record<string, string> = {
  attending: "Attending",
  maybe: "Maybe",
  not_attending: "Not attending",
  no_response: "No response",
};

export function formatRsvpStatus(status: string) {
  return RSVP_LABELS[status] ?? status;
}

export function parseAllergyList(raw: string | null | undefined) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item && !/^(none|n\/a|—|-)$/i.test(item));
}

export function serializeAllergyList(items: string[]) {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join("\n") : null;
}

export function formatAllergyList(raw: string | null | undefined) {
  return parseAllergyList(raw).join(", ");
}

export function hasAllergyList(raw: string | null | undefined) {
  return parseAllergyList(raw).length > 0;
}

export function initialsFromName(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatMinutes(minutes: number | null | undefined) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

export function toDateInputValue(iso: string, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function toTimeInputValue(iso: string, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
