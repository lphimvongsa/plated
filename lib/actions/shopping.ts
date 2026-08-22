"use server";

import { revalidatePath } from "next/cache";
import { ensureIngredientPrice } from "@/lib/recipes/ensure-price";
import { roundQuantity } from "@/lib/recipes/quantity";
import { canonicalKey, scaleQuantity } from "@/lib/recipes/units";
import {
  convertCatalogQuantity,
  convertToPreferredWeight,
  normalizeUnitToken,
  resolveCatalogIngredient,
  type WeightSystem,
} from "@/lib/recipes/weight-convert";
import { createClient } from "@/lib/supabase/server";
import { claimPartyRefresh, finishPartyRefresh } from "@/lib/party/refresh-claim";

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

async function regenerateShoppingListUnlocked(partyId: string) {
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

    const knownKeys = [...new Set(
      (allIngredients ?? []).map((ingredient) => ingredient.canonical_key).filter((key): key is string => Boolean(key)),
    )];
    const { data: cachedPriceRows } = knownKeys.length
      ? await supabase
          .from("ingredient_prices")
          .select("canonical_key, unit, price_per_unit, source")
          .in("canonical_key", knownKeys)
          .eq("currency", "USD")
          .eq("market", "US")
      : { data: [] };
    const cachedPrices = new Map(
      (cachedPriceRows ?? []).map((row) => [
        `${row.canonical_key}::${normalizeUnitToken(row.unit)}`,
        row,
      ]),
    );
    const ingredientUpdates: Array<Promise<{ error: { message: string } | null }>> = [];

    for (const recipe of recipes ?? []) {
      for (const ing of ingredientsByRecipe.get(recipe.id) ?? []) {
        if (ing.pantry_flag) continue;

        const converted = await convertToPreferredWeight({
          supabase,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          system,
        });

        // Persist conversion on the recipe ingredient when count/misc → weight
        // Conversion is derived for this list only; recipe source units remain untouched.

        const catalog = converted.catalog ?? await resolveCatalogIngredient(supabase, ing.name);
        const preferredUnit = catalog?.preferred_shopping_unit;
        let normalizedQuantity = converted.quantity ?? 0;
        let unit = normalizeUnitToken(converted.unit) || null;
        if (preferredUnit && unit) {
          const direct = convertCatalogQuantity(normalizedQuantity, unit, preferredUnit, catalog.density_g_per_ml);
          if (direct != null) {
            normalizedQuantity = direct;
            unit = preferredUnit;
          } else if (catalog.keep_count && preferredUnit === "each") {
            const [{ data: eachWeight }, { data: sourceWeight }] = await Promise.all([
              supabase.from("ingredient_unit_weights").select("grams_per_unit")
                .eq("canonical_key", catalog.canonical_key).eq("unit", "each").maybeSingle(),
              supabase.from("ingredient_unit_weights").select("grams_per_unit")
                .eq("canonical_key", catalog.canonical_key).eq("unit", unit).maybeSingle(),
            ]);
            const grams = sourceWeight?.grams_per_unit
              ? normalizedQuantity * sourceWeight.grams_per_unit
              : convertCatalogQuantity(normalizedQuantity, unit, "g", catalog.density_g_per_ml);
            if (grams != null && eachWeight?.grams_per_unit) {
              normalizedQuantity = grams / eachWeight.grams_per_unit;
              unit = "each";
            }
          }
        }
        const key = converted.canonicalKey ?? ing.canonical_key ?? canonicalKey(ing.name);
        const mapKey = `${key}::${unit ?? ""}`;
        const scaledQty =
          roundQuantity(
            scaleQuantity(normalizedQuantity, recipe.servings, party.planning_guest_count) ?? 0,
          ) ?? 0;

        const cached = cachedPrices.get(`${key}::${normalizeUnitToken(unit)}`);
        const ensured = cached
          ? {
              canonical_key: cached.canonical_key,
              unit: normalizeUnitToken(cached.unit),
              price_per_unit: cached.price_per_unit,
              source: cached.source,
            }
          : await ensureIngredientPrice(supabase, key, unit, {
              category: ing.category,
              system,
            });
        const unitCost = ensured?.price_per_unit ?? ing.estimated_unit_cost ?? 0;

        if (ensured) {
          ingredientUpdates.push(
            Promise.resolve(supabase.from("ingredients").update({
              estimated_unit_cost: ensured.price_per_unit,
              canonical_key: ensured.canonical_key,
            }).eq("id", ing.id)).then((result) => ({ error: result.error })),
          );
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

    const ingredientUpdateResults = await Promise.all(ingredientUpdates);
    const ingredientUpdateError = ingredientUpdateResults.find((result) => result.error)?.error;
    if (ingredientUpdateError) return { error: ingredientUpdateError.message };
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
  const manualUpdates = await Promise.all(
    manualItems.map((item, index) =>
      supabase
        .from("grocery_items")
        .update({ sort_order: manualSortOffset + index })
        .eq("id", item.id),
    ),
  );
  const manualUpdateError = manualUpdates.find((result) => result.error)?.error;
  if (manualUpdateError) return { error: manualUpdateError.message };

  revalidatePath(`/app/parties/${partyId}/shopping`);
  revalidatePath(`/app/parties/${partyId}/costs`);
  revalidatePath(`/app/parties/${partyId}/menu`);
  return { error: null, itemCount: generatedRows.length + manualItems.length };
}

export async function regenerateShoppingList(partyId: string) {
  const supabase = await createClient();
  const claim = await claimPartyRefresh(supabase, partyId, "shopping");
  if (!claim.token) return { error: claim.error };

  let success = false;
  try {
    const result = await regenerateShoppingListUnlocked(partyId);
    success = !result.error;
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not regenerate shopping data." };
  } finally {
    await finishPartyRefresh(supabase, partyId, "shopping", claim.token, success);
  }
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
