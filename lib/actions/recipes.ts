"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";
import { computeRecipeEstimatedCost } from "@/lib/recipes/cost";
import { ensureIngredientPrice } from "@/lib/recipes/ensure-price";
import { roundQuantity } from "@/lib/recipes/quantity";
import {
  applyPantryFlags,
  normalizeIngredientCategory,
} from "@/lib/recipes/pantry";
import { displayIngredientName, standardizeIngredientKey } from "@/lib/recipes/standardize";
import type {
  IngredientFields,
  ManualRecipeInput,
  RecipeFields,
  RecipeStepFields,
} from "@/lib/recipes/types";
import { canonicalKey } from "@/lib/recipes/units";
import {
  convertToPreferredWeight,
  type WeightSystem,
} from "@/lib/recipes/weight-convert";
import { schedulePartyDerivedRefresh } from "@/lib/party/refresh-derived";
import { createClient } from "@/lib/supabase/server";

type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
type IngredientInsert = Database["public"]["Tables"]["ingredients"]["Insert"];
type StepInsert = Database["public"]["Tables"]["recipe_steps"]["Insert"];

type RecipeUpdatePayload = {
  partyId?: string | null;
  recipe?: RecipeFields;
  ingredients?: IngredientFields[];
  steps?: RecipeStepFields[];
};

function buildRecipeRow(
  ownerId: string,
  recipe: RecipeFields,
  partyId: string | null,
  cookbookRecipeId: string | null = null,
): RecipeInsert {
  return {
    owner_id: ownerId,
    party_id: partyId,
    cookbook_recipe_id: cookbookRecipeId,
    title: recipe.title,
    description: recipe.description ?? null,
    image_url: recipe.image_url ?? null,
    source_url: recipe.source_url ?? null,
    servings: recipe.servings ?? 4,
    prep_minutes: recipe.prep_minutes ?? null,
    cook_minutes: recipe.cook_minutes ?? null,
    total_minutes: recipe.total_minutes ?? null,
    course: recipe.course ?? null,
    cuisine: recipe.cuisine ?? null,
    difficulty: recipe.difficulty ?? null,
    tags: recipe.tags ?? [],
    dietary_tags: recipe.dietary_tags ?? [],
    allergy_tags: recipe.allergy_tags ?? [],
    equipment: recipe.equipment ?? [],
    notes: recipe.notes ?? null,
    make_ahead_notes: recipe.make_ahead_notes ?? null,
    storage_notes: recipe.storage_notes ?? null,
    reheating_notes: recipe.reheating_notes ?? null,
    import_status: recipe.import_status ?? "manual",
    import_source_type: recipe.import_source_type ?? "manual",
    status: "Ready",
  };
}

function normalizeIngredientFields(items: IngredientFields[]): IngredientFields[] {
  return items
    .filter((item) => item.name.trim())
    .map((item, index) => {
      const display = displayIngredientName(item.name);
      return {
        ...item,
        name: display,
        quantity: roundQuantity(item.quantity ?? null),
        section: item.section?.trim() || null,
        preparation_note: item.preparation_note?.trim() || null,
        secondary_quantity: item.secondary_quantity ?? null,
        secondary_unit: item.secondary_unit ?? null,
        allergen_tags: item.allergen_tags ?? [],
        category: normalizeIngredientCategory(item.category?.trim() || "Other"),
        pantry_flag: Boolean(item.pantry_flag),
        sort_order: index,
      };
    });
}

async function loadUserPantryNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase.from("user_pantry_items").select("name").eq("user_id", userId);
  return (data ?? []).map((row) => row.name);
}

async function normalizeIngredientsForStorage(
  items: IngredientFields[],
  system: WeightSystem,
  /** When provided, pantry checkboxes are set from the user's pantry list. */
  pantryNames?: string[] | null,
): Promise<IngredientFields[]> {
  const normalized = normalizeIngredientFields(items);
  const base = pantryNames ? applyPantryFlags(normalized, pantryNames) : normalized;
  const out: IngredientFields[] = [];
  for (const item of base) {
    const converted = await convertToPreferredWeight({
      name: item.name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      system,
    });
    out.push({
      ...item,
      quantity: converted.quantity,
      unit: converted.unit,
    });
  }
  return out;
}

