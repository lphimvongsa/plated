"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { claimPartyRefresh, finishPartyRefresh } from "@/lib/party/refresh-claim";
import type { Database } from "@/lib/database.types";

type RecipeTaskBlock = {
  recipeId: string;
  task: string;
  durationMinutes: number;
  sortOrder: number;
};

function recipeTaskKey(recipeId: string, task: string) {
  return `${recipeId}::${task}`;
}

function groupStepsIntoTasks(
  steps: {
    id: string;
    recipe_id: string;
    task: string | null;
    duration_minutes: number | null;
    sort_order: number;
  }[],
): RecipeTaskBlock[] {
  const order: string[] = [];
  const map = new Map<string, RecipeTaskBlock>();

  for (const step of steps) {
    const task = step.task?.trim() || "Cooking";
    const key = recipeTaskKey(step.recipe_id, task);
    if (!map.has(key)) {
      order.push(key);
      map.set(key, {
        recipeId: step.recipe_id,
        task,
        durationMinutes: 0,
        sortOrder: step.sort_order,
      });
    }
    const block = map.get(key)!;
    block.durationMinutes += step.duration_minutes ?? 0;
    block.sortOrder = Math.min(block.sortOrder, step.sort_order);
  }

  return order.map((key) => map.get(key)!);
}

