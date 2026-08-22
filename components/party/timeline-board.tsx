"use client";

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Modal } from "@/components/modal";
import { TaskDoneToggle, TaskLockToggle } from "@/components/party/task-toggles";
import {
  addHelper,
  autoScheduleTimeline,
  moveTask,
  removeHelper,
  renameHelper,
  setTaskDuration,
} from "@/lib/actions/timeline";
import {
  buildAxis,
  gridTickMinutes,
  snapToMinutes,
  SNAP_MINUTES,
  VIEW_HOUR_OPTIONS,
  VIEWPORT_HOURS,
} from "@/lib/timeline/scale";
import { Check, GripVertical, Lock, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

export type TimelineStep = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
};

export type TimelineTask = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  duration_minutes: number | null;
  status: string;
  difficulty: string | null;
  assigned_name: string | null;
  helper_id: string | null;
  locked: boolean;
  recipe_id: string | null;
  recipe_title: string | null;
  task: string;
  sort_order: number;
  steps: TimelineStep[];
};

export type TimelineHelper = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

type Lane = {
  key: string;
  helperId: string;
  name: string;
  color: string;
};

type RecipeGroup = {
  key: string;
  recipeId: string | null;
  title: string;
  tasks: TimelineTask[];
  totalMinutes: number;
  scheduledCount: number;
};

type Move = { taskId: string; helperId?: string | null; startAt?: string | null };

const DEFAULT_MINUTES = 30;
const BAR_HEIGHT = 40;
/** Thin enough that short tasks stay proportional; still grabable. */
const MIN_BAR_WIDTH = 10;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
type ViewHours = (typeof VIEW_HOUR_OPTIONS)[number];

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length) return pointerHits;
  return closestCenter(args);
};

function laneGridBackground(columnWidth: number, tickMinutes: number) {
  const hour = `repeating-linear-gradient(to right, rgba(41,35,31,0.16) 0 1px, transparent 1px ${columnWidth}px)`;
  if (tickMinutes >= 60) return hour;
  const tickWidth = columnWidth * (tickMinutes / 60);
  const minor = `repeating-linear-gradient(to right, rgba(41,35,31,0.07) 0 1px, transparent 1px ${tickWidth}px)`;
  return `${hour}, ${minor}`;
}

const HELPER_STYLES: Record<string, { bar: string; dot: string; soft: string }> = {
  tomato: { bar: "border-tomato bg-tomato text-paper", dot: "bg-tomato", soft: "bg-tomato/10" },
  orange: { bar: "border-orange bg-orange text-paper", dot: "bg-orange", soft: "bg-orange/10" },
  olive: { bar: "border-olive bg-olive text-paper", dot: "bg-olive", soft: "bg-olive/10" },
  wine: { bar: "border-wine bg-wine text-paper", dot: "bg-wine", soft: "bg-wine/10" },
  gold: { bar: "border-gold bg-gold text-ink", dot: "bg-gold", soft: "bg-gold/12" },
  blush: { bar: "border-blush bg-blush text-ink", dot: "bg-blush", soft: "bg-blush/20" },
};

const RECIPE_COLORS = [
  { background: "#c95d3f", border: "#9d4029", color: "#fffaf2" },
  { background: "#d58a32", border: "#a7661f", color: "#241d18" },
  { background: "#718457", border: "#52653d", color: "#fffaf2" },
  { background: "#8c5361", border: "#673b47", color: "#fffaf2" },
  { background: "#397a78", border: "#285b59", color: "#fffaf2" },
  { background: "#78659a", border: "#594776", color: "#fffaf2" },
  { background: "#b06c86", border: "#884c65", color: "#fffaf2" },
  { background: "#507399", border: "#385675", color: "#fffaf2" },
];