function mapIngredients(recipeId: string, items: IngredientFields[]): IngredientInsert[] {
  return items.map((item, index) => ({
    recipe_id: recipeId,
    name: item.name,
    quantity: roundQuantity(item.quantity ?? null),
    unit: item.unit ?? null,
    preparation_note: item.preparation_note?.trim() || null,
    section: item.section?.trim() || null,
    category: item.category?.trim() || "Other",
    allergen_tags: item.allergen_tags ?? [],
    pantry_flag: item.pantry_flag ?? false,
    sort_order: item.sort_order ?? index,
    secondary_quantity: item.secondary_quantity ?? null,
    secondary_unit: item.secondary_unit ?? null,
    estimated_unit_cost: item.estimated_unit_cost ?? null,
    canonical_key: canonicalKey(item.name),
  }));
}

async function getWeightSystem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<WeightSystem> {
  const { data } = await supabase
    .from("profiles")
    .select("preferred_measurement")
    .eq("id", userId)
    .maybeSingle();
  return data?.preferred_measurement === "Metric" ? "Metric" : "US";
}

async function fillMissingIngredientCosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
) {
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("id, name, canonical_key, unit, quantity, estimated_unit_cost, pantry_flag")
    .eq("recipe_id", recipeId);

  for (const ing of ingredients ?? []) {
    if (ing.pantry_flag) continue;
    const key = ing.canonical_key || standardizeIngredientKey(ing.name);
    if (!key) continue;

    const ensured = await ensureIngredientPrice(supabase, key, ing.unit, {
      category: null,
    });
    if (!ensured) continue;

    await supabase
      .from("ingredients")
      .update({
        estimated_unit_cost: ensured.price_per_unit,
        canonical_key: ensured.canonical_key,
      })
      .eq("id", ing.id);
  }
}

function mapSteps(recipeId: string, items: RecipeStepFields[]): StepInsert[] {
  return items.map((item, index) => ({
    recipe_id: recipeId,
    title: item.title,
    description: item.description ?? null,
    duration_minutes: item.duration_minutes ?? null,
    task: item.task?.trim() || "Cooking",
    sort_order: item.sort_order ?? index,
  }));
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

async function insertRecipeChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  ingredients: IngredientFields[],
  steps: RecipeStepFields[],
) {
  if (ingredients.length) {
    const { error } = await supabase.from("ingredients").insert(mapIngredients(recipeId, ingredients));
    if (error) return { error: error.message };
  }
  if (steps.length) {
    const { error } = await supabase.from("recipe_steps").insert(mapSteps(recipeId, steps));
    if (error) return { error: error.message };
  }
  return { error: null };
}

async function updateEstimatedCost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  _servings: number,
) {
  await fillMissingIngredientCosts(supabase, recipeId);

  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("quantity, estimated_unit_cost, pantry_flag")
    .eq("recipe_id", recipeId);

  const cost = Math.round(computeRecipeEstimatedCost(ingredients ?? [], 1) * 100) / 100;
  await supabase.from("recipes").update({ estimated_cost: cost }).eq("id", recipeId);
  return cost;
}