async function syncPartyTimelineUnlocked(
  partyId: string,
  options: { mode: "auto" | "structural" },
) {
  const supabase = await createClient();
  const mode = options.mode;

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("recipe_id")
    .eq("party_id", partyId);

  const recipeIds = (menuItems ?? []).map((item) => item.recipe_id);

  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("party_id", partyId)
    .not("recipe_id", "is", null);

  const recipeTasks = existingTasks ?? [];

  // Canonical recipe task: recipe-scoped, no step_id, task name set.
  // Anything else with a recipe_id is a leftover per-step row.
  const tasksByName = new Map<string, (typeof recipeTasks)[number]>();
  const deleteIds: string[] = [];
  for (const row of recipeTasks) {
    if (!row.task || row.step_id) continue;
    const key = recipeTaskKey(row.recipe_id as string, row.task);
    const prev = tasksByName.get(key);
    if (!prev) {
      tasksByName.set(key, row);
      continue;
    }
    // Prefer the scheduled / earlier row if duplicates somehow exist.
    const prevRank = prev.start_at ? Date.parse(prev.start_at) : Number.POSITIVE_INFINITY;
    const nextRank = row.start_at ? Date.parse(row.start_at) : Number.POSITIVE_INFINITY;
    if (nextRank < prevRank || (nextRank === prevRank && row.sort_order < prev.sort_order)) {
      tasksByName.set(key, row);
    }
  }

  const keepIds = new Set<string>();
  const menuRecipeIds = new Set(recipeIds);
  const taskWrites: Array<Promise<{ error: { message: string } | null }>> = [];
  const taskInserts: Database["public"]["Tables"]["tasks"]["Insert"][] = [];

  if (recipeIds.length) {
    const { data: steps } = await supabase
      .from("recipe_steps")
      .select("id, recipe_id, task, duration_minutes, sort_order")
      .in("recipe_id", recipeIds)
      .order("sort_order");

    const blocks = groupStepsIntoTasks(steps ?? []);

    for (const block of blocks) {
      const key = recipeTaskKey(block.recipeId, block.task);
      const existing = tasksByName.get(key);

      if (existing) {
        keepIds.add(existing.id);
        if (mode === "auto") {
          if (existing.title !== block.task) {
            taskWrites.push(
              Promise.resolve(supabase.from("tasks").update({ title: block.task }).eq("id", existing.id))
                .then((result) => ({ error: result.error })),
            );
          }
        } else {
          taskWrites.push(
            Promise.resolve(supabase.from("tasks").update({
              title: block.task,
              task: block.task,
              duration_minutes: block.durationMinutes || null,
              recipe_id: block.recipeId,
              step_id: null,
              sort_order: block.sortOrder,
            }).eq("id", existing.id)).then((result) => ({ error: result.error })),
          );
        }
      } else if (mode === "structural") {
        // Promote any leftover row for this recipe so schedule/assignee can stick.
        const leftover = recipeTasks.find(
          (row) =>
            row.recipe_id === block.recipeId &&
            !keepIds.has(row.id) &&
            (row.task?.trim() || row.title?.trim() || "Cooking") === block.task,
        ) ?? recipeTasks.find((row) => row.recipe_id === block.recipeId && !keepIds.has(row.id));

        if (leftover) {
          taskWrites.push(
            Promise.resolve(supabase.from("tasks").update({
              title: block.task,
              task: block.task,
              duration_minutes: block.durationMinutes || null,
              recipe_id: block.recipeId,
              step_id: null,
              sort_order: block.sortOrder,
            }).eq("id", leftover.id)).then((result) => ({ error: result.error })),
          );
          keepIds.add(leftover.id);
          tasksByName.set(key, { ...leftover, task: block.task, step_id: null });
        } else {
          taskInserts.push({
              party_id: partyId,
              recipe_id: block.recipeId,
              step_id: null,
              title: block.task,
              task: block.task,
              duration_minutes: block.durationMinutes || null,
              sort_order: block.sortOrder,
              status: "todo",
          });
        }
      }
    }
  }

  const writeResults = await Promise.all(taskWrites);
  const writeError = writeResults.find((result) => result.error)?.error;
  if (writeError) return { error: writeError.message };

  if (taskInserts.length) {
    const { error } = await supabase.from("tasks").insert(taskInserts);
    if (error) return { error: error.message };
  }

  // Always drop bars for dishes no longer on the menu (auto + structural).
  // Structural also drops leftover per-step rows for dishes still on the menu.
  for (const row of recipeTasks) {
    const onMenu = row.recipe_id != null && menuRecipeIds.has(row.recipe_id);

    if (mode === "auto") {
      if (!onMenu) {
        deleteIds.push(row.id);
      }
      continue;
    }

    if (!keepIds.has(row.id)) {
      deleteIds.push(row.id);
    }
  }

  if (deleteIds.length) {
    const { error } = await supabase.from("tasks").delete().in("id", deleteIds);
    if (error) return { error: error.message };
  }

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function syncPartyTimeline(
  partyId: string,
  options: { mode: "auto" | "structural" },
) {
  if (options.mode === "auto") return syncPartyTimelineUnlocked(partyId, options);

  const supabase = await createClient();
  const claim = await claimPartyRefresh(supabase, partyId, "timeline");
  if (!claim.token) return { error: claim.error };

  let success = false;
  try {
    const result = await syncPartyTimelineUnlocked(partyId, options);
    success = !result.error;
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not synchronize timeline." };
  } finally {
    await finishPartyRefresh(supabase, partyId, "timeline", claim.token, success);
  }
}

export async function createDishScopedTask(
  partyId: string,
  recipeId: string,
  input: {
    title: string;
    description?: string | null;
    duration_minutes?: number | null;
    task?: string | null;
  },
) {
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, party_id")
    .eq("id", recipeId)
    .eq("party_id", partyId)
    .single();

  if (!recipe) return { error: "Party recipe not found." };

  const task = input.task?.trim() || "Cooking";

  const { data: maxStep } = await supabase
    .from("recipe_steps")
    .select("sort_order")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxStep?.sort_order ?? -1) + 1;

  const { data: step, error: stepError } = await supabase
    .from("recipe_steps")
    .insert({
      recipe_id: recipeId,
      title: input.title,
      description: input.description ?? null,
      duration_minutes: input.duration_minutes ?? null,
      task,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (stepError || !step) {
    return { error: stepError?.message ?? "Could not create recipe step." };
  }

  const { data: recipeSteps } = await supabase
    .from("recipe_steps")
    .select("duration_minutes, sort_order, task")
    .eq("recipe_id", recipeId);

  const inTask = (recipeSteps ?? []).filter((row) => (row.task?.trim() || "Cooking") === task);
  const durationMinutes = inTask.reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0);
  const taskSort = inTask.reduce((min, row) => Math.min(min, row.sort_order), sortOrder);

  const { data: existingTask } = await supabase
    .from("tasks")
    .select("id")
    .eq("party_id", partyId)
    .eq("recipe_id", recipeId)
    .eq("task", task)
    .is("step_id", null)
    .maybeSingle();

  if (existingTask) {
    await supabase
      .from("tasks")
      .update({
        title: task,
        duration_minutes: durationMinutes || null,
        sort_order: taskSort,
      })
      .eq("id", existingTask.id);
  } else {
    const { error: taskError } = await supabase.from("tasks").insert({
      party_id: partyId,
      recipe_id: recipeId,
      step_id: null,
      title: task,
      task,
      duration_minutes: durationMinutes || null,
      sort_order: taskSort,
      status: "todo",
    });
    if (taskError) return { error: taskError.message };
  }

  revalidatePath(`/app/parties/${partyId}/timeline`);
  revalidatePath(`/app/parties/${partyId}/recipes`);
  return { error: null, stepId: step.id };
}

export async function createUnscopedTask(
  partyId: string,
  input: { title: string; description?: string | null; duration_minutes?: number | null },
) {
  const supabase = await createClient();

  const { data: maxTask } = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("party_id", partyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("tasks").insert({
    party_id: partyId,
    title: input.title,
    description: input.description ?? null,
    duration_minutes: input.duration_minutes ?? null,
    sort_order: (maxTask?.sort_order ?? -1) + 1,
    status: "todo",
  });

  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function materializePartyTimeline(partyId: string) {
  return syncPartyTimeline(partyId, { mode: "structural" });
}

export async function moveTask(
  partyId: string,
  taskId: string,
  move: { helperId?: string | null; startAt?: string | null },
) {
  const supabase = await createClient();
  const patch: { helper_id?: string | null; assigned_name?: string | null; start_at?: string | null } = {};

  let effectiveHelperId: string | null | undefined =
    "helperId" in move ? (move.helperId ?? null) : undefined;

  if (effectiveHelperId) {
    const { data: helper } = await supabase
      .from("party_helpers")
      .select("id")
      .eq("id", effectiveHelperId)
      .eq("party_id", partyId)
      .maybeSingle();
    if (!helper) return { error: "That helper is not on this party." };
  }

  // A scheduled bar always belongs to a helper lane. If a caller schedules a
  // task without also sending helperId, preserve its existing assignment but
  // reject the write when none exists.
  if ("startAt" in move && move.startAt && effectiveHelperId === undefined) {
    const { data: task } = await supabase
      .from("tasks")
      .select("helper_id")
      .eq("id", taskId)
      .eq("party_id", partyId)
      .maybeSingle();
    effectiveHelperId = task?.helper_id ?? null;
  }

  if ("startAt" in move && move.startAt && !effectiveHelperId) {
    return { error: "Assign this task to a helper before scheduling it." };
  }

  // Likewise, do not allow a scheduled task to become unassigned. The UI
  // exposes an explicit remove-from-timeline action first.
  if ("helperId" in move && effectiveHelperId === null && !("startAt" in move)) {
    const { data: task } = await supabase
      .from("tasks")
      .select("start_at")
      .eq("id", taskId)
      .eq("party_id", partyId)
      .maybeSingle();
    if (task?.start_at) return { error: "Remove the task from the timeline before unassigning it." };
  }

  if ("helperId" in move) {
    patch.helper_id = effectiveHelperId ?? null;
    patch.assigned_name = null;
  }

  if ("startAt" in move) patch.start_at = move.startAt ?? null;

  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId).eq("party_id", partyId);
  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function setTaskDuration(partyId: string, taskId: string, durationMinutes: number) {
  const supabase = await createClient();
  const minutes = Math.max(5, Math.round(durationMinutes));
  const { error } = await supabase
    .from("tasks")
    .update({ duration_minutes: minutes })
    .eq("id", taskId)
    .eq("party_id", partyId);
  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function addHelper(partyId: string, name: string, color = "#C84A35") {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the helper a name." };

  const { data: existing } = await supabase
    .from("party_helpers")
    .select("id, name, sort_order")
    .eq("party_id", partyId);

  if ((existing ?? []).some((helper) => helper.name.toLowerCase() === trimmed.toLowerCase())) {
    return { error: `${trimmed} already has a lane.` };
  }

  const palette = ["#C84A35", "#E58262", "#73806A", "#D6A943", "#7E3943", "#795169"];
  const sortOrder = (existing ?? []).reduce((max, helper) => Math.max(max, helper.sort_order), -1) + 1;

  const { error } = await supabase.from("party_helpers").insert({
    party_id: partyId,
    name: trimmed,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : palette[(existing?.length ?? 0) % palette.length],
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function renameHelper(partyId: string, helperId: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the helper a name." };

  const { error } = await supabase
    .from("party_helpers")
    .update({ name: trimmed })
    .eq("id", helperId)
    .eq("party_id", partyId);
  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function removeHelper(partyId: string, helperId: string) {
  const supabase = await createClient();

  await supabase
    .from("tasks")
    .update({ helper_id: null, assigned_name: null, start_at: null })
    .eq("party_id", partyId)
    .eq("helper_id", helperId);

  const { error } = await supabase
    .from("party_helpers")
    .delete()
    .eq("id", helperId)
    .eq("party_id", partyId);
  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

const DEFAULT_TASK_MINUTES = 30;

export async function autoScheduleTimeline(partyId: string) {
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("starts_at, prep_starts_at")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) return { error: "Party not found." };

  const [{ data: tasks }, { data: helpers }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, start_at, duration_minutes, locked, sort_order, helper_id")
      .eq("party_id", partyId)
      .is("start_at", null)
      .order("sort_order"),
    supabase
      .from("party_helpers")
      .select("id")
      .eq("party_id", partyId)
      .order("sort_order"),
  ]);

  const pending = (tasks ?? []).filter((task) => !task.locked);
  if (!pending.length) return { error: null, scheduled: 0 };

  const helperIds = (helpers ?? []).map((helper) => helper.id);
  if (!helperIds.length) return { error: "Add a helper before auto-placing tasks." };

  const partyStart = new Date(party.starts_at).getTime();
  const prepStart = new Date(party.prep_starts_at ?? party.starts_at).getTime();

  // Pack backwards from the party so the last prep step lands right before service.
  const starts = new Map<string, number>();
  let cursor = partyStart;
  for (const task of [...pending].reverse()) {
    const minutes = task.duration_minutes ?? DEFAULT_TASK_MINUTES;
    cursor -= minutes * 60_000;
    starts.set(task.id, cursor);
  }

  const shift = cursor < prepStart ? prepStart - cursor : 0;

  const updates = await Promise.all(
    pending.map((task, index) => {
      const startAt = new Date((starts.get(task.id) ?? prepStart) + shift).toISOString();
      const helperId = task.helper_id && helperIds.includes(task.helper_id)
        ? task.helper_id
        : helperIds[index % helperIds.length];
      return supabase
        .from("tasks")
        .update({ start_at: startAt, helper_id: helperId })
        .eq("id", task.id);
    }),
  );
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) return { error: updateError.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null, scheduled: pending.length };
}

export async function setHelperColor(partyId: string, helperId: string, color: string) {
  const supabase = await createClient();
  const value = /^#[0-9a-f]{6}$/i.test(color) ? color : "#C84A35";
  const { error } = await supabase.from("party_helpers").update({ color: value }).eq("id", helperId).eq("party_id", partyId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function setRecipeTimelineColor(partyId: string, recipeId: string, color: string) {
  const supabase = await createClient();
  const value = /^#[0-9a-f]{6}$/i.test(color) ? color : "#C84A35";
  const { error } = await supabase.from("recipes").update({ color_hex: value }).eq("id", recipeId).eq("party_id", partyId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}/timeline`);
  revalidatePath(`/app/parties/${partyId}/recipes`);
  return { error: null };
}
