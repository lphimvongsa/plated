"use client";

import { Modal } from "@/components/modal";
import { TaskDoneToggle, TaskLockToggle } from "@/components/party/task-toggles";
import {
  addHelper,
  autoScheduleTimeline,
  moveTask,
  removeHelper,
  renameHelper,
  resetTimeline,
  setHelperColor,
  setRecipeTimelineColor,
  setTaskDuration,
  setTaskScalingMode,
} from "@/lib/actions/timeline";
import { usePartyAccess } from "@/lib/party/access-client";
import { Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { DurationScalingMode } from "@/lib/timeline/duration-scaling";

export type TimelineStep = { id: string; title: string; description: string | null; duration_minutes: number | null };
export type TimelineTask = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  duration_minutes: number | null;
  base_duration_minutes: number | null;
  duration_scaling_mode: DurationScalingMode | null;
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
export type TimelineHelper = { id: string; name: string; color: string; sort_order: number };

type DragPreview = { helperId: string; startMs: number; conflict: boolean };
type RecipeTab = { key: string; recipeId: string | null; title: string; color: string };

const SNAP = 5;
const ROW_PX = 16;
const VIEWPORT_HOURS = 4;
const LEAD_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;
const VIEWPORT_MS = VIEWPORT_HOURS * HOUR_MS;
const RECIPE_COLORS = ["#c95d3f", "#d58a32", "#718457", "#8c5361", "#397a78", "#78659a", "#b06c86", "#507399"];

function fmt(ms: number, zone: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone }).format(new Date(ms));
}
function day(ms: number, zone: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: zone }).format(new Date(ms));
}
function durationOf(task: TimelineTask) {
  return Math.max(1, task.duration_minutes ?? 30);
}
function hashColor(key: string) {
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return RECIPE_COLORS[hash % RECIPE_COLORS.length];
}
function recipeColor(task: TimelineTask) {
  if (task.recipe_color && /^#[0-9a-f]{6}$/i.test(task.recipe_color)) return task.recipe_color;
  return task.recipe_id ? hashColor(task.recipe_id) : "#81786e";
}
function readableText(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#fffaf2";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.67 ? "#29231f" : "#fffaf2";
}
function rgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(41,35,31,${alpha})`;
  return `rgba(${parseInt(value.slice(0, 2), 16)},${parseInt(value.slice(2, 4), 16)},${parseInt(value.slice(4, 6), 16)},${alpha})`;
}

export function TimelineBoard({
  partyId,
  timeZone,
  tasks,
  helpers,
  prepStartsAt: _prepStartsAt,
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
  const { canEdit } = usePartyAccess();
  const [local, setLocal] = useState(tasks);
  const [localHelpers, setLocalHelpers] = useState(helpers);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newHelper, setNewHelper] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const dragMoved = useRef(false);
  const timelineScrollRef = useRef<HTMLElement | null>(null);

  const partyStart = Date.parse(partyStartsAt);
  const parsedPartyEnd = partyEndsAt ? Date.parse(partyEndsAt) : Number.NaN;
  const partyEnd = Number.isFinite(parsedPartyEnd) && parsedPartyEnd >= partyStart ? parsedPartyEnd : partyStart;
  const axisStart = partyStart - LEAD_HOURS * HOUR_MS;
  const axisEnd = partyEnd + HOUR_MS;
  const rows = Math.ceil((axisEnd - axisStart) / (SNAP * 60_000));
  const height = rows * ROW_PX;
  const viewportRows = (VIEWPORT_HOURS * 60) / SNAP;
  const viewportHeight = viewportRows * ROW_PX;
  const scheduled = local.filter((task) => task.start_at && task.helper_id);
  const unscheduled = local.filter((task) => !task.start_at);
  const selectedTask = selectedTaskId ? local.find((task) => task.id === selectedTaskId) ?? null : null;
  const activeTask = dragId ? local.find((task) => task.id === dragId) ?? null : null;

  const recipeTabs = useMemo<RecipeTab[]>(() => {
    const seen = new Map<string, RecipeTab>();
    for (const task of [...local].sort((a, b) => a.sort_order - b.sort_order)) {
      const key = task.recipe_id ?? "other";
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          recipeId: task.recipe_id,
          title: task.recipe_title || "Other tasks",
          color: recipeColor(task),
        });
      }
    }
    return [...seen.values()];
  }, [local]);

  const filteredUnscheduled = filter === "all"
    ? unscheduled
    : unscheduled.filter((task) => (task.recipe_id ?? "other") === filter);

  useEffect(() => {
    const scroller = timelineScrollRef.current;
    if (!scroller) return;
    const initialStart = Math.max(axisStart, partyStart - VIEWPORT_MS);
    const y = ((initialStart - axisStart) / (SNAP * 60_000)) * ROW_PX;
    scroller.scrollTop = Math.max(0, y);
  }, [axisStart, partyStart]);

  const gridRows = useMemo(() => Array.from({ length: rows + 1 }, (_, index) => index), [rows]);
  const labelRows = useMemo(() => gridRows.filter((index) => index % 6 === 0), [gridRows]);

  function optimisticMove(taskId: string, helperId: string | null, startAt: string | null) {
    setLocal((current) => current.map((task) => task.id === taskId ? { ...task, helper_id: helperId, start_at: startAt } : task));
  }

  function hasConflict(taskId: string, helperId: string, startMs: number) {
    const task = local.find((candidate) => candidate.id === taskId);
    if (!task) return false;
    const endMs = startMs + durationOf(task) * 60_000;
    return local.some((other) => {
      if (other.id === taskId || other.helper_id !== helperId || !other.start_at) return false;
      const otherStart = Date.parse(other.start_at);
      const otherEnd = otherStart + durationOf(other) * 60_000;
      return startMs < otherEnd && endMs > otherStart;
    });
  }

  function commitMove(taskId: string, helperId: string | null, startAt: string | null) {
    const before = local.find((task) => task.id === taskId);
    if (!before) return;
    if (startAt && helperId && hasConflict(taskId, helperId, Date.parse(startAt))) {
      setError("That helper already has a task during this time. Tasks cannot overlap.");
      return;
    }
    optimisticMove(taskId, helperId, startAt);
    setError(null);
    startTransition(async () => {
      const result = await moveTask(partyId, taskId, { helperId, startAt });
      if (result?.error) {
        setError(result.error);
        optimisticMove(taskId, before.helper_id, before.start_at);
      }
    });
  }

  function previewFor(helperId: string, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!dragId || !canEdit) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawY = Math.max(0, Math.min(rect.height - ROW_PX, event.clientY - rect.top));
    const row = Math.max(0, Math.min(rows - 1, Math.round(rawY / ROW_PX)));
    const startMs = axisStart + row * SNAP * 60_000;
    const draggedTask = local.find((task) => task.id === dragId);
    if (!draggedTask) return;
    const durationMs = durationOf(draggedTask) * 60_000;
    const outside = startMs < axisStart || startMs + durationMs > axisEnd;
    setDragPreview({ helperId, startMs, conflict: outside || hasConflict(dragId, helperId, startMs) });
  }

  function dropOn(helperId: string, event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!dragId || !canEdit) return;
    const preview = dragPreview?.helperId === helperId ? dragPreview : null;
    if (!preview) return;
    if (preview.conflict) {
      setError("That placement would overlap another task or fall outside the available timeline.");
      setDragPreview(null);
      setDragId(null);
      return;
    }
    commitMove(dragId, helperId, new Date(preview.startMs).toISOString());
    setDragPreview(null);
    setDragId(null);
  }

  function reset() {
    if (!window.confirm("Clear every scheduled time? Helper assignments will be preserved.")) return;
    const prior = local;
    setLocal((current) => current.map((task) => ({ ...task, start_at: null })));
    startTransition(async () => {
      const result = await resetTimeline(partyId);
      if (result?.error) {
        setError(result.error);
        setLocal(prior);
      }
    });
  }

  function changeRecipeColor(recipeId: string, color: string) {
    setLocal((current) => current.map((task) => task.recipe_id === recipeId ? { ...task, recipe_color: color } : task));
    startTransition(async () => {
      const result = await setRecipeTimelineColor(partyId, recipeId, color);
      if (result?.error) setError(result.error);
    });
  }

  function changeHelperColor(helperId: string, color: string) {
    setLocalHelpers((current) => current.map((helper) => helper.id === helperId ? { ...helper, color } : helper));
    startTransition(async () => {
      const result = await setHelperColor(partyId, helperId, color);
      if (result?.error) setError(result.error);
    });
  }

  function updateDuration(task: TimelineTask, minutes: number) {
    const value = Math.max(1, Math.round(minutes));
    setLocal((current) => current.map((candidate) => candidate.id === task.id ? { ...candidate, duration_minutes: value, duration_scaling_mode: "manual" } : candidate));
    startTransition(async () => {
      const result = await setTaskDuration(partyId, task.id, value);
      if (result?.error) {
        setError(result.error);
        setLocal((current) => current.map((candidate) => candidate.id === task.id ? { ...candidate, duration_minutes: task.duration_minutes, duration_scaling_mode: task.duration_scaling_mode } : candidate));
      }
    });
  }

  function updateScalingMode(task: TimelineTask, mode: DurationScalingMode) {
    startTransition(async () => {
      const result = await setTaskScalingMode(partyId, task.id, mode);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      const nextMode = result.mode ?? mode;
      const nextDuration = result.durationMinutes ?? task.duration_minutes;
      setLocal((current) => current.map((candidate) => candidate.id === task.id ? {
        ...candidate,
        duration_scaling_mode: nextMode,
        duration_minutes: nextDuration,
      } : candidate));
    });
  }

  return (
    <div className="space-y-4">
      {error ? <div className="border border-tomato/25 bg-tomato/8 px-4 py-3 text-sm font-semibold text-tomato">{error}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink/50">Four hours are visible at once. Scroll from 24 hours before dinner through one hour after dinner ends; placement snaps to 5 minutes and conflicts are blocked.</p>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary !min-h-0 !px-3 !py-2 text-[10px]" disabled={pending || !unscheduled.length || !localHelpers.length} onClick={() => startTransition(async () => {
              const result = await autoScheduleTimeline(partyId);
              if (result?.error) setError(result.error);
              else window.location.reload();
            })}><Sparkles size={13}/> Auto place</button>
            <button className="btn-secondary !min-h-0 !px-3 !py-2 text-[10px]" disabled={pending || !scheduled.length} onClick={reset}><RotateCcw size={13}/> Reset timeline</button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card flex min-h-0 flex-col p-4">
          <div className="flex items-center justify-between">
            <div><p className="eyebrow">Unscheduled</p><h3 className="mt-1 font-editorial text-2xl font-semibold">Task pool</h3></div>
            <span className="chip">{unscheduled.length}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-b border-ink/10 pb-3">
            <button type="button" onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${filter === "all" ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper hover:border-ink/35"}`}>All</button>
            {recipeTabs.map((tab) => (
              <div key={tab.key} className={`flex items-center rounded-full border pr-1 transition ${filter === tab.key ? "border-ink" : "border-ink/15"}`} style={{ background: filter === tab.key ? rgba(tab.color, .13) : "transparent" }}>
                <button type="button" onClick={() => setFilter(tab.key)} className="flex min-w-0 items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-1 text-[10px] font-bold">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tab.color }}/>
                  <span className="max-w-[9rem] truncate">{tab.title}</span>
                </button>
                {canEdit && tab.recipeId ? (
                  <label className="relative grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full" title={`Change ${tab.title} color`}>
                    <span className="h-3 w-3 rounded-full border border-ink/20" style={{ background: tab.color }}/>
                    <input type="color" value={tab.color} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => changeRecipeColor(tab.recipeId!, event.target.value)} />
                  </label>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: viewportHeight + 44 }}>
            {filteredUnscheduled.length ? filteredUnscheduled.map((task) => (
              <TaskPoolCard
                key={task.id}
                task={task}
                color={recipeColor(task)}
                canEdit={canEdit}
                dragging={dragId === task.id}
                onInspect={() => setSelectedTaskId(task.id)}
                onDragStart={() => { dragMoved.current = true; setDragId(task.id); setDragPreview(null); }}
                onDragEnd={() => { window.setTimeout(() => { dragMoved.current = false; }, 0); setDragId(null); setDragPreview(null); }}
                onDuration={(minutes) => updateDuration(task, minutes)}
              />
            )) : <p className="py-8 text-center text-sm text-ink/40">No unscheduled tasks in this recipe.</p>}
          </div>
        </aside>

        <section ref={timelineScrollRef} className="min-w-0 overflow-auto border border-ink/15 bg-paper" style={{ height: viewportHeight + 54 }}>
          <div className="min-w-[760px]" style={{ width: `max(760px, ${120 + Math.max(1, localHelpers.length) * 260}px)` }}>
            <div className="sticky top-0 z-20 grid border-b border-ink/15 bg-paper-2" style={{ gridTemplateColumns: `120px repeat(${Math.max(1, localHelpers.length)}, minmax(240px,1fr))` }}>
              <div className="p-3 text-[10px] font-bold uppercase tracking-widest text-ink/40">Time</div>
              {localHelpers.length ? localHelpers.map((helper) => (
                <div key={helper.id} className="flex items-center justify-between border-l border-ink/10 p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {canEdit ? (
                      <label className="relative h-4 w-4 shrink-0 cursor-pointer rounded-full" title={`Change ${helper.name} color`}>
                        <span className="absolute inset-0 rounded-full border border-ink/15" style={{ background: helper.color }}/>
                        <input type="color" value={/^#[0-9a-f]{6}$/i.test(helper.color) ? helper.color : "#C84A35"} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => changeHelperColor(helper.id, event.target.value)} />
                      </label>
                    ) : <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: helper.color }}/>} 
                    <input className="min-w-0 flex-1 bg-transparent font-editorial text-xl font-semibold outline-none" defaultValue={helper.name} readOnly={!canEdit} onBlur={(event) => {
                      if (!canEdit || event.target.value.trim() === helper.name) return;
                      startTransition(async () => {
                        const result = await renameHelper(partyId, helper.id, event.target.value);
                        if (result?.error) setError(result.error);
                        else setLocalHelpers((current) => current.map((candidate) => candidate.id === helper.id ? { ...candidate, name: event.target.value.trim() } : candidate));
                      });
                    }}/>
                  </div>
                  {canEdit ? <button className="text-ink/30 hover:text-tomato" onClick={() => {
                    if (!window.confirm(`Remove ${helper.name}? Their scheduled tasks will return to the pool.`)) return;
                    startTransition(async () => {
                      const result = await removeHelper(partyId, helper.id);
                      if (result?.error) setError(result.error);
                      else window.location.reload();
                    });
                  }}><X size={14}/></button> : null}
                </div>
              )) : <div className="border-l border-ink/10 p-3 text-sm text-ink/40">Add a helper to start scheduling.</div>}
            </div>

            <div className="relative grid" style={{ height, gridTemplateColumns: `120px repeat(${Math.max(1, localHelpers.length)}, minmax(240px,1fr))` }}>
              <div className="relative z-10 border-r border-ink/15 bg-paper">
                {labelRows.map((row) => {
                  const ms = axisStart + row * SNAP * 60_000;
                  return <div key={row} className="absolute left-0 right-0 px-3 pt-1" style={{ top: row * ROW_PX }}><span className="text-[10px] font-bold text-ink/50">{fmt(ms, timeZone)}</span><span className="ml-2 text-[9px] text-ink/30">{day(ms, timeZone)}</span></div>;
                })}
              </div>

              {localHelpers.map((helper) => (
                <div
                  key={helper.id}
                  className="relative border-r border-ink/10"
                  onDragOver={(event) => previewFor(helper.id, event)}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragPreview(null); }}
                  onDrop={(event) => dropOn(helper.id, event)}
                >
                  {scheduled.filter((task) => task.helper_id === helper.id).map((task) => {
                    const start = Date.parse(task.start_at!);
                    const end = start + durationOf(task) * 60_000;
                    if (end <= axisStart || start >= axisEnd) return null;
                    const top = Math.max(0, ((start - axisStart) / (SNAP * 60_000)) * ROW_PX);
                    const visibleEnd = Math.min(end, axisEnd);
                    const taskHeight = Math.max(ROW_PX, ((visibleEnd - Math.max(start, axisStart)) / (SNAP * 60_000)) * ROW_PX);
                    const color = recipeColor(task);
                    return (
                      <button
                        type="button"
                        key={task.id}
                        draggable={canEdit && !task.locked}
                        onDragStart={() => { dragMoved.current = true; setDragId(task.id); setDragPreview(null); }}
                        onDragEnd={() => { window.setTimeout(() => { dragMoved.current = false; }, 0); setDragId(null); setDragPreview(null); }}
                        onClick={() => { if (!dragMoved.current) setSelectedTaskId(task.id); }}
                        className={`absolute left-2 right-2 z-[4] overflow-hidden rounded-lg border px-2 text-left shadow-sm transition hover:brightness-105 hover:shadow-card ${dragId === task.id ? "opacity-25" : ""}`}
                        style={{ top, height: taskHeight, minHeight: ROW_PX, background: color, borderColor: color, color: readableText(color) }}
                        title={task.title}
                      >
                        <span className="block truncate text-[10px] font-bold leading-none">{task.title}</span>
                      </button>
                    );
                  })}

                  {dragPreview?.helperId === helper.id && activeTask ? (() => {
                    const previewHeight = Math.max(ROW_PX, (durationOf(activeTask) / SNAP) * ROW_PX);
                    const color = dragPreview.conflict ? "#C84A35" : recipeColor(activeTask);
                    return <div className="pointer-events-none absolute left-2 right-2 z-[6] overflow-hidden rounded-lg border-2 border-dashed px-2" style={{ top: ((dragPreview.startMs - axisStart) / (SNAP * 60_000)) * ROW_PX, height: Math.min(previewHeight, height - ((dragPreview.startMs - axisStart) / (SNAP * 60_000)) * ROW_PX), background: rgba(color, .16), borderColor: color }}><span className="block truncate pt-1 text-[10px] font-bold" style={{ color }}>{activeTask.title}</span></div>;
                  })() : null}
                </div>
              ))}

              <div className="pointer-events-none absolute left-[120px] right-0 z-[8] border-t-2 border-tomato" style={{ top: ((partyStart - axisStart) / (SNAP * 60_000)) * ROW_PX }}><span className="absolute left-2 -top-5 bg-tomato px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-paper">Dinner · {fmt(partyStart, timeZone)}</span></div>
              <div className="pointer-events-none absolute left-[120px] right-0 z-[7] border-t border-dashed border-ink/25" style={{ top: ((partyEnd - axisStart) / (SNAP * 60_000)) * ROW_PX }}><span className="absolute right-2 -top-5 bg-paper px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-ink/45">Dinner ends · {fmt(partyEnd, timeZone)}</span></div>

              <div className="pointer-events-none absolute inset-y-0 left-[120px] right-0 z-[2]">
                {gridRows.map((row) => {
                  const isHour = row % 12 === 0;
                  const isQuarter = row % 3 === 0;
                  return <div key={row} className={`absolute left-0 right-0 border-t ${isHour ? "border-solid border-ink/18" : "border-dashed"}`} style={{ top: row * ROW_PX, borderColor: isHour ? undefined : isQuarter ? "rgba(41,35,31,.16)" : "rgba(41,35,31,.075)" }} />;
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {canEdit ? <form className="flex max-w-md gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (!newHelper.trim()) return;
        startTransition(async () => {
          const result = await addHelper(partyId, newHelper);
          if (result?.error) setError(result.error);
          else { setNewHelper(""); window.location.reload(); }
        });
      }}><input className="field" value={newHelper} onChange={(event) => setNewHelper(event.target.value)} placeholder="Add helper"/><button className="btn-secondary" disabled={pending}><Plus size={14}/> Add</button></form> : null}

      <TaskDetailsModal
        task={selectedTask}
        helpers={localHelpers}
        partyId={partyId}
        timeZone={timeZone}
        canEdit={canEdit}
        onClose={() => setSelectedTaskId(null)}
        onDuration={(minutes) => selectedTask && updateDuration(selectedTask, minutes)}
        onScalingMode={(mode) => selectedTask && updateScalingMode(selectedTask, mode)}
        onMove={(helperId, startAt) => selectedTask && commitMove(selectedTask.id, helperId, startAt)}
        onError={setError}
      />
    </div>
  );
}