async function copyRecipeChildren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromRecipeId: string,
  toRecipeId: string,
) {
  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("*")
    .eq("recipe_id", fromRecipeId)
    .order("sort_order");

  if (ingredients?.length) {
    const { error } = await supabase.from("ingredients").insert(
      ingredients.map(({ id: _id, recipe_id: _rid, ...rest }) => ({
        ...rest,
        recipe_id: toRecipeId,
      })),
    );
    if (error) return { error: error.message };
  }

  const { data: steps } = await supabase
    .from("recipe_steps")
    .select("*")
    .eq("recipe_id", fromRecipeId)
    .order("sort_order");

  if (steps?.length) {
    const { error } = await supabase.from("recipe_steps").insert(
      steps.map(({ id: _id, recipe_id: _rid, created_at: _ca, updated_at: _ua, ...rest }) => ({
        ...rest,
        recipe_id: toRecipeId,
      })),
    );
    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function ensureIngredientPriceAction(name: string, unit?: string | null) {
  const { supabase } = await requireUser();
  if (!name.trim()) return { error: "Ingredient name required.", price: null };
  const price = await ensureIngredientPrice(supabase, name, unit ?? null);
  if (!price) {
    return {
      error: null,
      price: null,
      message: "No price on file yet (AI pricing unavailable).",
    };
  }
  return { error: null, price };
}

export async function createManualRecipe(input: ManualRecipeInput) {
  const { supabase, user } = await requireUser();
  const system = await getWeightSystem(supabase, user.id);
  const pantryNames = await loadUserPantryNames(supabase, user.id);
  const ingredients = await normalizeIngredientsForStorage(
    input.ingredients ?? [],
    system,
    pantryNames,
  );
  const steps = input.steps ?? [];
  const recipe = input.recipe;

  if (!recipe.course?.trim()) {
    return { error: "Select a recipe category before saving." };
  }

  if (input.partyId) {
    const { data: cookbook, error: cookbookError } = await supabase
      .from("recipes")
      .insert(buildRecipeRow(user.id, recipe, null))
      .select("id")
      .single();

    if (cookbookError || !cookbook) {
      return { error: cookbookError?.message ?? "Could not create cookbook recipe." };
    }

    const childResult = await insertRecipeChildren(supabase, cookbook.id, ingredients, steps);
    if (childResult.error) {
      await supabase.from("recipes").delete().eq("id", cookbook.id);
      return { error: childResult.error };
    }

    await updateEstimatedCost(supabase, cookbook.id, recipe.servings ?? 4);

    const { data: partyRecipe, error: partyError } = await supabase
      .from("recipes")
      .insert(buildRecipeRow(user.id, recipe, input.partyId, cookbook.id))
      .select("id")
      .single();

    if (partyError || !partyRecipe) {
      return { error: partyError?.message ?? "Could not create party recipe." };
    }

    const partyChildResult = await copyRecipeChildren(supabase, cookbook.id, partyRecipe.id);
    if (partyChildResult.error) {
      return { error: partyChildResult.error };
    }

    await updateEstimatedCost(supabase, partyRecipe.id, recipe.servings ?? 4);

    if (input.addToMenu !== false) {
      const { error: menuError } = await supabase.from("menu_items").insert({
        party_id: input.partyId,
        recipe_id: partyRecipe.id,
        course: recipe.course ?? null,
      });
      if (menuError) return { error: menuError.message };
    } else {
      await supabase
        .from("parties")
        .update({ shopping_dirty: true, timeline_dirty: true })
        .eq("id", input.partyId);
    }

    schedulePartyDerivedRefresh(input.partyId);
    revalidatePath(`/app/parties/${input.partyId}`);
    revalidatePath(`/app/parties/${input.partyId}/recipes`);
    revalidatePath(`/app/parties/${input.partyId}/menu`);
    revalidatePath(`/app/parties/${input.partyId}/shopping`);
    revalidatePath(`/app/parties/${input.partyId}/costs`);
    revalidatePath("/app/recipes");
    return { error: null, cookbookRecipeId: cookbook.id, recipeId: partyRecipe.id };
  }

  const { data: created, error } = await supabase
    .from("recipes")
    .insert(buildRecipeRow(user.id, recipe, null))
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Could not create recipe." };
  }

  const childResult = await insertRecipeChildren(supabase, created.id, ingredients, steps);
  if (childResult.error) {
    await supabase.from("recipes").delete().eq("id", created.id);
    return { error: childResult.error };
  }

  await updateEstimatedCost(supabase, created.id, recipe.servings ?? 4);

  revalidatePath("/app/recipes");
  return { error: null, recipeId: created.id };
}

export async function updateRecipe(recipeId: string, payload: RecipeUpdatePayload) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("recipes")
    .select("id, owner_id, party_id, servings")
    .eq("id", recipeId)
    .single();

  if (!existing || existing.owner_id !== user.id) {
    return { error: "Recipe not found or access denied." };
  }

  const { ingredients, steps, recipe } = payload;

  if (recipe && !recipe.course?.trim()) {
    return { error: "Select a recipe category before saving." };
  }

  const patch: Database["public"]["Tables"]["recipes"]["Update"] = recipe ? { ...recipe } : {};

  if (Object.keys(patch).length) {
    const { error } = await supabase.from("recipes").update(patch).eq("id", recipeId);
    if (error) return { error: error.message };
  }

  if (ingredients !== undefined) {
    const system = await getWeightSystem(supabase, user.id);
    // Keep editor pantry toggles on update (user may have run out of a staple).
    const normalized = await normalizeIngredientsForStorage(ingredients, system, null);
    await supabase.from("ingredients").delete().eq("recipe_id", recipeId);
    if (normalized.length) {
      const { error } = await supabase
        .from("ingredients")
        .insert(mapIngredients(recipeId, normalized));
      if (error) return { error: error.message };
    }
  }

  if (steps !== undefined) {
    const incomingIds = steps.map((t) => t.id).filter(Boolean) as string[];

    if (incomingIds.length) {
      await supabase
        .from("recipe_steps")
        .delete()
        .eq("recipe_id", recipeId)
        .not("id", "in", `(${incomingIds.join(",")})`);
    } else {
      await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
    }

    for (const [index, step] of steps.entries()) {
      const insertRow: StepInsert = {
        recipe_id: recipeId,
        title: step.title,
        description: step.description ?? null,
        duration_minutes: step.duration_minutes ?? null,
        task: step.task ?? null,
        sort_order: step.sort_order ?? index,
      };

      if (step.id) {
        const { error } = await supabase
          .from("recipe_steps")
          .update({
            title: insertRow.title,
            description: insertRow.description,
            duration_minutes: insertRow.duration_minutes,
            task: insertRow.task,
            sort_order: insertRow.sort_order,
          })
          .eq("id", step.id)
          .eq("recipe_id", recipeId);
        if (error) return { error: error.message };
      } else {
        const { error } = await supabase.from("recipe_steps").insert(insertRow);
        if (error) return { error: error.message };
      }
    }
  }

  await updateEstimatedCost(
    supabase,
    recipeId,
    recipe?.servings ?? existing.servings,
  );

  if (existing.party_id) {
    schedulePartyDerivedRefresh(existing.party_id);
    revalidatePath(`/app/parties/${existing.party_id}`);
    revalidatePath(`/app/parties/${existing.party_id}/recipes`);
    revalidatePath(`/app/parties/${existing.party_id}/menu`);
    revalidatePath(`/app/parties/${existing.party_id}/shopping`);
    revalidatePath(`/app/parties/${existing.party_id}/costs`);
    revalidatePath(`/app/parties/${existing.party_id}/timeline`);
  } else {
    revalidatePath("/app/recipes");
  }

  return { error: null };
}

