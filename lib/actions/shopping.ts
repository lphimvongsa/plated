"use server";

import { revalidatePath } from "next/cache";
import { ensureIngredientPrice } from "@/lib/recipes/ensure-price";
import { roundQuantity } from "@/lib/recipes/quantity";
import { canonicalKey, scaleQuantity } from "@/lib/recipes/units";
import {
  convertToPreferredWeight,
  type WeightSystem,
} from "@/lib/recipes/weight-convert";
import { createClient } from "@/lib/supabase/server";

type ConsolidatedItem = {
  canonical_key: string;
  ingredient_name: string;
  unit: string | null;
  quantity: number;
  category: string | null;
  source_recipe_ids: string[];
  estimated_cost: number;
};

function groceryMatchKey(item: { canonical_key?: string | null; unit?: string | null; ingredient_name: string }) {
  const key = item.canonical_key ?? canonicalKey(item.ingredient_name);
  return `${key}::${item.unit ?? ""}`;
}

async function getWeightSystem(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<WeightSystem> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "US";
  const { data } = await supabase
    .from("profiles")
    .select("preferred_measurement")
    .eq("id", user.id)
    .maybeSingle();
  return data?.preferred_measurement === "Metric" ? "Metric" : "US";
}

export async function regenerateShoppingList(partyId: string) {
  const supabase = await createClient();
  const system = await getWeightSystem(supabase);

  const { data: party } = await supabase
    .from("parties")
    .select("planning_guest_count, shopping_dirty")
    .eq("id", partyId)
    .single();

  if (!party) return { error: "Party not found." };

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("recipe_id")
    .eq("party_id", partyId);

  const recipeIds = (menuItems ?? []).map((item) => item.recipe_id);
  const consolidated = new Map<string, ConsolidatedItem>();

  if (recipeIds.length) {
    const [{ data: recipes }, { data: allIngredients }] = await Promise.all([
      supabase.from("recipes").select("id, title, servings").in("id", recipeIds),
      supabase.from("ingredients").select("*").in("recipe_id", recipeIds),
    ]);

    const ingredientsByRecipe = new Map<string, NonNullable<typeof allIngredients>>();
    for (const ing of allIngredients ?? []) {
      const list = ingredientsByRecipe.get(ing.recipe_id) ?? [];
      list.push(ing);
      ingredientsByRecipe.set(ing.recipe_id, list);
    }

    for (const recipe of recipes ?? []) {
      for (const ing of ingredientsByRecipe.get(recipe.id) ?? []) {
        if (ing.pantry_flag) continue;

        const converted = await convertToPreferredWeight({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          system,
        });

        // Persist conversion on the recipe ingredient when count/misc → weight
        if (
          converted.converted &&
          (converted.quantity !== ing.quantity || converted.unit !== ing.unit)
        ) {
          await supabase
            .from("ingredients")
            .update({
              quantity: converted.quantity,
              unit: converted.unit,
            })
            .eq("id", ing.id);
        }

        const key = ing.canonical_key ?? canonicalKey(ing.name);
        const unit = converted.unit ?? null;
        const mapKey = `${key}::${unit ?? ""}`;
        const scaledQty =
          roundQuantity(
            scaleQuantity(converted.quantity, recipe.servings, party.planning_guest_count) ?? 0,
          ) ?? 0;

        const ensured = await ensureIngredientPrice(supabase, key, unit, {
          category: ing.category,
          system,
        });
        const unitCost = ensured?.price_per_unit ?? ing.estimated_unit_cost ?? 0;

        if (ensured) {
          await supabase
            .from("ingredients")
            .update({
              estimated_unit_cost: ensured.price_per_unit,
              canonical_key: ensured.canonical_key,
            })
            .eq("id", ing.id);
        }

        const lineCost = roundQuantity(scaledQty * unitCost) ?? 0;
        const existing = consolidated.get(mapKey);
        if (existing) {
          existing.quantity = roundQuantity(existing.quantity + scaledQty) ?? existing.quantity + scaledQty;
          if (!existing.source_recipe_ids.includes(recipe.id)) {
            existing.source_recipe_ids.push(recipe.id);
          }
          existing.estimated_cost = roundQuantity(existing.estimated_cost + lineCost) ?? existing.estimated_cost + lineCost;
        } else {
          consolidated.set(mapKey, {
            canonical_key: key,
            ingredient_name: ing.name,
            unit,
            quantity: scaledQty,
            category: ing.category,
            source_recipe_ids: [recipe.id],
            estimated_cost: lineCost,
          });
        }
      }
    }
  }

  const { data: existingItems } = await supabase
    .from("grocery_items")
    .select("*")
    .eq("party_id", partyId);

  const preserved = new Map<string, (typeof existingItems extends (infer T)[] | null ? T : never)>();
  const manualItems = (existingItems ?? []).filter((item) => item.is_manual);

  for (const item of existingItems ?? []) {
    if (item.is_manual) continue;
    preserved.set(groceryMatchKey(item), item);
  }

  await supabase.from("grocery_items").delete().eq("party_id", partyId).eq("is_manual", false);

  const generatedRows = Array.from(consolidated.values()).map((item, index) => {
    const match = preserved.get(`${item.canonical_key}::${item.unit ?? ""}`);
    const qty = roundQuantity(item.quantity) ?? 0;
    return {
      party_id: partyId,
      ingredient_name: item.ingredient_name,
      required_quantity: String(qty),
      quantity: qty,
      unit: item.unit,
      category: item.category,
      canonical_key: item.canonical_key,
      source_recipe_ids: item.source_recipe_ids,
      estimated_cost: roundQuantity(item.estimated_cost) ?? 0,
      is_manual: false,
      sort_order: index,
      already_owned: match?.already_owned ?? false,
      purchased: match?.purchased ?? false,
      actual_cost: match?.actual_cost ?? null,
    };
  });

  if (generatedRows.length) {
    const { error } = await supabase.from("grocery_items").insert(generatedRows);
    if (error) return { error: error.message };
  }

  const manualSortOffset = generatedRows.length;
  for (const [index, item] of manualItems.entries()) {
    await supabase
      .from("grocery_items")
      .update({ sort_order: manualSortOffset + index })
      .eq("id", item.id);
  }

  await supabase.from("parties").update({ shopping_dirty: false }).eq("id", partyId);

  revalidatePath(`/app/parties/${partyId}/shopping`);
  revalidatePath(`/app/parties/${partyId}/costs`);
  revalidatePath(`/app/parties/${partyId}/menu`);
  return { error: null, itemCount: generatedRows.length + manualItems.length };
}

export async function addManualGroceryItem(
  partyId: string,
  input: { name: string; quantity?: string | null; unit?: string | null; category?: string | null },
) {
  const supabase = await createClient();
  const { data: maxOrder } = await supabase
    .from("grocery_items")
    .select("sort_order")
    .eq("party_id", partyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const parsedQty = input.quantity != null && input.quantity !== "" ? Number(input.quantity) : null;

  const { error } = await supabase.from("grocery_items").insert({
    party_id: partyId,
    ingredient_name: input.name,
    required_quantity: parsedQty != null ? String(roundQuantity(parsedQty) ?? parsedQty) : null,
    quantity: roundQuantity(parsedQty),
    unit: input.unit ?? null,
    category: input.category ?? null,
    canonical_key: canonicalKey(input.name),
    is_manual: true,
    sort_order: (maxOrder?.sort_order ?? -1) + 1,
  });

  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/shopping`);
  return { error: null };
}
