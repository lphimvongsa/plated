"use client";

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
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
  snapToMinutes,
  SNAP_MINUTES,
  VIEWPORT_HOURS,
} from "@/lib/timeline/scale";
import { Check, GripVertical, Lock, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";

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
  helperId: string | null;
  name: string;
  color: string;
};

type Move = { taskId: string; helperId?: string | null; startAt?: string | null };

const DEFAULT_MINUTES = 30;
const BAR_HEIGHT = 44;
/** Thin enough that short tasks stay proportional; still grabable. */
const MIN_BAR_WIDTH = 6;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const VIEW_OPTIONS = [3, 6, 12, 24] as const;
type ViewHours = (typeof VIEW_OPTIONS)[number];

const HELPER_STYLES: Record<string, { bar: string; dot: string; soft: string }> = {
  tomato: { bar: "border-tomato bg-tomato text-paper", dot: "bg-tomato", soft: "bg-tomato/10" },
  orange: { bar: "border-orange bg-orange text-paper", dot: "bg-orange", soft: "bg-orange/10" },
  olive: { bar: "border-olive bg-olive text-paper", dot: "bg-olive", soft: "bg-olive/10" },
  wine: { bar: "border-wine bg-wine text-paper", dot: "bg-wine", soft: "bg-wine/10" },
  gold: { bar: "border-gold bg-gold text-ink", dot: "bg-gold", soft: "bg-gold/12" },
  blush: { bar: "border-blush bg-blush text-ink", dot: "bg-blush", soft: "bg-blush/20" },
};