export async function copyCookbookRecipeToParty(cookbookRecipeId: string, partyId: string) {
  const { supabase, user } = await requireUser();

  const { data: source } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", cookbookRecipeId)
    .is("party_id", null)
    .single();

  if (!source || source.owner_id !== user.id) {
    return { error: "Cookbook recipe not found." };
  }

  // Reuse an existing party copy instead of duplicating.
  const { data: existingPartyRecipe } = await supabase
    .from("recipes")
    .select("id, course")
    .eq("party_id", partyId)
    .eq("cookbook_recipe_id", cookbookRecipeId)
    .maybeSingle();

  if (existingPartyRecipe) {
    const { data: onMenu } = await supabase
      .from("menu_items")
      .select("id")
      .eq("party_id", partyId)
      .eq("recipe_id", existingPartyRecipe.id)
      .maybeSingle();

    if (onMenu) {
      return { error: "Recipe is already on the menu.", recipeId: existingPartyRecipe.id };
    }

    const { data: maxSort } = await supabase
      .from("menu_items")
      .select("sort_order")
      .eq("party_id", partyId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: menuError } = await supabase.from("menu_items").insert({
      party_id: partyId,
      recipe_id: existingPartyRecipe.id,
      course: existingPartyRecipe.course ?? source.course,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    });

    if (menuError) return { error: menuError.message };

    schedulePartyDerivedRefresh(partyId);
    revalidatePath(`/app/parties/${partyId}`);
    revalidatePath(`/app/parties/${partyId}/menu`);
    revalidatePath(`/app/parties/${partyId}/recipes`);
    revalidatePath(`/app/parties/${partyId}/shopping`);
    revalidatePath(`/app/parties/${partyId}/costs`);
    revalidatePath(`/app/parties/${partyId}/timeline`);
    return { error: null, recipeId: existingPartyRecipe.id };
  }

  const { id: _id, created_at: _ca, updated_at: _ua, ...recipeFields } = source;
  const { data: partyRecipe, error } = await supabase
    .from("recipes")
    .insert({
      ...recipeFields,
      party_id: partyId,
      cookbook_recipe_id: cookbookRecipeId,
    })
    .select("id")
    .single();

  if (error || !partyRecipe) {
    return { error: error?.message ?? "Could not copy recipe to party." };
  }

  const copyResult = await copyRecipeChildren(supabase, cookbookRecipeId, partyRecipe.id);
  if (copyResult.error) return { error: copyResult.error };

  const { data: maxSort } = await supabase
    .from("menu_items")
    .select("sort_order")
    .eq("party_id", partyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: menuError } = await supabase.from("menu_items").insert({
    party_id: partyId,
    recipe_id: partyRecipe.id,
    course: source.course,
    sort_order: (maxSort?.sort_order ?? -1) + 1,
  });

  if (menuError) return { error: menuError.message };

  schedulePartyDerivedRefresh(partyId);
  revalidatePath(`/app/parties/${partyId}`);
  revalidatePath(`/app/parties/${partyId}/menu`);
  revalidatePath(`/app/parties/${partyId}/recipes`);
  revalidatePath(`/app/parties/${partyId}/shopping`);
  revalidatePath(`/app/parties/${partyId}/costs`);
  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null, recipeId: partyRecipe.id };
}

