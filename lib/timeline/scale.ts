export type AxisColumn = {
  start: number;
  end: number;
  x: number;
  width: number;
  label: string;
  sublabel: string | null;
  isWeekend: boolean;
};

export type Axis = {
  columns: AxisColumn[];
  start: number;
  end: number;
  totalWidth: number;
  columnWidth: number;
  pxPerHour: number;
  xForTime: (ms: number) => number;
  timeForX: (px: number) => number;
};

/** How many hours of timeline fit in the visible scrollport. */
export const VIEWPORT_HOURS = 12;
/** Placement snaps to this resolution on the timeline. */
export const SNAP_MINUTES = 5;
/** Minor grid spacing inside each hour column, by zoom level. */
export function gridTickMinutes(viewHours: number): number {
  if (viewHours <= 1.25) return 5;
  if (viewHours <= 3.5) return 10;
  if (viewHours <= 6) return 15;
  if (viewHours <= 16) return 30;
  return 60;
}

/** Label cadence adapts independently from the smaller hash marks. */
export function gridLabelMinutes(viewHours: number): number {
  if (viewHours <= 1.25) return 10;
  if (viewHours <= 3.5) return 30;
  if (viewHours <= 6) return 30;
  return 60;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timeZone: string) {
  let formatter = offsetFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    offsetFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Milliseconds to add to an instant to get its wall-clock time in `timeZone`. */
export function tzOffsetMs(ms: number, timeZone: string) {
  const parts = offsetFormatter(timeZone).formatToParts(new Date(ms));
  const value: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") value[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
  );
  return asUtc - Math.floor(ms / 1000) * 1000;
}

function floorWallClock(ms: number, timeZone: string, unitMs: number) {
  const offset = tzOffsetMs(ms, timeZone);
  const floored = Math.floor((ms + offset) / unitMs) * unitMs;
  const guess = floored - offset;
  const settled = tzOffsetMs(guess, timeZone);
  return settled === offset ? guess : floored - settled;
}

export function startOfDayInTz(ms: number, timeZone: string) {
  return floorWallClock(ms, timeZone, DAY_MS);
}

export function startOfHourInTz(ms: number, timeZone: string) {
  return floorWallClock(ms, timeZone, HOUR_MS);
}

export function addWallClock(ms: number, deltaMs: number, timeZone: string) {
  const offset = tzOffsetMs(ms, timeZone);
  const wall = ms + offset + deltaMs;
  const guess = wall - offset;
  const settled = tzOffsetMs(guess, timeZone);
  return wall - settled;
}

export function snapToMinutes(ms: number, minutes: number) {
  const step = minutes * 60_000;
  return Math.round(ms / step) * step;
}

/**
 * Continuous hour axis from prep → party.
 * `pxPerHour` should be `viewportWidth / VIEWPORT_HOURS` so ~12 hours are visible at once.
 */
export function buildAxis({
  start,
  end,
  timeZone,
  pxPerHour,
}: {
  start: number;
  end: number;
  timeZone: string;
  pxPerHour: number;
}): Axis {
  const columnWidth = Math.max(24, pxPerHour);
  const dayLabel = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" });
  const hourLabel = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric" });
  const weekdayIndex = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });

  const first = startOfHourInTz(start, timeZone);
  const columns: AxisColumn[] = [];
  let cursor = first;
  let x = 0;
  let previousDay = "";

  while (cursor < end && columns.length < 2000) {
    const next = addWallClock(cursor, HOUR_MS, timeZone);
    const date = new Date(cursor);
    const day = weekdayIndex.format(date);
    const isWeekend = day === "Sat" || day === "Sun";

    columns.push({
      start: cursor,
      end: next,
      x,
      width: columnWidth,
      label: hourLabel.format(date),
      sublabel: day === previousDay ? null : `${dayLabel.format(date)} · ${dateLabel.format(date)}`,
      isWeekend,
    });

    previousDay = day;
    x += columnWidth;
    cursor = next;
  }

  const totalWidth = columns.length * columnWidth;
  const axisStart = columns[0]?.start ?? start;
  const axisEnd = columns[columns.length - 1]?.end ?? end;

  function xForTime(ms: number) {
    if (!columns.length) return 0;
    if (ms <= axisStart) return 0;
    if (ms >= axisEnd) return totalWidth;
    const index = Math.min(
      columns.length - 1,
      Math.max(
        0,
        columns.findIndex((column) => ms < column.end),
      ),
    );
    const column = columns[index];
    const ratio = (ms - column.start) / (column.end - column.start);
    return column.x + ratio * column.width;
  }

  function timeForX(px: number) {
    if (!columns.length) return axisStart;
    const clamped = Math.min(totalWidth, Math.max(0, px));
    const index = Math.min(columns.length - 1, Math.floor(clamped / columnWidth));
    const column = columns[index];
    const ratio = (clamped - column.x) / column.width;
    return column.start + ratio * (column.end - column.start);
  }

  return {
    columns,
    start: axisStart,
    end: axisEnd,
    totalWidth,
    columnWidth,
    pxPerHour: columnWidth,
    xForTime,
    timeForX,
  };
}
