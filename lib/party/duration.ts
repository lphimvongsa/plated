export const DEFAULT_PARTY_DURATION_MINUTES = 180;

export const PARTY_DURATION_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1.5 hours" },
  { minutes: 120, label: "2 hours" },
  { minutes: 150, label: "2.5 hours" },
  { minutes: 180, label: "3 hours" },
  { minutes: 240, label: "4 hours" },
  { minutes: 300, label: "5 hours" },
  { minutes: 360, label: "6 hours" },
];

export function parsePartyDurationMinutes(
  raw: unknown,
  fallback = DEFAULT_PARTY_DURATION_MINUTES,
) {
  const minutes = Number(raw);
  if (!Number.isFinite(minutes)) return fallback;
  return Math.max(30, Math.min(12 * 60, Math.round(minutes)));
}

export function durationMinutesBetween(startsAt: string, endsAt?: string | null) {
  if (!endsAt) return DEFAULT_PARTY_DURATION_MINUTES;
  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_PARTY_DURATION_MINUTES;
  return parsePartyDurationMinutes(minutes);
}

export function partyEndsAt(startsAt: Date, durationMinutes: number) {
  return new Date(startsAt.getTime() + parsePartyDurationMinutes(durationMinutes) * 60_000);
}

export function partyDurationOptions(currentMinutes?: number) {
  const minutes =
    currentMinutes == null ? DEFAULT_PARTY_DURATION_MINUTES : parsePartyDurationMinutes(currentMinutes);
  const options = PARTY_DURATION_OPTIONS.map((option) => ({ ...option }));
  if (!options.some((option) => option.minutes === minutes)) {
    options.push({ minutes, label: formatPartyDuration(minutes) });
    options.sort((a, b) => a.minutes - b.minutes);
  }
  return options;
}

export function formatPartyDuration(minutes: number) {
  const value = parsePartyDurationMinutes(minutes);
  if (value % 60 === 0) {
    const hours = value / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 30 ? `${hours}.5 hours` : `${hours === 1 ? "1 hour" : `${hours} hours`} ${rest} min`;
}

export function formatPartyEndClock(date: string, time: string, durationMinutes: number) {
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(partyEndsAt(start, durationMinutes));
}