const RECIPE_DIFF_FIELDS = [
  "title",
  "description",
  "image_url",
  "source_url",
  "servings",
  "prep_minutes",
  "cook_minutes",
  "total_minutes",
  "course",
  "cuisine",
  "difficulty",
  "dietary_tags",
  "allergy_tags",
  "equipment",
  "notes",
  "make_ahead_notes",
  "storage_notes",
  "reheating_notes",
] as const;

function ingredientSignature(ing: {
  name: string;
  quantity: number | null;
  unit: string | null;
  preparation_note: string | null;
  section: string | null;
  category: string | null;
  allergen_tags: string[];
  pantry_flag: boolean;
  sort_order: number;
  secondary_quantity: number | null;
  secondary_unit: string | null;
  estimated_unit_cost: number | null;
  canonical_key: string | null;
}) {
  return JSON.stringify({
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    preparation_note: ing.preparation_note,
    section: ing.section,
    category: ing.category,
    allergen_tags: ing.allergen_tags,
    pantry_flag: ing.pantry_flag,
    sort_order: ing.sort_order,
    secondary_quantity: ing.secondary_quantity,
    secondary_unit: ing.secondary_unit,
    estimated_unit_cost: ing.estimated_unit_cost,
    canonical_key: ing.canonical_key,
  });
}

function stepSignature(step: {
  title: string;
  description: string | null;
  duration_minutes: number | null;
  task: string | null;
  sort_order: number;
}) {
  return JSON.stringify({
    title: step.title,
    description: step.description,
    duration_minutes: step.duration_minutes,
    task: step.task,
    sort_order: step.sort_order,
  });
}

