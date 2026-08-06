import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type IngredientForCost = {
  quantity: number | null;
  estimated_unit_cost: number | null;
  pantry_flag: boolean;
};

export function computeRecipeEstimatedCost(
  ingredients: IngredientForCost[],
  scaleFactor: number,
): number {
  return ingredients.reduce((sum, ing) => {
    if (ing.pantry_flag) return sum;
    const qty = (ing.quantity ?? 0) * scaleFactor;
    const unitCost = ing.estimated_unit_cost ?? 0;
    return sum + qty * unitCost;
  }, 0);
}

export async function lookupIngredientPrice(
  supabase: SupabaseClient<Database>,
  key: string,
): Promise<{ price_per_unit: number; unit: string } | null> {
  const { data } = await supabase
    .from("ingredient_prices")
    .select("price_per_unit, unit")
    .eq("canonical_key", key)
    .maybeSingle();

  return data ?? null;
}

export async function upsertIngredientPrice(
  supabase: SupabaseClient<Database>,
  key: string,
  unit: string,
  pricePerUnit: number,
  source: "seed" | "ai" | "manual" = "manual",
): Promise<void> {
  await supabase.from("ingredient_prices").upsert(
    {
      canonical_key: key,
      unit,
      price_per_unit: pricePerUnit,
      currency: "USD",
      source,
    },
    { onConflict: "canonical_key" },
  );
}
