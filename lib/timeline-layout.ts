/** Timeline schedule layout: minutes ↔ pixels and snap helpers. */

export const PX_PER_MINUTE = 1.35;
export const SNAP_MINUTES = 15;
export const DEFAULT_DURATION_MINUTES = 30;
export const HOUR_HEIGHT = PX_PER_MINUTE * 60;

/** Fallback durations when seed/AI has not filled duration_minutes. */
export const DURATION_BY_TITLE: Record<string, number> = {
  "Make tart dough": 45,
  "Marinate chicken": 20,
  "Bake olive oil cake": 75,
  "Set table & chill wine": 45,
  "Blind-bake tart shell": 40,
  "Prep greens and tahini": 30,
  "Grill chicken": 50,
  "Finish tart & plate welcome bite": 35,
};

export type TimelineTaskLike = {
  id: string;
  title: string;
  start_at: string | null;
  duration_minutes: number | null;
};

export function resolveDurationMinutes(
  durationMinutes: number | null | undefined,
  title?: string,
): number {
  if (durationMinutes != null && durationMinutes > 0) return durationMinutes;
  if (title && DURATION_BY_TITLE[title]) return DURATION_BY_TITLE[title];
  return DEFAULT_DURATION_MINUTES;
}

export function taskBlockHeight(durationMinutes: number) {
  return Math.max(SNAP_MINUTES * PX_PER_MINUTE, durationMinutes * PX_PER_MINUTE);
}

export function minutesToPixels(minutes: number) {
  return minutes * PX_PER_MINUTE;
}

export function pixelsToMinutes(pixels: number) {
  return pixels / PX_PER_MINUTE;
}

export function snapMinutes(minutes: number, snap = SNAP_MINUTES) {
  return Math.round(minutes / snap) * snap;
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function eachDayInclusive(from: Date, to: Date) {
  const days: Date[] = [];
  let cursor = startOfLocalDay(from);
  const end = startOfLocalDay(to);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${period}`;
}

export function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatCompactDay(date: Date) {
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date),
  };
}

export function getScheduleBounds(tasks: TimelineTaskLike[], partyStartsAt: string) {
  const partyStart = new Date(partyStartsAt);
  const starts = tasks
    .map((t) => (t.start_at ? new Date(t.start_at) : null))
    .filter((d): d is Date => Boolean(d));

  const earliest = starts.length
    ? new Date(Math.min(...starts.map((d) => d.getTime()), partyStart.getTime()))
    : partyStart;
  const latest = starts.length
    ? new Date(Math.max(...starts.map((d) => d.getTime()), partyStart.getTime()))
    : partyStart;

  const rangeStart = startOfLocalDay(earliest);
  const rangeEnd = startOfLocalDay(latest);

  // Visible hours: pad around task activity, clamp to a readable day window.
  let minHour = 6;
  let maxHour = 22;
  for (const start of starts) {
    const h = start.getHours() + start.getMinutes() / 60;
    minHour = Math.min(minHour, Math.floor(h));
    maxHour = Math.max(maxHour, Math.ceil(h + 1));
  }
  minHour = Math.max(0, Math.min(6, minHour));
  maxHour = Math.min(24, Math.max(22, maxHour));

  return {
    days: eachDayInclusive(rangeStart, rangeEnd),
    rangeStart,
    rangeEnd,
    startHour: minHour,
    endHour: maxHour,
    partyStart,
  };
}

export function minutesFromDayStart(date: Date, startHour: number) {
  return date.getHours() * 60 + date.getMinutes() - startHour * 60;
}

export function dateFromDayAndMinutes(day: Date, minutesFromGridStart: number, startHour: number) {
  const totalMinutes = startHour * 60 + minutesFromGridStart;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
}
