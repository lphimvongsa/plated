import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type PartyDishCost = {
  id: string;
  title: string;
  image_url: string | null;
  servings: number;
  /** Base recipe cost (unscaled). */
  estimated_cost: number;
  /** Cost scaled to planning guest count. */
  scaled_cost: number;
};

export type PartyCostSummary = {
  guestCount: number;
  shoppingDirty: boolean;
  /** Sum of grocery lines still to buy (not owned). Includes purchased estimates. */
  estimatedTotal: number;
  /** Sum of grocery lines not owned and not purchased. */
  remainingTotal: number;
  purchasedTotal: number;
  pantrySavings: number;
  dishes: PartyDishCost[];
  /** Sum of scaled dish costs (attribution; may differ slightly from grocery consolidation). */
  dishTotal: number;
};

/**
 * Single read model for Menu / Groceries / Costs totals.
 * Estimated total always comes from grocery_items for the current menu scale.
 * Dish rows come from menu_items only (never all party recipes).
 */
export async function getPartyCostSummary(
  supabase: SupabaseClient<Database>,
  partyId: string,
): Promise<PartyCostSummary> {
  const [{ data: party }, { data: grocery }, { data: menuItems }] = await Promise.all([
    supabase
      .from("parties")
      .select("planning_guest_count, shopping_dirty")
      .eq("id", partyId)
      .maybeSingle(),
    supabase
      .from("grocery_items")
      .select("estimated_cost, already_owned, purchased")
      .eq("party_id", partyId),
    supabase
      .from("menu_items")
      .select("recipe_id, sort_order")
      .eq("party_id", partyId)
      .order("sort_order"),
  ]);

  const guestCount = Math.max(1, party?.planning_guest_count || 1);
  const shoppingDirty = Boolean(party?.shopping_dirty);

  const items = grocery ?? [];
  const estimatedTotal = items
    .filter((item) => !item.already_owned)
    .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const remainingTotal = items
    .filter((item) => !item.already_owned && !item.purchased)
    .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const purchasedTotal = items
    .filter((item) => !item.already_owned && item.purchased)
    .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const pantrySavings = items
    .filter((item) => item.already_owned)
    .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);

  const recipeIds = (menuItems ?? []).map((item) => item.recipe_id);
  const { data: recipes } = recipeIds.length
    ? await supabase
        .from("recipes")
        .select("id, title, image_url, estimated_cost, servings")
        .in("id", recipeIds)
    : { data: [] as Array<{
        id: string;
        title: string;
        image_url: string | null;
        estimated_cost: number | null;
        servings: number;
      }> };

  const recipeById = new Map((recipes ?? []).map((recipe) => [recipe.id, recipe]));
  const dishes: PartyDishCost[] = (menuItems ?? [])
    .map((item) => {
      const recipe = recipeById.get(item.recipe_id);
      if (!recipe) return null;
      const base = recipe.estimated_cost ?? 0;
      const servings = recipe.servings || guestCount;
      const scaled = Math.round(base * (guestCount / servings) * 100) / 100;
      return {
        id: recipe.id,
        title: recipe.title,
        image_url: recipe.image_url,
        servings: recipe.servings,
        estimated_cost: base,
        scaled_cost: scaled,
      };
    })
    .filter((row): row is PartyDishCost => Boolean(row));

  const dishTotal = Math.round(dishes.reduce((sum, dish) => sum + dish.scaled_cost, 0) * 100) / 100;

  return {
    guestCount,
    shoppingDirty,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    remainingTotal: Math.round(remainingTotal * 100) / 100,
    purchasedTotal: Math.round(purchasedTotal * 100) / 100,
    pantrySavings: Math.round(pantrySavings * 100) / 100,
    dishes,
    dishTotal,
  };
}