function recipeStyle(task: TimelineTask) {
  if (!task.recipe_id) return { background: "#e9e2d6", border: "#81786e", color: "#29231f" };
  let hash = 0;
  for (const character of task.recipe_id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return RECIPE_COLORS[hash % RECIPE_COLORS.length];
}

function styleFor(color: string) {
  return HELPER_STYLES[color] ?? HELPER_STYLES.tomato;
}

function minutesOf(task: TimelineTask) {
  return task.duration_minutes ?? DEFAULT_MINUTES;
}

function barWidthPx(
  axis: ReturnType<typeof buildAxis>,
  startMs: number,
  durationMinutes: number,
) {
  const raw = axis.xForTime(startMs + durationMinutes * 60_000) - axis.xForTime(startMs);
  return Math.max(MIN_BAR_WIDTH, raw);
}

function groupTasksByRecipe(tasks: TimelineTask[]): RecipeGroup[] {
  const order: string[] = [];
  const map = new Map<string, RecipeGroup>();

  const sorted = [...tasks].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title),
  );

  for (const task of sorted) {
    const key = task.recipe_id ?? `loose:${task.id}`;
    if (!map.has(key)) {
      order.push(key);
      map.set(key, {
        key,
        recipeId: task.recipe_id,
        title: task.recipe_title ?? "Other tasks",
        tasks: [],
        totalMinutes: 0,
        scheduledCount: 0,
      });
    }
    const group = map.get(key)!;
    group.tasks.push(task);
    group.totalMinutes += minutesOf(task);
    if (task.start_at) group.scheduledCount += 1;
    if (!group.recipeId && task.recipe_title) group.title = task.recipe_title;
  }

  return order.map((key) => map.get(key)!);
}

