import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type IngredientForCost = { quantity: number | null; estimated_unit_cost: number | null; pantry_flag: boolean };

export function computeRecipeEstimatedCost(ingredients: IngredientForCost[], scaleFactor: number): number {
  return ingredients.reduce((sum, ing) => ing.pantry_flag ? sum : sum + (ing.quantity ?? 0) * scaleFactor * (ing.estimated_unit_cost ?? 0), 0);
}

export type PriceRow = { price_per_unit: number; unit: string; source: string };

export async function lookupIngredientPrices(
  supabase: SupabaseClient<Database>, key: string, currency = "USD", market = "US",
): Promise<PriceRow[]> {
  const { data } = await supabase.from("ingredient_prices")
    .select("price_per_unit, unit, source")
    .eq("canonical_key", key).eq("currency", currency).eq("market", market)
    .order("source", { ascending: false });
  return data ?? [];
}

export async function upsertIngredientPrice(
  supabase: SupabaseClient<Database>, key: string, unit: string, pricePerUnit: number,
  source: "seed" | "ai" | "manual" | "retail" = "manual", currency = "USD", market = "US",
): Promise<void> {
  const { data: protectedRow } = await supabase.from("ingredient_prices").select("source")
    .eq("canonical_key", key).eq("unit", unit).eq("currency", currency).eq("market", market).maybeSingle();
  if (source === "ai" && protectedRow && protectedRow.source !== "ai") return;
  await supabase.from("ingredient_prices").upsert({
    canonical_key: key, unit, price_per_unit: pricePerUnit, currency, market, source,
  }, { onConflict: "canonical_key,unit,currency,market" });
}
