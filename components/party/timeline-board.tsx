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
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { TaskDoneToggle, TaskLockToggle } from "@/components/party/task-toggles";
import {
  addHelper,
  autoScheduleTimeline,
  moveTask,
  removeHelper,
  renameHelper,
  setTaskDuration,
  setHelperColor,
  setRecipeTimelineColor,
} from "@/lib/actions/timeline";
import {
  buildAxis,
  gridLabelMinutes,
  gridTickMinutes,
  snapToMinutes,
  SNAP_MINUTES,
  VIEWPORT_HOURS,
} from "@/lib/timeline/scale";
import { Check, ChevronDown, GripVertical, Lock, Minus, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ACCENT_COLOR_PALETTE } from "@/lib/party/themes";

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
  recipe_color: string | null;
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
type DragPreview = { task: TimelineTask; helperId: string; startAt: string };

const DEFAULT_MINUTES = 30;
const BAR_HEIGHT = 40;
/** Thin enough that short tasks stay proportional; still grabable. */
const MIN_BAR_WIDTH = 10;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const MIN_VIEW_HOURS = 1;
const MAX_VIEW_HOURS = 12;

type InspectorAnchor = { top: number; bottom: number; left: number; right: number; width: number; height: number };

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
  if (task.recipe_color && /^#[0-9a-f]{6}$/i.test(task.recipe_color)) {
    return { background: task.recipe_color, border: task.recipe_color, color: "#fffaf2" };
  }
  if (!task.recipe_id) return { background: "#e9e2d6", border: "#81786e", color: "#29231f" };
  let hash = 0;
  for (const character of task.recipe_id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return RECIPE_COLORS[hash % RECIPE_COLORS.length];
}

function styleFor(color: string) {
  return HELPER_STYLES[color] ?? HELPER_STYLES.tomato;
}

function helperColorHex(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const legacy: Record<string, string> = {
    tomato: "#C84A35", orange: "#E58262", olive: "#73806A", wine: "#7E3943", gold: "#D6A943", blush: "#B06C86",
  };
  return legacy[color] ?? "#C84A35";
}

