export const DEFAULT_TIMEZONE = "America/New_York";

export const AMERICAN_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Phoenix", label: "Arizona Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "America/Puerto_Rico", label: "Atlantic Time (Puerto Rico)" },
] as const;

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(value: string | null | undefined) {
  if (value && AMERICAN_TIMEZONES.some((zone) => zone.value === value)) return value;
  if (value && isValidTimeZone(value)) return value;
  return DEFAULT_TIMEZONE;
}

export function timezoneSelectOptions(current?: string | null) {
  const options: Array<{ value: string; label: string }> = AMERICAN_TIMEZONES.map((zone) => ({ value: zone.value, label: zone.label }));
  if (current && !options.some((zone) => zone.value === current)) {
    options.unshift({ value: current, label: current.replace(/_/g, " ") });
  }
  return options;
}

function tzOffsetMs(utcMs: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(utcMs))
      .map((part) => [part.type, part.value]),
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asIfUtc - utcMs;
}

/** Interpret a wall-clock date and time in `timeZone` and return the UTC instant. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? 0);
  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) return null;
  const zone = normalizeTimezone(timeZone);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const instant = utcGuess - tzOffsetMs(utcGuess - tzOffsetMs(utcGuess, zone), zone);
  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function timezoneShortLabel(timeZone: string, at = new Date()) {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: normalizeTimezone(timeZone),
      timeZoneName: "short",
    })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value ?? ""
  );
}