export function TimelineBoard({
  partyId,
  timeZone,
  tasks,
  helpers,
  prepStartsAt,
  partyStartsAt,
  partyEndsAt,
}: {
  partyId: string;
  timeZone: string;
  tasks: TimelineTask[];
  helpers: TimelineHelper[];
  prepStartsAt: string | null;
  partyStartsAt: string;
  partyEndsAt: string | null;
}) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [flagTaskId, setFlagTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newHelper, setNewHelper] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [viewportWidth, setViewportWidth] = useState(960);
  const [viewHours, setViewHours] = useState<ViewHours>(VIEWPORT_HOURS);
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<number | null>(null);
  const didInitialScroll = useRef(false);
  const suppressClickRef = useRef(false);

  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, (state: TimelineTask[], move: Move) =>
    state.map((task) =>
      task.id === move.taskId
        ? {
            ...task,
            helper_id: "helperId" in move ? (move.helperId ?? null) : task.helper_id,
            start_at: "startAt" in move ? (move.startAt ?? null) : task.start_at,
          }
        : task,
    ),
  );

  const lanes = useMemo<Lane[]>(
    () =>
      [...helpers]
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((helper) => ({
          key: helper.id,
          helperId: helper.id,
          name: helper.name,
          color: helper.color,
        })),
    [helpers],
  );

  const fallbackHelperId = lanes[0]?.helperId ?? null;

  const partyStart = Date.parse(partyStartsAt);
  const partyEnd = partyEndsAt ? Date.parse(partyEndsAt) : partyStart + 3 * HOUR_MS;
  const prepStart = prepStartsAt ? Date.parse(prepStartsAt) : partyStart - 7 * DAY_MS;
  const scheduled = optimisticTasks.filter((task) => task.start_at);
  const unscheduled = optimisticTasks.filter((task) => !task.start_at);
  const recipeGroups = useMemo(() => groupTasksByRecipe(optimisticTasks), [optimisticTasks]);

  let timelineStart = prepStart;
  let timelineEnd = partyEnd;
  for (const task of scheduled) {
    const start = Date.parse(task.start_at!);
    timelineStart = Math.min(timelineStart, start);
    timelineEnd = Math.max(timelineEnd, start + minutesOf(task) * 60_000);
  }

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const update = () => setViewportWidth(Math.max(320, node.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const pxPerHour = viewportWidth / viewHours;

  const axis = useMemo(
    () =>
      buildAxis({
        start: timelineStart,
        end: timelineEnd + HOUR_MS,
        timeZone,
        pxPerHour,
      }),
    [timeZone, timelineStart, timelineEnd, pxPerHour],
  );

  const visibleByLane = useMemo(() => {
    const map = new Map<string, TimelineTask[]>();
    for (const lane of lanes) map.set(lane.key, []);
    for (const task of scheduled) {
      const key =
        task.helper_id && map.has(task.helper_id)
          ? task.helper_id
          : fallbackHelperId && map.has(fallbackHelperId)
            ? fallbackHelperId
            : null;
      if (!key) continue;
      map.get(key)!.push(task);
    }
    return map;
  }, [lanes, scheduled, fallbackHelperId]);

  const laneTotals = useMemo(() => {
    const map = new Map<string, { tasks: number; minutes: number; done: number }>();
    for (const lane of lanes) map.set(lane.key, { tasks: 0, minutes: 0, done: 0 });
    for (const task of optimisticTasks) {
      if (!task.helper_id || !map.has(task.helper_id)) continue;
      const totals = map.get(task.helper_id)!;
      totals.tasks += 1;
      totals.minutes += minutesOf(task);
      if (task.status === "done") totals.done += 1;
    }
    return map;
  }, [lanes, optimisticTasks]);

  const taskById = useMemo(
    () => new Map(optimisticTasks.map((task) => [task.id, task])),
    [optimisticTasks],
  );
  const activeTask = activeTaskId ? taskById.get(activeTaskId) : null;
  const selectedTask = selectedTaskId ? taskById.get(selectedTaskId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const tickMinutes = gridTickMinutes(viewHours);

  function run(action: () => Promise<{ error: string | null } | void>, move?: Move) {
    setError(null);
    startTransition(async () => {
      if (move) applyOptimistic(move);
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  function taskIdFromDrag(id: string | number) {
    const value = String(id);
    return value.startsWith("rail:") ? value.slice(5) : value;
  }

  /** Map the dragged bar's left edge into axis content coordinates (scroll-aware). */
  function contentXFromDrag(event: DragEndEvent) {
    const translated = event.active.rect.current.translated;
    const scroller = scrollRef.current;
    if (!translated || !scroller) return null;
    const bounds = scroller.getBoundingClientRect();
    return scroller.scrollLeft + (translated.left - bounds.left);
  }

  function startAtFromDrag(event: DragEndEvent, task: TimelineTask) {
    let contentX = contentXFromDrag(event);
    if (contentX == null) {
      const translated = event.active.rect.current.translated;
      if (translated && event.over) contentX = translated.left - event.over.rect.left;
    }
    if (contentX == null) return null;
    const durationMs = minutesOf(task) * 60_000;
    const snapped = snapToMinutes(axis.timeForX(contentX), SNAP_MINUTES);
    const latestStart = Math.max(axis.start, axis.end - durationMs);
    return new Date(Math.min(Math.max(snapped, axis.start), latestStart)).toISOString();
  }

  function handleDragStart(event: DragStartEvent) {
    suppressClickRef.current = true;
    setActiveTaskId(taskIdFromDrag(event.active.id));
    setFlagTaskId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    if (!over) return;

    const task = taskById.get(taskIdFromDrag(active.id));
    if (!task) return;

    if (over.id === "recipe-rail") {
      if (!task.start_at) return;
      setFlagTaskId(null);
      run(() => moveTask(partyId, task.id, { startAt: null }), { taskId: task.id, startAt: null });
      return;
    }

    const lane = over.data.current as { helperId: string } | undefined;
    if (!lane?.helperId) return;

    const startAt = startAtFromDrag(event, task);
    if (!startAt) return;

    const helperId = lane.helperId;
    if (
      helperId === task.helper_id &&
      task.start_at &&
      Date.parse(startAt) === Date.parse(task.start_at)
    ) {
      return;
    }

    setFlagTaskId(null);
    run(() => moveTask(partyId, task.id, { helperId, startAt }), {
      taskId: task.id,
      helperId,
      startAt,
    });
  }

  function openFlag(taskId: string) {
    if (suppressClickRef.current) return;
    setFlagTaskId((current) => (current === taskId ? null : taskId));
  }

  function openDetails(taskId: string) {
    setFlagTaskId(null);
    setSelectedTaskId(taskId);
  }

  function unscheduleTask(taskId: string) {
    setFlagTaskId(null);
    run(() => moveTask(partyId, taskId, { startAt: null }), { taskId, startAt: null });
  }

  const nowX = axis.xForTime(now);
  const showNow = now > axis.start && now < axis.end;
  const nowLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(now));
  const partyX = axis.xForTime(partyStart);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    if (scrollAnchorRef.current != null) {
      node.scrollLeft = Math.max(0, axis.xForTime(scrollAnchorRef.current) - node.clientWidth / 2);
      scrollAnchorRef.current = null;
      return;
    }

    if (!didInitialScroll.current && axis.totalWidth > node.clientWidth) {
      const target = now > axis.start && now < axis.end ? now : partyStart;
      node.scrollLeft = Math.max(0, axis.xForTime(target) - node.clientWidth * 0.7);
      didInitialScroll.current = true;
    }
  }, [axis, now, partyStart, viewHours]);

  function changeViewHours(hours: ViewHours) {
    const node = scrollRef.current;
    if (node) scrollAnchorRef.current = axis.timeForX(node.scrollLeft + node.clientWidth / 2);
    setViewHours(hours);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center rounded-full border border-ink/15 bg-paper p-0.5" aria-label="Visible time range">
          {VIEW_HOUR_OPTIONS.map((hours) => (
            <button
              key={hours}
              type="button"
              aria-pressed={viewHours === hours}
              onClick={() => changeViewHours(hours)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato/50 ${
                viewHours === hours ? "bg-ink text-paper" : "text-ink/45 hover:text-ink"
              }`}
            >
              {hours}h
            </button>
          ))}
        </div>
        {unscheduled.length ? (
          <button
            type="button"
            className="btn-secondary !min-h-0 !px-3 !py-2 text-[10px]"
            disabled={pending || lanes.length === 0}
            onClick={() => run(() => autoScheduleTimeline(partyId))}
          >
            <Sparkles size={13} /> Auto-place {unscheduled.length}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-[2px] border border-tomato/25 bg-tomato/5 px-3 py-2 text-xs font-semibold text-tomato">
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTaskId(null);
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <div className="editorial-panel grid h-[clamp(420px,58vh,680px)] grid-cols-[154px_minmax(0,1fr)] overflow-hidden md:grid-cols-[204px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-r border-ink/15 bg-[#f2ecdf]">
            <div className="flex h-14 items-end border-b border-ink/15 px-4 pb-2">
              <p className="eyebrow">Helpers</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {lanes.length === 0 ? (
                <div className="flex flex-1 items-center px-4">
                  <p className="text-xs leading-relaxed text-ink/45">
                    Add a helper to start placing tasks on the timeline.
                  </p>
                </div>
              ) : (
                lanes.map((lane) => (
                  <LaneLabel
                    key={lane.key}
                    lane={lane}
                    totals={laneTotals.get(lane.key) ?? { tasks: 0, minutes: 0, done: 0 }}
                    pending={pending}
                    onRename={(name) => run(() => renameHelper(partyId, lane.helperId, name))}
                    onRemove={() => {
                      if (!window.confirm(`Remove ${lane.name}? Their tasks stay on the recipe rail until reassigned.`))
                        return;
                      run(() => removeHelper(partyId, lane.helperId));
                    }}
                  />
                ))
              )}
            </div>
            <form
              className="flex items-center gap-1.5 px-3 py-3"
              onSubmit={(event) => {
                event.preventDefault();
                const name = newHelper.trim();
                if (!name) return;
                setNewHelper("");
                run(() => addHelper(partyId, name));
              }}
            >
              <input
                className="field !px-2.5 !py-1.5 text-xs"
                placeholder="Add helper"
                value={newHelper}
                onChange={(event) => setNewHelper(event.target.value)}
              />
              <button
                type="submit"
                className="btn-icon !h-8 !w-8 shrink-0"
                aria-label="Add helper"
                disabled={pending}
              >
                <Plus size={15} />
              </button>
            </form>
          </div>

          <div ref={scrollRef} className="min-w-0 overflow-x-auto overflow-y-hidden [scrollbar-color:rgba(41,35,31,0.25)_transparent] [scrollbar-width:thin]">
            <div className="relative flex h-full flex-col" style={{ width: Math.max(axis.totalWidth, viewportWidth) }}>
              <div className="flex h-14 border-b border-ink/15">
                {axis.columns.map((column) => {
                  const isPartyHour = partyStart >= column.start && partyStart < column.end;
                  const subdivisions = tickMinutes < 60 ? Math.round(60 / tickMinutes) : 1;
                  return (
                    <div
                      key={column.start}
                      style={{ width: column.width }}
                      className={`relative flex shrink-0 flex-col justify-end border-r border-ink/10 px-1.5 pb-2 ${
                        isPartyHour ? "bg-tomato/10" : column.isWeekend ? "bg-ink/[0.03]" : ""
                      }`}
                    >
                      {column.sublabel ? (
                        <span className="truncate text-[9px] uppercase tracking-[0.08em] text-ink/40">
                          {column.sublabel}
                        </span>
                      ) : null}
                      <span
                        className={`truncate text-[11px] font-bold uppercase tracking-[0.08em] ${
                          isPartyHour ? "text-tomato" : "text-ink/70"
                        }`}
                      >
                        {column.label}
                      </span>
                      {subdivisions > 1 ? (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2">
                          {Array.from({ length: subdivisions - 1 }, (_, index) => (
                            <span
                              key={index}
                              className="absolute bottom-0 w-px bg-ink/20"
                              style={{ left: `${((index + 1) / subdivisions) * 100}%`, height: index % 2 === 1 && tickMinutes === 10 ? 8 : 5 }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col">
                {lanes.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center px-6">
                    <p className="text-sm text-ink/40">No helper lanes yet.</p>
                  </div>
                ) : (
                  lanes.map((lane) => (
                    <LaneTrack
                      key={lane.key}
                      lane={lane}
                      axis={axis}
                      tickMinutes={tickMinutes}
                      tasks={visibleByLane.get(lane.key) ?? []}
                      flagTaskId={flagTaskId}
                      onFlag={openFlag}
                      onDetails={openDetails}
                      onUnschedule={unscheduleTask}
                      onCloseFlag={() => setFlagTaskId(null)}
                      activeTaskId={activeTaskId}
                      timeZone={timeZone}
                    />
                  ))
                )}
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="absolute top-0 h-full border-l-2 border-dashed border-tomato/45"
                    style={{ left: partyX }}
                  />
                  {showNow ? (
                    <div className="absolute top-0 h-full border-l-2 border-olive" style={{ left: nowX }}>
                      <span className="absolute left-0 top-0 -translate-x-1/2 rounded-b bg-olive px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-paper">
                        Now · {nowLabel}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="h-[57px] shrink-0 border-t border-ink/10 bg-paper/70" aria-hidden="true" />
            </div>
          </div>
        </div>

        <RecipeTaskRail groups={recipeGroups} onDetails={openDetails} />

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div
              className="flex items-center gap-2 overflow-hidden rounded-full border px-3 shadow-card"
              style={{
                ...recipeStyle(activeTask),
                height: BAR_HEIGHT,
                width: activeTask.start_at
                  ? barWidthPx(axis, Date.parse(activeTask.start_at), minutesOf(activeTask))
                  : Math.max(48, (minutesOf(activeTask) / 60) * axis.pxPerHour),
              }}
            >
              <GripVertical size={13} className="shrink-0 opacity-60" />
              <span className="truncate text-xs font-bold">{activeTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetail
        task={selectedTask ?? null}
        lanes={lanes}
        partyId={partyId}
        timeZone={timeZone}
        onClose={() => setSelectedTaskId(null)}
        onAssign={(helperId) =>
          selectedTask
            ? run(() => moveTask(partyId, selectedTask.id, { helperId }), {
                taskId: selectedTask.id,
                helperId,
              })
            : undefined
        }
        onUnschedule={() =>
          selectedTask
            ? run(() => moveTask(partyId, selectedTask.id, { startAt: null }), {
                taskId: selectedTask.id,
                startAt: null,
              })
            : undefined
        }
        onDuration={(minutes) =>
          selectedTask ? run(() => setTaskDuration(partyId, selectedTask.id, minutes)) : undefined
        }
      />
    </div>
  );
}

function LaneLabel({
  lane,
  totals,
  pending,
  onRename,
  onRemove,
}: {
  lane: Lane;
  totals: { tasks: number; minutes: number; done: number };
  pending: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lane.name);
  const style = styleFor(lane.color);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== lane.name) onRename(name);
  }

  return (
    <div className="group flex min-h-0 flex-1 items-center gap-2.5 border-b border-ink/10 px-3">
      <span className={`h-8 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              commit();
            }}
          >
            <input
              autoFocus
              className="field !px-2 !py-1 text-xs"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDraft(lane.name);
                  setEditing(false);
                }
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            className="block max-w-full truncate text-left text-sm font-bold"
            onClick={() => {
              setDraft(lane.name);
              setEditing(true);
            }}
          >
            {lane.name}
          </button>
        )}
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-ink/45">
          {totals.tasks} task{totals.tasks === 1 ? "" : "s"} · {totals.minutes} min
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => onRemove()}
        aria-label={`Remove ${lane.name}`}
        className="shrink-0 text-ink/25 opacity-0 transition hover:text-tomato group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function LaneTrack({
  lane,
  axis,
  tickMinutes,
  tasks,
  flagTaskId,
  onFlag,
  onDetails,
  onUnschedule,
  onCloseFlag,
  activeTaskId,
  timeZone,
}: {
  lane: Lane;
  axis: ReturnType<typeof buildAxis>;
  tickMinutes: number;
  tasks: TimelineTask[];
  flagTaskId: string | null;
  onFlag: (id: string) => void;
  onDetails: (id: string) => void;
  onUnschedule: (id: string) => void;
  onCloseFlag: () => void;
  activeTaskId: string | null;
  timeZone: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane:${lane.key}`,
    data: { helperId: lane.helperId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-0 flex-1 border-b border-ink/10 transition-colors ${
        isOver ? styleFor(lane.color).soft : ""
      }`}
      style={{
        backgroundImage: laneGridBackground(axis.columnWidth, tickMinutes),
      }}
    >
      {tasks.map((task) => (
        <TaskBar
          key={task.id}
          task={task}
          axis={axis}
          onFlag={onFlag}
          dimmed={activeTaskId === task.id}
          flagged={flagTaskId === task.id}
          timeZone={timeZone}
          onDetails={() => onDetails(task.id)}
          onUnschedule={() => onUnschedule(task.id)}
          onCloseFlag={onCloseFlag}
        />
      ))}
    </div>
  );
}