function hexToRgba(color: string, alpha: number) {
  const hex = helperColorHex(color).replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [inspectorAnchor, setInspectorAnchor] = useState<InspectorAnchor | null>(null);
  const [newHelper, setNewHelper] = useState("");
  const [newHelperColor, setNewHelperColor] = useState(ACCENT_COLOR_PALETTE[0]);
  const [undoMove, setUndoMove] = useState<Move | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [viewportWidth, setViewportWidth] = useState(960);
  const [viewHours, setViewHours] = useState<number>(VIEWPORT_HOURS);
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<{ time: number; viewportX: number } | null>(null);
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

  function run(action: () => Promise<{ error: string | null } | void>, move?: Move, undo?: Move) {
    setError(null);
    startTransition(async () => {
      if (move) applyOptimistic(move);
      if (undo) setUndoMove(undo);
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  function runTaskMove(task: TimelineTask, patch: Omit<Move, "taskId">) {
    const move: Move = { taskId: task.id, ...patch };
    const undo: Move = { taskId: task.id };
    if ("helperId" in patch) undo.helperId = task.helper_id;
    if ("startAt" in patch) undo.startAt = task.start_at;
    const serverPatch: { helperId?: string | null; startAt?: string | null } = {};
    if ("helperId" in patch) serverPatch.helperId = patch.helperId;
    if ("startAt" in patch) serverPatch.startAt = patch.startAt;
    run(() => moveTask(partyId, task.id, serverPatch), move, undo);
  }

  function undoLastMove() {
    if (!undoMove) return;
    const task = taskById.get(undoMove.taskId);
    if (!task) return setUndoMove(null);
    const patch: { helperId?: string | null; startAt?: string | null } = {};
    if ("helperId" in undoMove) patch.helperId = undoMove.helperId;
    if ("startAt" in undoMove) patch.startAt = undoMove.startAt;
    const move = undoMove;
    setUndoMove(null);
    run(() => moveTask(partyId, move.taskId, patch), move);
  }

  function taskIdFromDrag(id: string | number) {
    const value = String(id);
    if (value.startsWith("rail:")) return value.slice(5);
    if (value.startsWith("helper-task:")) return value.slice("helper-task:".length);
    return value;
  }

  /** Map the dragged bar's left edge into axis content coordinates (scroll-aware). */
  function contentXFromDrag(event: DragEndEvent | DragMoveEvent) {
    const translated = event.active.rect.current.translated;
    const scroller = scrollRef.current;
    if (!translated || !scroller) return null;
    const bounds = scroller.getBoundingClientRect();
    return scroller.scrollLeft + (translated.left - bounds.left);
  }

  function startAtFromDrag(event: DragEndEvent | DragMoveEvent, task: TimelineTask) {
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
    setDragPreview(null);
  }

  function handleDragMove(event: DragMoveEvent) {
    const task = taskById.get(taskIdFromDrag(event.active.id));
    const target = event.over?.data.current as { helperId?: string; kind?: string } | undefined;
    if (!task || target?.kind !== "timeline" || !target.helperId) {
      setDragPreview(null);
      return;
    }
    const startAt = startAtFromDrag(event, task);
    if (!startAt) {
      setDragPreview(null);
      return;
    }
    setDragPreview({ task, helperId: target.helperId, startAt });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    setDragPreview(null);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    if (!over) return;

    const task = taskById.get(taskIdFromDrag(active.id));
    if (!task) return;

    if (over.id === "recipe-rail") {
        if (task.start_at) {
        // Pull a scheduled task off the timeline without losing who owns it.
        runTaskMove(task, { startAt: null });
      } else if (task.helper_id) {
        // An unscheduled delegated task can be dragged back to the recipe rail to unassign it.
        runTaskMove(task, { helperId: null });
      }
      return;
    }

    const target = over.data.current as { helperId?: string; kind?: "timeline" | "delegate" } | undefined;
    if (!target?.helperId) return;

    if (target.kind === "delegate") {
        // Reassigning through delegation keeps an existing timeline placement intact.
      runTaskMove(task, { helperId: target.helperId });
      return;
    }

    const startAt = startAtFromDrag(event, task);
    if (!startAt) return;

    const helperId = target.helperId;
    if (
      helperId === task.helper_id &&
      task.start_at &&
      Date.parse(startAt) === Date.parse(task.start_at)
    ) {
      return;
    }

    runTaskMove(task, { helperId, startAt });
  }

  function openInspector(taskId: string, element: HTMLElement) {
    if (suppressClickRef.current) return;
    const rect = element.getBoundingClientRect();
    setSelectedTaskId(taskId);
    setInspectorAnchor({
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
    });
  }

  function closeInspector() {
    setSelectedTaskId(null);
    setInspectorAnchor(null);
  }

  const nowX = axis.xForTime(now);
  const showNow = now > axis.start && now < axis.end;
  const nowLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(now));
  const partyX = axis.xForTime(partyStart);
  const partyLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(partyStart));

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    if (scrollAnchorRef.current != null) {
      const anchor = scrollAnchorRef.current;
      node.scrollLeft = Math.max(0, axis.xForTime(anchor.time) - anchor.viewportX);
      scrollAnchorRef.current = null;
      return;
    }

    if (!didInitialScroll.current && axis.totalWidth > node.clientWidth) {
      const target = now > axis.start && now < axis.end ? now : partyStart;
      node.scrollLeft = Math.max(0, axis.xForTime(target) - node.clientWidth * 0.7);
      didInitialScroll.current = true;
    }
  }, [axis, now, partyStart, viewHours]);

  function changeZoom(hours: number, viewportX?: number) {
    const next = Math.min(MAX_VIEW_HOURS, Math.max(MIN_VIEW_HOURS, hours));
    const node = scrollRef.current;
    if (node) {
      const x = viewportX ?? node.clientWidth / 2;
      scrollAnchorRef.current = {
        time: axis.timeForX(node.scrollLeft + x),
        viewportX: x,
      };
    }
    setViewHours(next);
    closeInspector();
  }

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const handlePinchWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const viewportX = Math.min(node.clientWidth, Math.max(0, event.clientX - rect.left));
      scrollAnchorRef.current = {
        time: axis.timeForX(node.scrollLeft + viewportX),
        viewportX,
      };
      const factor = Math.exp(event.deltaY * 0.003);
      setViewHours((current) => Math.min(MAX_VIEW_HOURS, Math.max(MIN_VIEW_HOURS, current * factor)));
      closeInspector();
    };
    node.addEventListener("wheel", handlePinchWheel, { passive: false });
    return () => node.removeEventListener("wheel", handlePinchWheel);
  }, [axis]);


  function jumpToNow() {
    const node = scrollRef.current;
    if (!node) return;
    const targetX = axis.xForTime(Date.now());
    node.scrollTo({
      left: Math.max(0, Math.min(axis.totalWidth - node.clientWidth, targetX - node.clientWidth / 2)),
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {undoMove ? (
          <button
            type="button"
            className="btn-secondary !min-h-0 !px-3 !py-2 text-[10px]"
            disabled={pending}
            onClick={undoLastMove}
          >
            <RotateCcw size={13} /> Undo
          </button>
        ) : null}
        <button
          type="button"
          className="btn-secondary !min-h-0 !px-3 !py-2 text-[10px]"
          onClick={jumpToNow}
          title={showNow ? `Current time: ${nowLabel}` : `Jump toward current time (${nowLabel})`}
        >
          Jump to now
        </button>
        <div className="flex items-center gap-1 rounded-full border border-ink/15 bg-paper p-0.5" aria-label="Timeline zoom">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-full text-ink/55 transition hover:bg-ink/5 hover:text-ink disabled:opacity-30"
            disabled={viewHours >= MAX_VIEW_HOURS - 0.01}
            onClick={() => changeZoom(viewHours * 1.35)}
            title="Zoom out"
            aria-label="Zoom out timeline"
          >
            <Minus size={13} />
          </button>
          <span className="min-w-[58px] text-center text-[9px] font-bold uppercase tracking-[0.08em] text-ink/40">
            {viewHours.toFixed(viewHours < 3 ? 1 : 0)}h view
          </span>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-full text-ink/55 transition hover:bg-ink/5 hover:text-ink disabled:opacity-30"
            disabled={viewHours <= MIN_VIEW_HOURS + 0.01}
            onClick={() => changeZoom(viewHours / 1.35)}
            title="Zoom in"
            aria-label="Zoom in timeline"
          >
            <Plus size={13} />
          </button>
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
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTaskId(null);
          setDragPreview(null);
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <div className="timeline-shell editorial-panel grid h-[clamp(380px,56vh,680px)] grid-cols-[112px_minmax(0,1fr)] overflow-hidden sm:grid-cols-[154px_minmax(0,1fr)] md:grid-cols-[204px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-r border-ink/15 bg-paper-2">
            <div className="flex h-16 items-end border-b border-ink/15 px-3 pb-2 sm:px-4">
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
                    onColor={(color) => run(() => setHelperColor(partyId, lane.helperId, color))}
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
                run(() => addHelper(partyId, name, newHelperColor));
              }}
            >
              <input
                className="field !px-2.5 !py-1.5 text-xs"
                placeholder="Add helper"
                value={newHelper}
                onChange={(event) => setNewHelper(event.target.value)}
              />
              <ColorDotPicker
                color={newHelperColor}
                label="Choose new helper color"
                onChange={setNewHelperColor}
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

          <div ref={scrollRef} onScroll={() => inspectorAnchor ? closeInspector() : undefined} className="min-w-0 overflow-x-auto overflow-y-hidden [scrollbar-color:rgb(var(--ink-rgb)/0.25)_transparent] [scrollbar-width:thin]">
            <div className="relative flex h-full flex-col" style={{ width: Math.max(axis.totalWidth, viewportWidth) }}>
              <div className="relative h-16 shrink-0 border-b border-ink/15 bg-paper-2/35" aria-label="Timeline ruler">
                {axis.columns.map((column, columnIndex) => {
                  const isPartyHour = partyStart >= column.start && partyStart < column.end;
                  const labelMinutes = gridLabelMinutes(viewHours);
                  const tickStep = gridTickMinutes(viewHours);
                  const tickCount = Math.floor(60 / tickStep);
                  return (
                    <div key={column.start}>
                      <span
                        className={`pointer-events-none absolute inset-y-0 border-r border-ink/15 ${isPartyHour ? "bg-tomato/[0.07]" : column.isWeekend ? "bg-ink/[0.025]" : ""}`}
                        style={{ left: column.x, width: column.width }}
                      />
                      <span
                        className="pointer-events-none absolute bottom-0 z-[2] h-3 w-px bg-ink/35"
                        style={{ left: column.x }}
                      />
                      <span
                        className={`pointer-events-none absolute bottom-[18px] z-[2] -translate-x-1/2 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.06em] ${isPartyHour ? "text-tomato" : "text-ink/70"}`}
                        style={{ left: column.x }}
                      >
                        {column.label}
                      </span>
                      {column.sublabel ? (
                        <span className="pointer-events-none absolute top-2 z-[2] whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-ink/35" style={{ left: column.x + 7 }}>
                          {column.sublabel}
                        </span>
                      ) : null}
                      {tickCount > 1 ? Array.from({ length: tickCount - 1 }, (_, index) => {
                        const minute = (index + 1) * tickStep;
                        const x = column.x + column.width * (minute / 60);
                        const showLabel = labelMinutes < 60 && minute % labelMinutes === 0;
                        return (
                          <span key={`${column.start}:${minute}`}>
                            <span className="pointer-events-none absolute bottom-0 z-[2] w-px bg-ink/22" style={{ left: x, height: showLabel ? 10 : 6 }} />
                            {showLabel ? (
                              <span className="pointer-events-none absolute bottom-[18px] z-[2] -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold tabular-nums text-ink/42" style={{ left: x }}>
                                :{String(minute).padStart(2, "0")}
                              </span>
                            ) : null}
                          </span>
                        );
                      }) : null}
                      {columnIndex === axis.columns.length - 1 ? (
                        <span className="pointer-events-none absolute inset-y-0 z-[2] w-px bg-ink/20" style={{ left: column.x + column.width }} />
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
                      onInspect={openInspector}
                      activeTaskId={activeTaskId}
                      preview={dragPreview?.helperId === lane.helperId ? dragPreview : null}
                    />
                  ))
                )}
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="absolute top-0 h-full border-l-2 border-dashed border-tomato/55"
                    style={{ left: partyX }}
                  >
                    <span className="absolute bottom-0 left-0 -translate-x-1/2 rounded-t bg-tomato px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-paper">
                      Dinner · {partyLabel}
                    </span>
                  </div>
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

        <RecipeTaskRail groups={recipeGroups} lanes={lanes} onInspect={openInspector} onRecipeColor={(recipeId, color) => run(() => setRecipeTimelineColor(partyId, recipeId, color))} />

        <HelperDelegationBoard
          lanes={lanes}
          tasks={optimisticTasks}
          onInspect={openInspector}
          onHelperColor={(helperId, color) => run(() => setHelperColor(partyId, helperId, color))}
          onRecipeColor={(recipeId, color) => run(() => setRecipeTimelineColor(partyId, recipeId, color))}
        />

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

      <TaskInspector
        task={selectedTask ?? null}
        anchor={inspectorAnchor}
        lanes={lanes}
        partyId={partyId}
        timeZone={timeZone}
        onClose={closeInspector}
        onAssign={(helperId) => selectedTask ? runTaskMove(selectedTask, { helperId }) : undefined}
        onUnschedule={() => selectedTask ? runTaskMove(selectedTask, { startAt: null }) : undefined}
        onUnassign={() => selectedTask ? runTaskMove(selectedTask, { helperId: null }) : undefined}
        onDuration={(minutes) => selectedTask ? run(() => setTaskDuration(partyId, selectedTask.id, minutes)) : undefined}
      />
    </div>
  );
}

function ColorDotPicker({
  color,
  label,
  onChange,
}: {
  color: string;
  label: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hex = helperColorHex(color);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="grid h-6 w-6 place-items-center rounded-full border border-transparent transition duration-150 hover:-translate-y-0.5 hover:border-ink/20 hover:bg-paper hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
      >
        <span
          className="h-3.5 w-3.5 rounded-full border border-transparent transition group-hover:border-ink/20"
          style={{ backgroundColor: hex, boxShadow: "0 0 0 1px rgba(41,35,31,.12)" }}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-7 z-50 w-44 rounded-[3px] border border-ink/15 bg-paper p-2.5 shadow-card"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">Choose color</p>
          <div className="grid grid-cols-6 gap-1.5">
            {ACCENT_COLOR_PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Use ${swatch}`}
                onClick={() => {
                  onChange(swatch);
                  setOpen(false);
                }}
                className={`h-5 w-5 rounded-full border-2 transition hover:-translate-y-0.5 ${swatch.toLowerCase() === hex.toLowerCase() ? "border-ink" : "border-paper"}`}
                style={{ backgroundColor: swatch, boxShadow: "0 0 0 1px rgba(41,35,31,.12)" }}
              />
            ))}
          </div>
          <label className="mt-2 flex items-center justify-between gap-2 border-t border-ink/10 pt-2 text-[10px] font-semibold text-ink/55">
            Custom
            <input
              type="color"
              value={hex}
              onChange={(event) => onChange(event.target.value)}
              className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function LaneLabel({
  lane,
  totals,
  pending,
  onRename,
  onColor,
  onRemove,
}: {
  lane: Lane;
  totals: { tasks: number; minutes: number; done: number };
  pending: boolean;
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lane.name);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== lane.name) onRename(name);
  }

  return (
    <div className="group flex min-h-0 flex-1 items-center gap-1 border-b border-ink/10 px-2 sm:gap-1.5 sm:px-3">
      <ColorDotPicker color={lane.color} label={`Change ${lane.name} color`} onChange={onColor} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={(event) => { event.preventDefault(); commit(); }}>
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
            className="block max-w-full truncate text-left text-xs font-bold sm:text-sm"
            onClick={() => { setDraft(lane.name); setEditing(true); }}
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
        onClick={onRemove}
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
  onInspect,
  activeTaskId,
  preview,
}: {
  lane: Lane;
  axis: ReturnType<typeof buildAxis>;
  tickMinutes: number;
  tasks: TimelineTask[];
  onInspect: (id: string, element: HTMLElement) => void;
  activeTaskId: string | null;
  preview: DragPreview | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane:${lane.key}`,
    data: { helperId: lane.helperId, kind: "timeline" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-0 flex-1 border-b border-ink/10 transition-colors ${
        isOver ? styleFor(lane.color).soft : ""
      }`}
      style={{ backgroundImage: laneGridBackground(axis.columnWidth, tickMinutes) }}
    >
      {preview ? (
        <div
          className="pointer-events-none absolute top-1/2 z-[2] -translate-y-1/2 rounded-full border-2 border-dashed border-ink/45 bg-paper/55 shadow-[0_8px_20px_rgba(41,35,31,0.14)]"
          style={{
            left: axis.xForTime(Date.parse(preview.startAt)),
            width: barWidthPx(axis, Date.parse(preview.startAt), minutesOf(preview.task)),
            height: BAR_HEIGHT,
          }}
        >
          <div className="h-full w-full rounded-full opacity-25" style={{ background: recipeStyle(preview.task).background }} />
        </div>
      ) : null}
      {tasks.map((task) => (
        <TaskBar
          key={task.id}
          task={task}
          axis={axis}
          onInspect={onInspect}
          dimmed={activeTaskId === task.id}
          helperColor={helperColorHex(lane.color)}
        />
      ))}
    </div>
  );
}

function TaskBar({
  task,
  axis,
  onInspect,
  dimmed,
  helperColor,
}: {
  task: TimelineTask;
  axis: ReturnType<typeof buildAxis>;
  onInspect: (id: string, element: HTMLElement) => void;
  dimmed: boolean;
  helperColor: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const start = Date.parse(task.start_at!);
  const left = axis.xForTime(start);
  const width = barWidthPx(axis, start, minutesOf(task));
  const done = task.status === "done";
  const color = recipeStyle(task);
  const compact = width < 100;

  function setRefs(node: HTMLDivElement | null) {
    nodeRef.current = node;
    setNodeRef(node);
  }

  return (
    <div
      ref={setRefs}
      className={`group absolute flex touch-none items-stretch overflow-hidden rounded-full border transition duration-150 ${
        dimmed || isDragging ? "opacity-25" : "hover:brightness-[1.04] hover:shadow-[0_7px_16px_rgba(41,35,31,0.16)]"
      }`}
      style={{
        left,
        width,
        height: BAR_HEIGHT,
        top: "50%",
        transform: "translateY(-50%)",
        background: done ? "rgba(113, 132, 87, 0.16)" : color.background,
        borderColor: helperColor,
        borderWidth: 3,
        color: done ? "#29231f" : color.color,
        zIndex: 1,
      }}
      title={`${task.title} · ${minutesOf(task)} min${task.recipe_title ? ` · ${task.recipe_title}` : ""}`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        onClick={(event) => onInspect(task.id, nodeRef.current ?? event.currentTarget)}
        className={`flex min-w-0 flex-1 items-center gap-1.5 text-left ${compact ? "px-2" : "px-3"}`}
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
    </div>
  );
}


function HelperDelegationBoard({
  lanes,
  tasks,
  onInspect,
  onHelperColor,
  onRecipeColor,
}: {
  lanes: Lane[];
  tasks: TimelineTask[];
  onInspect: (id: string, element: HTMLElement) => void;
  onHelperColor: (helperId: string, color: string) => void;
  onRecipeColor: (recipeId: string, color: string) => void;
}) {
  const delegated = tasks.filter((task) => task.helper_id).length;
  const unassigned = tasks.length - delegated;

  return (
    <section className="editorial-panel p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Delegate</p>
          <p className="mt-1 text-xs text-ink/45">
            Drop tasks onto a helper. Recipe groups stay in execution order, and scheduled tasks remain shaded.
          </p>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/40">
          {delegated} delegated · {unassigned} unassigned
        </p>
      </div>

      {lanes.length === 0 ? (
        <p className="mt-4 text-sm text-ink/45">Add a helper above to create delegation lanes.</p>
      ) : (
        <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
          {lanes.map((lane) => (
            <HelperDropZone
              key={lane.helperId}
              lane={lane}
              tasks={tasks.filter((task) => task.helper_id === lane.helperId)}
              onInspect={onInspect}
              onHelperColor={(color) => onHelperColor(lane.helperId, color)}
              onRecipeColor={onRecipeColor}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HelperDropZone({
  lane,
  tasks,
  onInspect,
  onHelperColor,
  onRecipeColor,
}: {
  lane: Lane;
  tasks: TimelineTask[];
  onInspect: (id: string, element: HTMLElement) => void;
  onHelperColor: (color: string) => void;
  onRecipeColor: (recipeId: string, color: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: `delegate:${lane.helperId}`,
    data: { helperId: lane.helperId, kind: "delegate" },
  });
  const groups = groupTasksByRecipe(tasks);
  const helperColor = helperColorHex(lane.color);

  return (
    <div
      ref={setNodeRef}
      className={`border-l-4 transition duration-150 ${isOver ? "ring-1 ring-inset ring-ink/15" : ""}`}
      style={{
        backgroundColor: hexToRgba(helperColor, isOver ? 0.15 : 0.075),
        borderLeftColor: hexToRgba(helperColor, 0.7),
      }}
    >
      <div className="flex min-h-14 items-center gap-2 px-2 py-2.5">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/45 transition hover:bg-ink/5 hover:text-ink"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${lane.name}`}
        >
          <ChevronDown size={15} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        <ColorDotPicker color={lane.color} label={`Change ${lane.name} color`} onChange={onHelperColor} />
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{lane.name}</p>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/35">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </span>
      </div>

      {!collapsed ? (
        <div className="space-y-1.5 pb-3 pl-3 pr-2 sm:pl-12">
          {groups.length ? groups.map((group) => (
            <div
              key={group.key}
              className="grid min-w-0 grid-cols-1 gap-2 rounded-[3px] border px-2 py-2 sm:grid-cols-[minmax(130px,190px)_minmax(0,1fr)] sm:items-center sm:gap-3"
              style={{
                backgroundColor: hexToRgba(group.tasks[0]?.recipe_color ?? recipeStyle(group.tasks[0]).background, 0.09),
                borderColor: hexToRgba(group.tasks[0]?.recipe_color ?? recipeStyle(group.tasks[0]).background, 0.16),
              }}
            >
              <div className="flex min-w-0 items-center gap-1">
                {group.recipeId ? (
                  <ColorDotPicker
                    color={group.tasks[0]?.recipe_color ?? recipeStyle(group.tasks[0]).background}
                    label={`Change ${group.title} color`}
                    onChange={(color) => onRecipeColor(group.recipeId!, color)}
                  />
                ) : (
                  <span className="h-6 w-6" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold">{group.title}</p>
                  <p className="text-[9px] uppercase tracking-[0.08em] text-ink/35">{group.totalMinutes} min</p>
                </div>
              </div>
              <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-color:rgb(var(--ink-rgb)/0.2)_transparent] [scrollbar-width:thin]">
                <div className="flex w-max min-w-full items-center gap-1.5">
                  {group.tasks.map((task) => (
                    <DelegatedTaskChip
                      key={task.id}
                      task={task}
                      helperColor={helperColor}
                      onInspect={onInspect}
                    />
                  ))}
                </div>
              </div>
            </div>
          )) : (
            <div className="grid min-h-12 place-items-center border border-dashed border-ink/15 px-3 text-center text-[11px] text-ink/35">
              Drop a task here
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DelegatedTaskChip({
  task,
  helperColor,
  onInspect,
}: {
  task: TimelineTask;
  helperColor: string;
  onInspect: (id: string, element: HTMLElement) => void;
}) {
  const scheduled = Boolean(task.start_at);
  const color = recipeStyle(task);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `helper-task:${task.id}`,
    data: { taskId: task.id },
  });
  const width = Math.max(68, minutesOf(task) * 7);

  return (
    <div
      ref={setNodeRef}
      className={`group flex h-9 shrink-0 items-center overflow-hidden rounded-full border-[3px] transition ${
        scheduled ? "bg-[#d9d2c4] text-ink/40" : isDragging ? "opacity-30" : "hover:-translate-y-0.5 hover:shadow-sm"
      }`}
      style={{
        width,
        background: scheduled ? undefined : color.background,
        borderColor: helperColor,
        color: scheduled ? undefined : color.color,
      }}
      title={`${task.title} · ${minutesOf(task)} min${scheduled ? " · scheduled" : " · delegated"}`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        onClick={(event) => onInspect(task.id, event.currentTarget)}
        className="flex min-w-0 flex-1 touch-none items-center px-2.5 py-2 text-left"
      >
        <span className={`truncate text-[10px] font-bold ${scheduled ? "line-through decoration-ink/30" : ""}`}>
          {task.title}
        </span>
      </button>
    </div>
  );
}

function RecipeTaskRail({
  groups,
  lanes,
  onInspect,
  onRecipeColor,
}: {
  groups: RecipeGroup[];
  lanes: Lane[];
  onInspect: (id: string, element: HTMLElement) => void;
  onRecipeColor: (recipeId: string, color: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "recipe-rail" });
  const remaining = groups.reduce((sum, group) => sum + (group.tasks.length - group.scheduledCount), 0);
  const helperColorById = new Map(lanes.map((lane) => [lane.helperId, helperColorHex(lane.color)]));

  return (
    <div ref={setNodeRef} className={`editorial-panel p-4 transition-colors ${isOver ? "bg-paper-2 ring-1 ring-ink/15" : ""}`}>
      <p className="eyebrow">Recipes · {remaining} to place</p>
      {groups.length === 0 ? (
        <p className="mt-3 text-xs text-ink/45">No recipe tasks yet. Add dishes to the menu to populate this rail.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map((group) => (
            <RecipeProgressBar
              key={group.key}
              group={group}
              helperColorById={helperColorById}
              onInspect={onInspect}
              onRecipeColor={onRecipeColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeProgressBar({
  group,
  helperColorById,
  onInspect,
  onRecipeColor,
}: {
  group: RecipeGroup;
  helperColorById: Map<string, string>;
  onInspect: (id: string, element: HTMLElement) => void;
  onRecipeColor: (recipeId: string, color: string) => void;
}) {
  const placed = group.scheduledCount;
  const total = group.tasks.length;
  const sample = group.tasks[0];

  const recipeColor = sample ? (sample.recipe_color ?? recipeStyle(sample).background) : "#81786e";

  return (
    <div
      className="space-y-1.5 rounded-[4px] border px-3 py-2.5"
      style={{
        backgroundColor: hexToRgba(recipeColor, 0.1),
        borderColor: hexToRgba(recipeColor, 0.2),
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          {group.recipeId && sample ? (
            <ColorDotPicker
              color={sample.recipe_color ?? recipeStyle(sample).background}
              label={`Change ${group.title} color`}
              onChange={(color) => onRecipeColor(group.recipeId!, color)}
            />
          ) : null}
          <p className="truncate text-sm font-bold">{group.title}</p>
        </div>
        <p className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-ink/40">
          {placed}/{total} placed · {group.totalMinutes} min
        </p>
      </div>
      <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-color:rgb(var(--ink-rgb)/0.2)_transparent] [scrollbar-width:thin]">
        <div className="flex h-10 w-max min-w-full items-stretch gap-1.5">
          {group.tasks.map((task) => (
            <RecipeSegment
              key={task.id}
              task={task}
              helperColor={task.helper_id ? helperColorById.get(task.helper_id) ?? null : null}
              onInspect={onInspect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RecipeSegment({
  task,
  helperColor,
  onInspect,
}: {
  task: TimelineTask;
  helperColor: string | null;
  onInspect: (id: string, element: HTMLElement) => void;
}) {
  const scheduled = Boolean(task.start_at);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `rail:${task.id}`,
    data: { taskId: task.id },
    disabled: scheduled,
  });
  const color = recipeStyle(task);
  const minutes = minutesOf(task);
  const width = Math.max(68, minutes * 7);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(scheduled ? {} : { ...listeners, ...attributes })}
      onClick={(event) => onInspect(task.id, event.currentTarget)}
      title={`${task.title} · ${minutes} min${scheduled ? " · on timeline" : ""}`}
      className={`flex shrink-0 touch-none items-center overflow-hidden rounded-full border-[3px] px-3 text-left transition ${
        scheduled
          ? "cursor-pointer bg-[#d9d2c4] text-ink/40 hover:-translate-y-0.5 hover:shadow-sm"
          : isDragging
            ? "opacity-30"
            : "hover:-translate-y-0.5 hover:brightness-105 hover:shadow-sm"
      }`}
      style={{
        width,
        background: scheduled ? undefined : color.background,
        borderColor: helperColor ?? color.border,
        color: scheduled ? undefined : color.color,
      }}
    >
      <span className={`block w-full truncate text-[10px] font-bold leading-tight ${scheduled ? "line-through decoration-ink/35" : ""}`}>
        {task.title}
      </span>
    </button>
  );
}

function TaskInspector({
  task,
  anchor,
  lanes,
  partyId,
  timeZone,
  onClose,
  onAssign,
  onUnschedule,
  onUnassign,
  onDuration,
}: {
  task: TimelineTask | null;
  anchor: InspectorAnchor | null;
  lanes: Lane[];
  partyId: string;
  timeZone: string;
  onClose: () => void;
  onAssign: (helperId: string | null) => void;
  onUnschedule: () => void;
  onUnassign: () => void;
  onDuration: (minutes: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!task || !anchor) return;
    function outside(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
    };
  }, [task, anchor, onClose]);

  if (!mounted || !task || !anchor) return null;

  const openUp = anchor.bottom + 360 > window.innerHeight && anchor.top > 360;
  const left = Math.min(Math.max(anchor.left + anchor.width / 2, 165), window.innerWidth - 165);
  const when = task.start_at
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      }).format(new Date(task.start_at))
    : "Not scheduled";

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[100] w-[min(310px,calc(100vw-24px))] -translate-x-1/2 rounded-[4px] border border-ink/20 bg-paper shadow-[0_18px_44px_rgba(41,35,31,.22)]"
      style={{
        top: openUp ? anchor.top - 9 : anchor.bottom + 9,
        left,
        transform: openUp ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
      role="dialog"
      aria-label={`${task.title} task controls`}
    >
      <div
        className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-ink/20 bg-paper ${
          openUp ? "bottom-0 translate-y-1/2 border-b border-r" : "top-0 -translate-y-1/2 border-l border-t"
        }`}
      />
      <div className="relative space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{task.title}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.09em] text-ink/40">
              {when} · {minutesOf(task)} min{task.recipe_title ? ` · ${task.recipe_title}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-ink/35 transition hover:text-ink" aria-label="Close task controls">
            <X size={14} />
          </button>
        </div>

        {task.steps.length ? (
          <ol className="max-h-28 space-y-1.5 overflow-y-auto border-t border-ink/10 pt-2.5">
            {task.steps.map((step, index) => (
              <li key={step.id} className="flex gap-2 text-[11px] leading-snug text-ink/65">
                <span className="shrink-0 font-bold tabular-nums text-ink/30">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0"><strong className="font-semibold text-ink">{step.title}</strong>{step.duration_minutes ? ` · ${step.duration_minutes}m` : ""}</span>
              </li>
            ))}
          </ol>
        ) : task.description ? (
          <p className="border-t border-ink/10 pt-2.5 text-xs leading-relaxed text-ink/55">{task.description}</p>
        ) : null}

        <div className="grid grid-cols-[1fr_92px] gap-2 border-t border-ink/10 pt-3">
          <label className="min-w-0">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-ink/40">Helper</span>
            <select
              className="field !px-2 !py-1.5 text-xs"
              value={task.helper_id ?? ""}
              onChange={(event) => onAssign(event.target.value || null)}
            >
              {!task.start_at ? <option value="">Unassigned</option> : null}
              {lanes.map((lane) => <option key={lane.helperId} value={lane.helperId}>{lane.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-ink/40">Minutes</span>
            <input
              key={`${task.id}:${task.duration_minutes}`}
              className="field !px-2 !py-1.5 text-xs"
              type="number"
              min={5}
              step={5}
              defaultValue={minutesOf(task)}
              onBlur={(event) => {
                const minutes = Number(event.target.value);
                if (Number.isFinite(minutes) && minutes >= 5 && minutes !== minutesOf(task)) onDuration(minutes);
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-2.5">
          <TaskDoneToggle taskId={task.id} partyId={partyId} done={task.status === "done"} title={task.title} placement="inline" />
          <TaskLockToggle taskId={task.id} partyId={partyId} locked={task.locked} />
          {task.start_at ? (
            <button type="button" className="chip hover:border-tomato/40 hover:text-tomato" onClick={onUnschedule}>
              Remove from timeline
            </button>
          ) : task.helper_id ? (
            <button type="button" className="chip hover:border-tomato/40 hover:text-tomato" onClick={onUnassign}>
              Unassign
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