const UNASSIGNED_STYLE = {
  bar: "border-dashed border-ink/35 bg-paper-2 text-ink",
  dot: "bg-ink/25",
  soft: "bg-ink/5",
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

function styleFor(color: string | null) {
  if (!color) return UNASSIGNED_STYLE;
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
    () => [
      ...[...helpers]
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((helper) => ({
          key: helper.id,
          helperId: helper.id,
          name: helper.name,
          color: helper.color,
        })),
      { key: "unassigned", helperId: null, name: "Unassigned", color: "" },
    ],
    [helpers],
  );

  const partyStart = Date.parse(partyStartsAt);
  const partyEnd = partyEndsAt ? Date.parse(partyEndsAt) : partyStart + 3 * HOUR_MS;
  const prepStart = prepStartsAt ? Date.parse(prepStartsAt) : partyStart - 7 * DAY_MS;
  const scheduled = optimisticTasks.filter((task) => task.start_at);
  const unscheduled = optimisticTasks.filter((task) => !task.start_at);

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
      const key = task.helper_id && map.has(task.helper_id) ? task.helper_id : "unassigned";
      map.get(key)!.push(task);
    }
    return map;
  }, [lanes, scheduled]);

  const laneTotals = useMemo(() => {
    const map = new Map<string, { tasks: number; minutes: number; done: number }>();
    for (const lane of lanes) map.set(lane.key, { tasks: 0, minutes: 0, done: 0 });
    for (const task of optimisticTasks) {
      const key = task.helper_id && map.has(task.helper_id) ? task.helper_id : "unassigned";
      const totals = map.get(key)!;
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function run(action: () => Promise<{ error: string | null } | void>, move?: Move) {
    setError(null);
    startTransition(async () => {
      if (move) applyOptimistic(move);
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;

    const task = taskById.get(String(active.id));
    if (!task) return;

    if (over.id === "tray") {
      if (!task.start_at) return;
      run(() => moveTask(partyId, task.id, { startAt: null }), { taskId: task.id, startAt: null });
      return;
    }

    const lane = over.data.current as { helperId: string | null } | undefined;
    if (!lane) return;

    const rect = active.rect.current.translated;
    const durationMs = minutesOf(task) * 60_000;
    let startAt = task.start_at;

    if (rect) {
      const raw = axis.timeForX(rect.left - over.rect.left);
      const snapped = snapToMinutes(raw, SNAP_MINUTES);
      const latestStart = Math.max(axis.start, axis.end - durationMs);
      startAt = new Date(Math.min(Math.max(snapped, axis.start), latestStart)).toISOString();
    }

    const helperId = lane.helperId;
    if (helperId === (task.helper_id ?? null) && startAt === task.start_at) return;

    run(() => moveTask(partyId, task.id, { helperId, startAt }), {
      taskId: task.id,
      helperId,
      startAt,
    });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">
          Prep-to-party schedule · scroll horizontally
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-ink/15 bg-paper p-0.5" aria-label="Visible time range">
            {VIEW_OPTIONS.map((hours) => (
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
              disabled={pending}
              onClick={() => run(() => autoScheduleTimeline(partyId))}
            >
              <Sparkles size={13} /> Auto-place {unscheduled.length}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-[2px] border border-tomato/25 bg-tomato/5 px-3 py-2 text-xs font-semibold text-tomato">
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTaskId(null)}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <div className="editorial-panel grid h-[clamp(500px,68vh,760px)] grid-cols-[154px_minmax(0,1fr)] overflow-hidden md:grid-cols-[204px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-r border-ink/15 bg-[#f2ecdf]">
            <div className="flex h-14 items-end border-b border-ink/15 px-4 pb-2">
              <p className="eyebrow">Helpers</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
            {lanes.map((lane) => (
              <LaneLabel
                key={lane.key}
                lane={lane}
                totals={laneTotals.get(lane.key) ?? { tasks: 0, minutes: 0, done: 0 }}
                pending={pending}
                onRename={(name) => run(() => renameHelper(partyId, lane.helperId!, name))}
                onRemove={() => {
                  if (!window.confirm(`Remove ${lane.name}? Their tasks become unassigned.`)) return;
                  run(() => removeHelper(partyId, lane.helperId!));
                }}
              />
            ))}
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
                  return (
                    <div
                      key={column.start}
                      style={{ width: column.width }}
                      className={`flex shrink-0 flex-col justify-end border-r border-ink/10 px-1.5 pb-2 ${
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
                    </div>
                  );
                })}
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col">
                {lanes.map((lane) => (
                  <LaneTrack
                    key={lane.key}
                    lane={lane}
                    axis={axis}
                    tasks={visibleByLane.get(lane.key) ?? []}
                    onSelect={setSelectedTaskId}
                    activeTaskId={activeTaskId}
                  />
                ))}
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

        <UnscheduledTray tasks={unscheduled} lanes={lanes} onSelect={setSelectedTaskId} />

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div
              className="flex items-center gap-2 overflow-hidden rounded-[3px] border px-2 shadow-card"
              style={{
                ...recipeStyle(activeTask),
                height: BAR_HEIGHT,
                width: activeTask.start_at
                  ? barWidthPx(axis, Date.parse(activeTask.start_at), minutesOf(activeTask))
                  : Math.max(MIN_BAR_WIDTH, (minutesOf(activeTask) / 60) * axis.pxPerHour),
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
  const style = styleFor(lane.helperId ? lane.color : null);

  function commit() {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== lane.name) onRename(name);
  }

  return (
    <div
      className="group flex min-h-0 flex-1 items-center gap-2.5 border-b border-ink/10 px-3"
    >
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
            disabled={!lane.helperId}
            className="block max-w-full truncate text-left text-sm font-bold disabled:cursor-default"
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
      {lane.helperId ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => onRemove()}
          aria-label={`Remove ${lane.name}`}
          className="shrink-0 text-ink/25 opacity-0 transition hover:text-tomato group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

function LaneTrack({
  lane,
  axis,
  tasks,
  onSelect,
  activeTaskId,
}: {
  lane: Lane;
  axis: ReturnType<typeof buildAxis>;
  tasks: TimelineTask[];
  onSelect: (id: string) => void;
  activeTaskId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `lane:${lane.key}`,
    data: { helperId: lane.helperId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-0 flex-1 border-b border-ink/10 transition-colors ${
        isOver ? styleFor(lane.helperId ? lane.color : null).soft : ""
      }`}
      style={{
        backgroundImage: `repeating-linear-gradient(to right, rgba(41,35,31,0.09) 0 1px, transparent 1px ${axis.columnWidth}px)`,
      }}
    >
      {tasks.map((task) => (
        <TaskBar
          key={task.id}
          task={task}
          lane={lane}
          axis={axis}
          onSelect={onSelect}
          dimmed={activeTaskId === task.id}
        />
      ))}
    </div>
  );
}

function TaskBar({
  task,
  lane,
  axis,
  onSelect,
  dimmed,
}: {
  task: TimelineTask;
  lane: Lane;
  axis: ReturnType<typeof buildAxis>;
  onSelect: (id: string) => void;
  dimmed: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const start = Date.parse(task.start_at!);
  const left = axis.xForTime(start);
  const width = barWidthPx(axis, start, minutesOf(task));
  const done = task.status === "done";
  const color = recipeStyle(task);
  const compact = width < 88;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onSelect(task.id)}
      className={`absolute flex touch-none items-center gap-1.5 overflow-hidden rounded-[3px] border text-left transition ${
        compact ? "px-1" : "px-2"
      } ${dimmed || isDragging ? "opacity-30" : "hover:-translate-y-[calc(50%+1px)]"
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
            {task.recipe_title ? ` · ${task.recipe_title}` : ""}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function UnscheduledTray({
  tasks,
  lanes,
  onSelect,
}: {
  tasks: TimelineTask[];
  lanes: Lane[];
  onSelect: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });

  return (
    <div
      ref={setNodeRef}
      className={`editorial-panel p-4 transition-colors ${isOver ? "bg-paper-2" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">Unscheduled · {tasks.length}</p>
        <p className="text-[10px] uppercase tracking-[0.1em] text-ink/40">
          Drag onto a helper lane to schedule
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-ink/45">Everything has a slot. Drop a task here to unschedule it.</p>
        ) : null}
        {tasks.map((task) => (
          <TrayChip key={task.id} task={task} lanes={lanes} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function TrayChip({
  task,
  lanes,
  onSelect,
}: {
  task: TimelineTask;
  lanes: Lane[];
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const color = recipeStyle(task);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onSelect(task.id)}
      className={`flex max-w-[240px] touch-none items-center gap-2 rounded-[3px] border px-2.5 py-2 text-left ${
        isDragging ? "opacity-30" : "hover:-translate-y-px"
      }`}
      style={{ background: color.background, borderColor: color.border, color: color.color }}
    >
      <GripVertical size={12} className="shrink-0 opacity-60" />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-bold leading-tight">{task.title}</span>
        <span className="block truncate text-[9px] uppercase tracking-[0.08em] opacity-70">
          {minutesOf(task)} min
          {task.steps.length ? ` · ${task.steps.length} step${task.steps.length === 1 ? "" : "s"}` : ""}
          {task.recipe_title ? ` · ${task.recipe_title}` : ""}
        </span>
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
    : "Unscheduled";

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
              <option value="">Unassigned</option>
              {lanes
                .filter((lane) => lane.helperId)
                .map((lane) => (
                  <option key={lane.key} value={lane.helperId!}>
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
              <X size={13} /> Unschedule
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