function TaskPoolCard({
  task,
  color,
  canEdit,
  dragging,
  onInspect,
  onDragStart,
  onDragEnd,
  onDuration,
}: {
  task: TimelineTask;
  color: string;
  canEdit: boolean;
  dragging: boolean;
  onInspect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDuration: (minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState(task.duration_minutes ?? 30);
  return (
    <div draggable={canEdit && !task.locked} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onInspect} className={`cursor-pointer rounded-xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card ${dragging ? "opacity-30" : ""}`} style={{ background: rgba(color, .16), borderColor: rgba(color, .5) }}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }}/>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold">{task.title}</p>
          {task.recipe_title ? <p className="mt-1 truncate text-[10px] text-ink/45">{task.recipe_title}</p> : null}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <input type="number" min={1} step={1} className="field !min-h-0 !w-20 !py-1 text-xs" value={minutes} disabled={!canEdit} onChange={(event) => setMinutes(Math.max(1, Number(event.target.value) || 1))} onBlur={() => onDuration(minutes)}/>
        <span className="text-[10px] text-ink/40">minutes</span>
      </div>
    </div>
  );
}

function TaskDetailsModal({
  task,
  helpers,
  partyId,
  timeZone,
  canEdit,
  onClose,
  onDuration,
  onScalingMode,
  onMove,
  onError,
}: {
  task: TimelineTask | null;
  helpers: TimelineHelper[];
  partyId: string;
  timeZone: string;
  canEdit: boolean;
  onClose: () => void;
  onDuration: (minutes: number) => void;
  onScalingMode: (mode: DurationScalingMode) => void;
  onMove: (helperId: string | null, startAt: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const taskKey = task?.id ?? "none";

  // A keyed inner block below makes the input reset whenever a different task opens.
  return (
    <Modal open={Boolean(task)} onClose={onClose} title={task?.title || "Task details"} panelClassName="md:max-w-xl">
      {task ? <div key={taskKey} className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {task.recipe_title ? <span className="chip" style={{ borderColor: recipeColor(task), background: rgba(recipeColor(task), .12) }}><span className="h-2 w-2 rounded-full" style={{ background: recipeColor(task) }}/>{task.recipe_title}</span> : null}
          {task.difficulty ? <span className="chip">{task.difficulty}</span> : null}
          <TaskLockToggle taskId={task.id} partyId={partyId} locked={task.locked}/>
          <TaskDoneToggle taskId={task.id} partyId={partyId} done={task.status === "done"} title={task.title} placement="inline"/>
        </div>

        {task.description ? <div><p className="eyebrow">Details</p><p className="mt-2 text-sm leading-relaxed text-ink/65">{task.description}</p></div> : null}
        {task.task && task.task !== task.title ? <div><p className="eyebrow">Task</p><p className="mt-2 text-sm leading-relaxed text-ink/65">{task.task}</p></div> : null}

        {task.steps?.length ? <div><p className="eyebrow">Steps</p><div className="mt-2 space-y-2">{task.steps.map((step, index) => <div key={step.id} className="rounded-lg border border-ink/10 bg-paper-2 p-3"><p className="text-xs font-bold">{index + 1}. {step.title}</p>{step.description ? <p className="mt-1 text-xs leading-relaxed text-ink/50">{step.description}</p> : null}</div>)}</div></div> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-semibold">Duration</span><div className="flex items-center gap-2"><input key={`${task.id}:${task.duration_minutes}`} type="number" min={1} step={1} defaultValue={task.duration_minutes ?? 30} className="field" disabled={!canEdit} onBlur={(event) => onDuration(Math.max(1, Number(event.currentTarget.value) || 1))}/><span className="text-xs text-ink/45">min</span></div>{task.base_duration_minutes ? <span className="mt-1 block text-[10px] text-ink/40">Recipe base: {task.base_duration_minutes} min</span> : null}</label>
          <label><span className="mb-1.5 block text-xs font-semibold">Scaling</span><select className="field" disabled={!canEdit || pending || !task.recipe_id} value={task.duration_scaling_mode ?? (task.recipe_id ? "quantity" : "manual")} onChange={(event) => onScalingMode(event.target.value as DurationScalingMode)}><option value="quantity">Scales with quantity</option><option value="batch">Repeated batches</option><option value="fixed">Fixed cooking time</option><option value="manual">Manual duration</option></select><span className="mt-1 block text-[10px] leading-relaxed text-ink/40">Quantity prep grows sublinearly; batch tasks repeat when servings exceed the original recipe size.</span></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Helper</span><select className="field" disabled={!canEdit || pending} value={task.helper_id ?? ""} onChange={(event) => {
            const helperId = event.target.value || null;
            if (!helperId && task.start_at) {
              onMove(null, null);
              return;
            }
            onMove(helperId, task.start_at);
          }}><option value="">Unassigned</option>{helpers.map((helper) => <option key={helper.id} value={helper.id}>{helper.name}</option>)}</select></label>
        </div>

        {task.start_at ? <div className="rounded-xl border border-ink/10 bg-paper-2 p-4"><p className="eyebrow">Scheduled</p><p className="mt-2 text-sm font-semibold">{fmt(Date.parse(task.start_at), timeZone)}</p><button type="button" className="mt-3 text-[10px] font-bold uppercase tracking-widest text-tomato hover:underline" disabled={!canEdit || pending} onClick={() => onMove(task.helper_id, null)}>Remove from timeline</button></div> : <p className="text-xs text-ink/45">Drag this task from the pool into a helper column to schedule it.</p>}

        {task.recipe_id && canEdit ? <label className="flex items-center justify-between rounded-xl border border-ink/10 p-3"><span className="text-xs font-semibold">Recipe color</span><input type="color" value={recipeColor(task)} onChange={(event) => startTransition(async () => { const result = await setRecipeTimelineColor(partyId, task.recipe_id!, event.target.value); if (result?.error) onError(result.error); else window.location.reload(); })}/></label> : null}
      </div> : null}
    </Modal>
  );
}
