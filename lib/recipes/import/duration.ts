/** Parse ISO-8601 durations and common recipe time strings into minutes. */
export function durationToMinutes(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (iso) {
    const days = Number(iso[1] ?? 0);
    const hours = Number(iso[2] ?? 0);
    const minutes = Number(iso[3] ?? 0);
    const seconds = Number(iso[4] ?? 0);
    const total = days * 24 * 60 + hours * 60 + minutes + seconds / 60;
    return total > 0 ? Math.round(total) : null;
  }

  const compact = value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/minutes?|mins?/g, "m")
    .replace(/hours?|hrs?/g, "h");

  let total = 0;
  let matched = false;
  const hourMatch = compact.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hourMatch) {
    total += Number(hourMatch[1]) * 60;
    matched = true;
  }
  const minMatch = compact.match(/(\d+(?:\.\d+)?)\s*m(?![a-z])/);
  if (minMatch) {
    total += Number(minMatch[1]);
    matched = true;
  }
  if (matched) return Math.round(total);

  const asNumber = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(asNumber) && asNumber > 0 ? Math.round(asNumber) : null;
}

export function yieldToServings(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.round(raw);
  if (typeof raw !== "string") return null;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
