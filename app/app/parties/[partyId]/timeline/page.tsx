import { TimelineBoard, type TimelineHelper, type TimelineTask } from "@/components/party/timeline-board";
import { TimelineSyncBanner } from "@/components/party/timeline-sync-banner";
import { formatPartyWhen } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { isDurationScalingMode } from "@/lib/timeline/duration-scaling";

const PARTY_FIELDS = "id, starts_at, ends_at, prep_starts_at, timezone, timeline_dirty";

export default async function TimelinePage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  // Party metadata, bars, and helper lanes are independent. Fetching them in
  // parallel keeps one Supabase round-trip off the page's critical path.
  const [{ data: party }, { data: tasks }, { data: helperRows }] = await Promise.all([
    supabase
      .from("parties")
      .select(PARTY_FIELDS)
      .eq("id", partyId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select(
        `
      id,
      title,
      description,
      task,
      start_at,
      duration_minutes,
      base_duration_minutes,
      duration_scaling_mode,
      status,
      difficulty,
      assigned_name,
      helper_id,
      locked,
      recipe_id,
      sort_order,
      recipes ( title, color_hex )
    `,
      )
      .eq("party_id", partyId)
      .order("sort_order"),
    supabase
      .from("party_helpers")
      .select("id, name, color, sort_order")
      .eq("party_id", partyId)
      .order("sort_order"),
  ]);
  if (!party) notFound();

  const showSyncBanner = Boolean(party.timeline_dirty);

  type RecipeStepRow = {
    id: string;
    recipe_id: string;
    title: string;
    description: string | null;
    duration_minutes: number | null;
    task: string | null;
    sort_order: number;
  };

  const recipeIds = [...new Set((tasks ?? []).map((task) => task.recipe_id).filter((id): id is string => Boolean(id)))];
  const { data: stepRows } = recipeIds.length
    ? await supabase
        .from("recipe_steps")
        .select("id, recipe_id, title, description, duration_minutes, task, sort_order")
        .in("recipe_id", recipeIds)
        .order("sort_order")
    : { data: [] as RecipeStepRow[] };

  const stepsByTask = new Map<string, RecipeStepRow[]>();
  for (const step of stepRows ?? []) {
    const taskName = step.task?.trim() || "Cooking";
    const key = `${step.recipe_id}::${taskName}`;
    const list = stepsByTask.get(key) ?? [];
    list.push(step);
    stepsByTask.set(key, list);
  }

  const fallbackHelperId = (helperRows ?? [])[0]?.id ?? null;

  const list: TimelineTask[] = (tasks ?? []).map((row) => {
    const recipe = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes;
    const taskName = row.task?.trim() || row.title?.trim() || "Cooking";
    const key = row.recipe_id ? `${row.recipe_id}::${taskName}` : null;
    const steps = key
      ? (stepsByTask.get(key) ?? []).map((step) => ({
          id: step.id,
          title: step.title,
          description: step.description,
          duration_minutes: step.duration_minutes,
        }))
      : [];

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      start_at: row.start_at,
      duration_minutes: row.duration_minutes,
      base_duration_minutes: row.base_duration_minutes,
      duration_scaling_mode: isDurationScalingMode(row.duration_scaling_mode) ? row.duration_scaling_mode : null,
      status: row.status,
      difficulty: row.difficulty,
      assigned_name: row.assigned_name,
      helper_id: row.helper_id ?? (row.start_at ? fallbackHelperId : null),
      locked: row.locked,
      recipe_id: row.recipe_id,
      recipe_title: recipe?.title ?? null,
      recipe_color: recipe?.color_hex ?? null,
      task: taskName,
      sort_order: row.sort_order,
      steps,
    };
  });

  const helpers: TimelineHelper[] = (helperRows ?? []).map((helper) => ({
    id: helper.id,
    name: helper.name,
    color: helper.color,
    sort_order: helper.sort_order,
  }));

  const doneCount = list.filter((task) => task.status === "done").length;
  const unscheduledCount = list.filter((task) => !task.start_at).length;
  const next = list
    .filter((task) => task.status !== "done" && task.start_at)
    .sort((a, b) => Date.parse(a.start_at!) - Date.parse(b.start_at!))[0];

  const { date, time } = formatPartyWhen(party.starts_at, party.timezone);
  const prepStartsAt = party.prep_starts_at;

  return (
    <div className="space-y-4">
      {showSyncBanner ? <TimelineSyncBanner partyId={partyId} /> : null}

      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-4xl font-semibold md:text-5xl">Order of Operations</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-ink/10 py-2 text-xs text-ink/55 md:border-y-0 md:py-0">
          <span><strong className="text-ink">{doneCount}/{list.length}</strong> done</span>
          <span><strong className="text-ink">{unscheduledCount}</strong> to place</span>
          <span><strong className="text-ink">{time}</strong> · {date}</span>
          <span className="max-w-[220px] truncate">
            Next: <strong className="text-ink">{next?.title ?? "All clear"}</strong>
          </span>
        </div>
      </section>

      <TimelineBoard
        partyId={partyId}
        timeZone={party.timezone}
        tasks={list}
        helpers={helpers}
        prepStartsAt={prepStartsAt}
        partyStartsAt={party.starts_at}
        partyEndsAt={party.ends_at}
      />
    </div>
  );
}