export async function updateCookbookFromParty(partyRecipeId: string) {
  const { supabase, user } = await requireUser();

  const { data: partyRecipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", partyRecipeId)
    .not("party_id", "is", null)
    .single();

  if (!partyRecipe || partyRecipe.owner_id !== user.id) {
    return { error: "Party recipe not found." };
  }

  if (!partyRecipe.cookbook_recipe_id) {
    return { error: "Recipe has no linked cookbook parent." };
  }

  const cookbookId = partyRecipe.cookbook_recipe_id;
  const { data: cookbook } = await supabase.from("recipes").select("*").eq("id", cookbookId).single();

  if (!cookbook) return { error: "Cookbook recipe not found." };

  const patch: Database["public"]["Tables"]["recipes"]["Update"] = {};
  for (const field of RECIPE_DIFF_FIELDS) {
    const partyVal = partyRecipe[field];
    const cookbookVal = cookbook[field];
    if (JSON.stringify(partyVal) !== JSON.stringify(cookbookVal)) {
      (patch as Record<string, unknown>)[field] = partyVal;
    }
  }

  if (Object.keys(patch).length) {
    const { error } = await supabase.from("recipes").update(patch).eq("id", cookbookId);
    if (error) return { error: error.message };
  }

  const [{ data: partyIngredients }, { data: cookbookIngredients }] = await Promise.all([
    supabase.from("ingredients").select("*").eq("recipe_id", partyRecipeId).order("sort_order"),
    supabase.from("ingredients").select("*").eq("recipe_id", cookbookId).order("sort_order"),
  ]);

  const partyIngSigs = (partyIngredients ?? []).map(ingredientSignature);
  const cookbookIngSigs = (cookbookIngredients ?? []).map(ingredientSignature);
  if (JSON.stringify(partyIngSigs) !== JSON.stringify(cookbookIngSigs)) {
    await supabase.from("ingredients").delete().eq("recipe_id", cookbookId);
    if (partyIngredients?.length) {
      const { error } = await supabase.from("ingredients").insert(
        partyIngredients.map(({ id: _id, recipe_id: _rid, ...rest }) => ({
          ...rest,
          recipe_id: cookbookId,
        })),
      );
      if (error) return { error: error.message };
    }
  }

  const [{ data: partySteps }, { data: cookbookSteps }] = await Promise.all([
    supabase.from("recipe_steps").select("*").eq("recipe_id", partyRecipeId).order("sort_order"),
    supabase.from("recipe_steps").select("*").eq("recipe_id", cookbookId).order("sort_order"),
  ]);

  const partyStepSigs = (partySteps ?? []).map(stepSignature);
  const cookbookStepSigs = (cookbookSteps ?? []).map(stepSignature);
  if (JSON.stringify(partyStepSigs) !== JSON.stringify(cookbookStepSigs)) {
    await supabase.from("recipe_steps").delete().eq("recipe_id", cookbookId);
    if (partySteps?.length) {
      const { error } = await supabase.from("recipe_steps").insert(
        partySteps.map(({ id: _id, recipe_id: _rid, created_at: _ca, updated_at: _ua, ...rest }) => ({
          ...rest,
          recipe_id: cookbookId,
        })),
      );
      if (error) return { error: error.message };
    }
  }

  await updateEstimatedCost(supabase, cookbookId, partyRecipe.servings);

  revalidatePath("/app/recipes");
  if (partyRecipe.party_id) {
    revalidatePath(`/app/parties/${partyRecipe.party_id}/recipes`);
  }

  return { error: null, cookbookRecipeId: cookbookId };
}

export async function deleteRecipe(recipeId: string, _partyId?: string | null) {
  const { supabase, user } = await requireUser();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, owner_id, party_id")
    .eq("id", recipeId)
    .single();

  if (!recipe || recipe.owner_id !== user.id) {
    return { error: "Recipe not found or access denied." };
  }

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
  if (error) return { error: error.message };

  if (recipe.party_id) {
    schedulePartyDerivedRefresh(recipe.party_id);
    revalidatePath(`/app/parties/${recipe.party_id}`);
    revalidatePath(`/app/parties/${recipe.party_id}/recipes`);
    revalidatePath(`/app/parties/${recipe.party_id}/menu`);
    revalidatePath(`/app/parties/${recipe.party_id}/shopping`);
    revalidatePath(`/app/parties/${recipe.party_id}/costs`);
    revalidatePath(`/app/parties/${recipe.party_id}/timeline`);
  } else {
    revalidatePath("/app/recipes");
  }

  return { error: null };
}
