"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function syncPartyTimeline(
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
            await supabase.from("tasks").update({ title: block.task }).eq("id", existing.id);
          }
        } else {
          await supabase
            .from("tasks")
            .update({
              title: block.task,
              task: block.task,
              duration_minutes: block.durationMinutes || null,
              recipe_id: block.recipeId,
              step_id: null,
              sort_order: block.sortOrder,
            })
            .eq("id", existing.id);
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
          await supabase
            .from("tasks")
            .update({
              title: block.task,
              task: block.task,
              duration_minutes: block.durationMinutes || null,
              recipe_id: block.recipeId,
              step_id: null,
              sort_order: block.sortOrder,
            })
            .eq("id", leftover.id);
          keepIds.add(leftover.id);
          tasksByName.set(key, { ...leftover, task: block.task, step_id: null });
        } else {
          const { data: inserted, error } = await supabase
            .from("tasks")
            .insert({
              party_id: partyId,
              recipe_id: block.recipeId,
              step_id: null,
              title: block.task,
              task: block.task,
              duration_minutes: block.durationMinutes || null,
              sort_order: block.sortOrder,
              status: "todo",
            })
            .select("id")
            .single();
          if (error) return { error: error.message };
          if (inserted) keepIds.add(inserted.id);
        }
      }
    }
  }

  // Always drop bars for dishes no longer on the menu (auto + structural).
  // Structural also drops leftover per-step rows for dishes still on the menu.
  for (const row of recipeTasks) {
    const onMenu = row.recipe_id != null && menuRecipeIds.has(row.recipe_id);

    if (mode === "auto") {
      if (!onMenu) {
        const { error } = await supabase.from("tasks").delete().eq("id", row.id);
        if (error) return { error: error.message };
      }
      continue;
    }

    if (!keepIds.has(row.id)) {
      const { error } = await supabase.from("tasks").delete().eq("id", row.id);
      if (error) return { error: error.message };
    }
  }

  if (mode === "structural") {
    await supabase.from("parties").update({ timeline_dirty: false }).eq("id", partyId);
  }

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
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

  if ("helperId" in move) {
    const helperId = move.helperId ?? null;
    if (helperId) {
      const { data: helper } = await supabase
        .from("party_helpers")
        .select("id")
        .eq("id", helperId)
        .eq("party_id", partyId)
        .maybeSingle();
      if (!helper) return { error: "That helper is not on this party." };
    }
    patch.helper_id = helperId;
    patch.assigned_name = null;
  }

  if ("startAt" in move) {
    patch.start_at = move.startAt ?? null;
  }

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

export async function addHelper(partyId: string, name: string) {
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

  const palette = ["tomato", "orange", "olive", "gold", "wine", "blush"];
  const sortOrder = (existing ?? []).reduce((max, helper) => Math.max(max, helper.sort_order), -1) + 1;

  const { error } = await supabase.from("party_helpers").insert({
    party_id: partyId,
    name: trimmed,
    color: palette[(existing?.length ?? 0) % palette.length],
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
    .update({ helper_id: null, assigned_name: null })
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

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, start_at, duration_minutes, locked, sort_order")
    .eq("party_id", partyId)
    .is("start_at", null)
    .order("sort_order");

  const pending = (tasks ?? []).filter((task) => !task.locked);
  if (!pending.length) return { error: null, scheduled: 0 };

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

  for (const task of pending) {
    const startAt = new Date((starts.get(task.id) ?? prepStart) + shift).toISOString();
    await supabase.from("tasks").update({ start_at: startAt }).eq("id", task.id);
  }

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null, scheduled: pending.length };
}