function TaskBar({
  task,
  axis,
  onFlag,
  dimmed,
  flagged,
  timeZone,
  onDetails,
  onUnschedule,
  onCloseFlag,
}: {
  task: TimelineTask;
  axis: ReturnType<typeof buildAxis>;
  onFlag: (id: string) => void;
  dimmed: boolean;
  flagged: boolean;
  timeZone: string;
  onDetails: () => void;
  onUnschedule: () => void;
  onCloseFlag: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const nodeRef = useRef<HTMLButtonElement | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const start = Date.parse(task.start_at!);
  const left = axis.xForTime(start);
  const width = barWidthPx(axis, start, minutesOf(task));
  const done = task.status === "done";
  const color = recipeStyle(task);
  const compact = width < 88;

  function setRefs(node: HTMLButtonElement | null) {
    nodeRef.current = node;
    setNodeRef(node);
  }

  useLayoutEffect(() => {
    if (!flagged || !nodeRef.current) {
      setAnchor(null);
      return;
    }
    const rect = nodeRef.current.getBoundingClientRect();
    const openUp = rect.bottom + 220 > window.innerHeight;
    setAnchor({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      openUp,
    });
  }, [flagged, left, width]);

  return (
    <>
      <button
        ref={setRefs}
        type="button"
        {...listeners}
        {...attributes}
        onClick={() => onFlag(task.id)}
        className={`absolute flex touch-none items-center gap-1.5 overflow-hidden rounded-full border text-left transition ${
          compact ? "px-2" : "px-3"
        } ${dimmed || isDragging ? "opacity-30" : "hover:-translate-y-[calc(50%+1px)]"} ${
          flagged ? "ring-2 ring-ink/30 ring-offset-1 ring-offset-transparent" : ""
        }`}
        style={{
          left,
          width,
          height: BAR_HEIGHT,
          top: "50%",
          transform: "translateY(-50%)",
          background: done ? "rgba(113, 132, 87, 0.16)" : color.background,
          borderColor: done ? "rgba(113, 132, 87, 0.4)" : color.border,
          color: done ? "#29231f" : color.color,
          zIndex: flagged ? 5 : 1,
        }}
        title={`${task.title} · ${minutesOf(task)} min${task.recipe_title ? ` · ${task.recipe_title}` : ""}`}
      >
        {done ? <Check size={12} className="shrink-0" /> : null}
        {task.locked ? <Lock size={11} className="shrink-0 opacity-70" /> : null}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[11px] font-bold leading-tight ${done ? "line-through" : ""}`}>
            {task.title}
          </span>
          {!compact ? (
            <span className="block truncate text-[9px] uppercase tracking-[0.08em] opacity-70">
              {minutesOf(task)} min
              {task.steps.length ? ` · ${task.steps.length} step${task.steps.length === 1 ? "" : "s"}` : ""}
            </span>
          ) : null}
        </span>
      </button>
      {flagged && anchor ? (
        <TaskFlag
          task={task}
          anchor={anchor}
          timeZone={timeZone}
          onClose={onCloseFlag}
          onDetails={onDetails}
          onRemove={onUnschedule}
        />
      ) : null}
    </>
  );
}

function TaskFlag({
  task,
  anchor,
  timeZone,
  onClose,
  onDetails,
  onRemove,
}: {
  task: TimelineTask;
  anchor: { top: number; left: number; openUp: boolean };
  timeZone: string;
  onClose: () => void;
  onDetails: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const when = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(task.start_at!));

  if (!mounted) return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[90] w-[240px] -translate-x-1/2 rounded-[2px] border border-ink/20 bg-paper shadow-card"
      style={{
        top: anchor.top,
        left: Math.min(Math.max(anchor.left, 128), window.innerWidth - 128),
        transform: anchor.openUp ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
      role="dialog"
      aria-label={`${task.title} details`}
    >
      <div
        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-ink/20 bg-paper ${
          anchor.openUp
            ? "bottom-0 translate-y-1/2 border-b border-r"
            : "top-0 -translate-y-1/2 border-l border-t"
        }`}
      />
      <div className="relative space-y-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{task.title}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-ink/45">
              {when} · {minutesOf(task)} min
              {task.recipe_title ? ` · ${task.recipe_title}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-ink/35 hover:text-ink"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {task.steps.length ? (
          <ol className="max-h-[120px] space-y-1.5 overflow-y-auto border-t border-ink/10 pt-2">
            {task.steps.map((step, index) => (
              <li key={step.id} className="flex gap-2 text-xs leading-snug text-ink/70">
                <span className="shrink-0 font-bold tabular-nums text-ink/35">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{step.title}</span>
                  {step.duration_minutes ? (
                    <span className="ml-1.5 text-[10px] uppercase tracking-[0.08em] text-ink/40">
                      {step.duration_minutes}m
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="border-t border-ink/10 pt-2 text-xs leading-relaxed text-ink/55">
            {task.description || "No steps in this task."}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-ink/10 pt-2">
          <button type="button" className="chip hover:border-tomato/40 hover:text-tomato" onClick={onRemove}>
            <X size={12} /> Remove
          </button>
          <button type="button" className="chip hover:border-ink/40" onClick={onDetails}>
            Details
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RecipeTaskRail({
  groups,
  onDetails,
}: {
  groups: RecipeGroup[];
  onDetails: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "recipe-rail" });
  const remaining = groups.reduce((sum, group) => sum + (group.tasks.length - group.scheduledCount), 0);

  return (
    <div
      ref={setNodeRef}
      className={`editorial-panel p-4 transition-colors ${isOver ? "bg-paper-2 ring-1 ring-ink/15" : ""}`}
    >
      <p className="eyebrow">Recipes · {remaining} to place</p>

      {groups.length === 0 ? (
        <p className="mt-3 text-xs text-ink/45">No recipe tasks yet. Add dishes to the menu to populate this rail.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map((group) => (
            <RecipeProgressBar key={group.key} group={group} onDetails={onDetails} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeProgressBar({
  group,
  onDetails,
}: {
  group: RecipeGroup;
  onDetails: (id: string) => void;
}) {
  const placed = group.scheduledCount;
  const total = group.tasks.length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-bold">{group.title}</p>
        <p className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-ink/40">
          {placed}/{total} placed · {group.totalMinutes} min
        </p>
      </div>
      <div className="flex h-10 items-stretch gap-1.5">
        {group.tasks.map((task) => (
          <RecipeSegment key={task.id} task={task} onDetails={onDetails} />
        ))}
      </div>
    </div>
  );
}

function RecipeSegment({
  task,
  onDetails,
}: {
  task: TimelineTask;
  onDetails: (id: string) => void;
}) {
  const scheduled = Boolean(task.start_at);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `rail:${task.id}`,
    data: { taskId: task.id },
    disabled: scheduled,
  });
  const color = recipeStyle(task);
  const minutes = minutesOf(task);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(scheduled ? {} : { ...listeners, ...attributes })}
      onClick={() => onDetails(task.id)}
      disabled={scheduled}
      title={`${task.title} · ${minutes} min${scheduled ? " · on timeline" : ""}`}
      className={`flex min-w-[2.5rem] touch-none items-center overflow-hidden rounded-full border px-3 text-left transition ${
        scheduled
          ? "cursor-default border-ink/10 bg-[#d9d2c4] text-ink/40"
          : isDragging
            ? "opacity-30"
            : "hover:brightness-105"
      }`}
      style={{
        flex: `${minutes} 1 0`,
        background: scheduled ? undefined : color.background,
        borderColor: scheduled ? undefined : color.border,
        color: scheduled ? undefined : color.color,
      }}
    >
      <span
        className={`block w-full truncate text-[10px] font-bold leading-tight ${
          scheduled ? "line-through decoration-ink/35" : ""
        }`}
      >
        {task.title}
      </span>
    </button>
  );
}

function TaskDetail({
  task,
  lanes,
  partyId,
  timeZone,
  onClose,
  onAssign,
  onUnschedule,
  onDuration,
}: {
  task: TimelineTask | null;
  lanes: Lane[];
  partyId: string;
  timeZone: string;
  onClose: () => void;
  onAssign: (helperId: string | null) => void;
  onUnschedule: () => void;
  onDuration: (minutes: number) => void;
}) {
  if (!task) return null;

  const when = task.start_at
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      }).format(new Date(task.start_at))
    : "Not on timeline";

  return (
    <Modal open onClose={onClose} title={task.title}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{when}</span>
          <span className="chip">{minutesOf(task)} min</span>
          {task.recipe_title ? <span className="chip">{task.recipe_title}</span> : null}
          {task.steps.length ? (
            <span className="chip">
              {task.steps.length} step{task.steps.length === 1 ? "" : "s"}
            </span>
          ) : null}
          {task.difficulty ? <span className="chip">{task.difficulty}</span> : null}
        </div>

        {task.steps.length ? (
          <ol className="space-y-3 border-t border-ink/10 pt-4">
            {task.steps.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <span className="mt-0.5 font-editorial text-xl leading-none text-tomato">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-semibold">{step.title}</p>
                    {step.duration_minutes ? (
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/40">
                        {step.duration_minutes} min
                      </span>
                    ) : null}
                  </div>
                  {step.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-ink/55">{step.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-relaxed text-ink/60">
            {task.description || "No steps in this task yet."}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-semibold">Assigned to</span>
            <select
              className="field"
              value={task.helper_id ?? ""}
              onChange={(event) => onAssign(event.target.value || null)}
            >
              <option value="">No helper</option>
              {lanes.map((lane) => (
                <option key={lane.key} value={lane.helperId}>
                  {lane.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Duration (min)</span>
            <input
              key={task.id}
              className="field"
              type="number"
              min={5}
              step={5}
              defaultValue={minutesOf(task)}
              onBlur={(event) => {
                const minutes = Number(event.target.value);
                if (Number.isFinite(minutes) && minutes !== minutesOf(task)) onDuration(minutes);
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
          <TaskDoneToggle
            taskId={task.id}
            partyId={partyId}
            done={task.status === "done"}
            title={task.title}
            placement="inline"
          />
          <TaskLockToggle taskId={task.id} partyId={partyId} locked={task.locked} />
          {task.start_at ? (
            <button type="button" className="chip hover:text-tomato" onClick={onUnschedule}>
              <X size={13} /> Remove from timeline
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
