"use client";

import { rescheduleTask } from "@/lib/actions/parties";
import { formatMinutes } from "@/lib/rsvp";
import {
  HOUR_HEIGHT,
  SNAP_MINUTES,
  dateFromDayAndMinutes,
  dayKey,
  formatCompactDay,
  formatHourLabel,
  getScheduleBounds,
  minutesFromDayStart,
  pixelsToMinutes,
  resolveDurationMinutes,
  snapMinutes,
  taskBlockHeight,
} from "@/lib/timeline-layout";
import {
  DndContext,
  DragOverlay,
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
import { Check, Lock, Play } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { TaskDoneToggle, TaskLockToggle } from "./task-toggles";

const scheduleCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

export type TimelineBoardTask = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  duration_minutes: number | null;
  status: string;
  difficulty: string | null;
  assigned_name: string | null;
  locked: boolean;
  sort_order: number;
};

type DropGuide = {
  dayKey: string;
  top: number;
  height: number;
  label: string;
};

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function pointerClientY(event: DragMoveEvent | DragEndEvent): number | null {
  const activator = event.activatorEvent;
  if (!activator || !("clientY" in activator)) return null;
  return (activator as PointerEvent).clientY + event.delta.y;
}

function TaskBlockVisual({
  task,
  duration,
  height,
  compact,
  dragging,
  partyId,
}: {
  task: TimelineBoardTask;
  duration: number;
  height: number;
  compact?: boolean;
  dragging?: boolean;
  partyId?: string;
}) {
  const done = task.status === "done";
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border px-2.5 py-1.5 transition ${
        done ? "border-olive/25 bg-olive/10" : "border-tomato/25 bg-[#f8f2e8]"
      } ${dragging ? "shadow-paper ring-2 ring-tomato/35" : "shadow-card"}`}
      style={{ height }}
    >
      <div className="flex min-h-0 flex-1 items-start gap-2">
        {!compact && partyId ? (
          <TaskDoneToggle
            taskId={task.id}
            partyId={partyId}
            done={done}
            title={task.title}
            variant="inline"
          />
        ) : (
          <span
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
              done ? "bg-olive text-paper" : "bg-paper text-ink/35 ring-1 ring-ink/15"
            }`}
          >
            {done ? <Check size={12} /> : <Play size={11} />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-tomato">
            {formatMinutes(duration)}
            {task.locked ? " · locked" : ""}
          </p>
          <h4
            className={`truncate font-editorial text-base font-semibold leading-tight sm:text-lg ${
              done ? "text-ink/48 line-through" : ""
            }`}
          >
            {task.title}
          </h4>
          {height >= 52 ? (
            <p className="mt-0.5 truncate text-[11px] text-ink/50">{task.assigned_name || "Unassigned"}</p>
          ) : null}
        </div>
        {!compact && partyId && height >= 60 ? (
          <div className="flex shrink-0 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            {task.locked ? <Lock size={12} className="text-ink/35" /> : null}
            <TaskLockToggle taskId={task.id} partyId={partyId} locked={task.locked} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DraggableTask({
  task,
  partyId,
  top,
  height,
  duration,
  isSource,
}: {
  task: TimelineBoardTask;
  partyId: string;
  top: number;
  height: number;
  duration: number;
  isSource: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task, duration, height },
    disabled: task.locked,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        top,
        height,
        opacity: isDragging || isSource ? 0.22 : 1,
      }}
      className={`absolute inset-x-1 z-10 touch-none ${
        task.locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
      {...listeners}
      {...attributes}
    >
      <TaskBlockVisual task={task} duration={duration} height={height} partyId={partyId} />
    </div>
  );
}

function DayColumn({
  day,
  dayId,
  hours,
  startHour,
  gridHeight,
  tasks,
  partyId,
  activeId,
  guide,
  partyStart,
}: {
  day: Date;
  dayId: string;
  hours: number[];
  startHour: number;
  gridHeight: number;
  tasks: Array<{ task: TimelineBoardTask; top: number; height: number; duration: number }>;
  partyId: string;
  activeId: string | null;
  guide: DropGuide | null;
  partyStart: Date;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayId, data: { day, startHour } });
  const compact = formatCompactDay(day);
  const isPartyDay = dayKey(day) === dayKey(partyStart);
  const partyTop =
    isPartyDay && partyStart.getHours() >= startHour
      ? (minutesFromDayStart(partyStart, startHour) / 60) * HOUR_HEIGHT
      : null;

  return (
    <div className="min-w-[168px] flex-1" data-timeline-day={dayId}>
      <div
        className={`sticky top-0 z-20 border-b border-ink/10 px-2 py-3 text-center ${
          isPartyDay ? "bg-orange text-paper" : "bg-[#f8f2e8]"
        }`}
      >
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
            isPartyDay ? "text-paper/70" : "text-ink/45"
          }`}
        >
          {compact.weekday}
        </p>
        <p className="font-editorial text-2xl font-semibold leading-none">{compact.day}</p>
      </div>
      <div
        ref={setNodeRef}
        className={`relative border-r border-ink/8 transition ${isOver ? "bg-tomato/4" : "bg-paper/40"}`}
        style={{ height: gridHeight }}
      >
        {hours.map((hour) => (
          <div
            key={hour}
            className="pointer-events-none absolute inset-x-0 border-t border-ink/8"
            style={{ top: (hour - startHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          />
        ))}

        {partyTop != null ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-[5] border-t border-dashed border-orange"
            style={{ top: partyTop }}
          >
            <span className="absolute right-1 -top-2.5 rounded bg-orange px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-paper">
              Party
            </span>
          </div>
        ) : null}

        {guide && guide.dayKey === dayId ? (
          <div
            className="timeline-drop-silhouette pointer-events-none absolute inset-x-1 z-20 rounded-xl border-2 border-dashed border-tomato/75 bg-tomato/10"
            style={{ top: guide.top, height: guide.height }}
            aria-hidden
          >
            <span className="absolute left-2 top-1.5 text-[10px] font-bold uppercase tracking-wider text-tomato">
              {guide.label}
            </span>
          </div>
        ) : null}

        {tasks.map(({ task, top, height, duration }) => (
          <DraggableTask
            key={task.id}
            task={task}
            partyId={partyId}
            top={top}
            height={height}
            duration={duration}
            isSource={activeId === task.id}
          />
        ))}
      </div>
    </div>
  );
}

export function TimelineBoard({
  partyId,
  partyStartsAt,
  timezone,
  tasks: initialTasks,
}: {
  partyId: string;
  partyStartsAt: string;
  timezone: string;
  tasks: TimelineBoardTask[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [guide, setGuide] = useState<DropGuide | null>(null);
  const [overlayWidth, setOverlayWidth] = useState(180);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const bounds = useMemo(() => getScheduleBounds(tasks, partyStartsAt), [tasks, partyStartsAt]);
  const hours = useMemo(
    () => Array.from({ length: bounds.endHour - bounds.startHour }, (_, i) => bounds.startHour + i),
    [bounds.endHour, bounds.startHour],
  );
  const gridHeight = hours.length * HOUR_HEIGHT;
  const maxMinutes = hours.length * 60 - SNAP_MINUTES;

  useEffect(() => {
    if (!activeId) return;
    const column = document.querySelector<HTMLElement>("[data-timeline-day]");
    if (!column) return;
    setOverlayWidth(Math.max(140, column.getBoundingClientRect().width - 8));
  }, [activeId, bounds.days.length]);

  const tasksByDay = useMemo(() => {
    const map = new Map<
      string,
      Array<{ task: TimelineBoardTask; top: number; height: number; duration: number }>
    >();
    for (const day of bounds.days) map.set(dayKey(day), []);

    for (const task of tasks) {
      if (!task.start_at) continue;
      const start = new Date(task.start_at);
      const key = dayKey(start);
      const duration = resolveDurationMinutes(task.duration_minutes, task.title);
      const height = taskBlockHeight(duration);
      const minutes = minutesFromDayStart(start, bounds.startHour);
      const top = Math.max(0, (minutes / 60) * HOUR_HEIGHT);
      map.get(key)?.push({ task, top, height, duration });
    }
    return map;
  }, [tasks, bounds.days, bounds.startHour]);

  const activeTask = activeId ? (tasks.find((t) => t.id === activeId) ?? null) : null;
  const activeDuration = activeTask
    ? resolveDurationMinutes(activeTask.duration_minutes, activeTask.title)
    : 30;
  const activeHeight = activeTask ? taskBlockHeight(activeDuration) : 0;

  function resolveGuideFromEvent(event: DragMoveEvent | DragEndEvent): DropGuide | null {
    const over = event.over;
    if (!over) return null;
    const day = over.data.current?.day as Date | undefined;
    const startHour = over.data.current?.startHour as number | undefined;
    if (!day || startHour == null) return null;

    const clientY = pointerClientY(event);
    const yInColumn = clientY != null ? clientY - over.rect.top : over.rect.height / 2;
    const snapped = Math.max(0, Math.min(maxMinutes, snapMinutes(pixelsToMinutes(yInColumn))));
    const dropAt = dateFromDayAndMinutes(day, snapped, startHour);
    const duration =
      (event.active.data.current?.duration as number | undefined) ??
      resolveDurationMinutes(
        (event.active.data.current?.task as TimelineBoardTask | undefined)?.duration_minutes,
        (event.active.data.current?.task as TimelineBoardTask | undefined)?.title,
      );

    return {
      dayKey: String(over.id),
      top: (snapped / 60) * HOUR_HEIGHT,
      height: taskBlockHeight(duration),
      label: formatClock(dropAt),
    };
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setGuide(null);
  }

  function onDragMove(event: DragMoveEvent) {
    setGuide(resolveGuideFromEvent(event));
  }

  function onDragCancel() {
    setActiveId(null);
    setGuide(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const nextGuide = resolveGuideFromEvent(event);
    setGuide(null);
    setActiveId(null);

    if (!nextGuide || !event.over) return;
    const taskId = String(event.active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.locked) return;

    const day = event.over.data.current?.day as Date | undefined;
    const startHour = event.over.data.current?.startHour as number | undefined;
    if (!day || startHour == null) return;

    const minutes = (nextGuide.top / HOUR_HEIGHT) * 60;
    const dropAt = dateFromDayAndMinutes(day, minutes, startHour);
    const iso = dropAt.toISOString();
    if (task.start_at && Math.abs(new Date(task.start_at).getTime() - dropAt.getTime()) < 60_000) {
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, start_at: iso } : t)));
    startTransition(async () => {
      await rescheduleTask(taskId, partyId, iso);
    });
  }

  if (tasks.length === 0) {
    return (
      <article className="rounded-[1.5rem] border border-ink/10 bg-[#f8f2e8] p-5 shadow-card">
        <p className="font-editorial text-2xl font-semibold">No timeline tasks yet.</p>
        <p className="mt-2 text-sm text-ink/50">Tasks will show up here once the party plan is generated.</p>
      </article>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={scheduleCollision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-ink/10 bg-[#f8f2e8] shadow-card">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-4 py-3">
          <div>
            <p className="eyebrow">Schedule</p>
            <p className="mt-1 max-w-xl text-sm text-ink/55">
              Pick up a task and it scales to its timeline size. The dashed silhouette shows exactly where it will land.
            </p>
          </div>
          <p className="hidden shrink-0 text-xs font-semibold text-ink/40 sm:block">
            {timezone.replace(/_/g, " ")}
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max">
            <div className="sticky left-0 z-30 w-14 shrink-0 border-r border-ink/10 bg-[#f4f0e7]">
              <div className="h-[68px] border-b border-ink/10" />
              <div className="relative" style={{ height: gridHeight }}>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 flex justify-end pr-2"
                    style={{ top: (hour - bounds.startHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    <span className="-mt-2 text-[10px] font-bold uppercase tracking-wider text-ink/40">
                      {formatHourLabel(hour)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {bounds.days.map((day) => {
              const id = dayKey(day);
              return (
                <DayColumn
                  key={id}
                  day={day}
                  dayId={id}
                  hours={hours}
                  startHour={bounds.startHour}
                  gridHeight={gridHeight}
                  tasks={tasksByDay.get(id) ?? []}
                  partyId={partyId}
                  activeId={activeId}
                  guide={guide}
                  partyStart={bounds.partyStart}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div
            style={{ width: overlayWidth, height: activeHeight }}
            className="pointer-events-none origin-top-left"
          >
            <TaskBlockVisual
              task={activeTask}
              duration={activeDuration}
              height={activeHeight}
              compact
              dragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
