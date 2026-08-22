import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { lookupIngredientPrices, upsertIngredientPrice } from "@/lib/recipes/cost";
import { estimateIngredientPriceWithAi } from "@/lib/recipes/price-ai";
import { roundQuantity } from "@/lib/recipes/quantity";
import { convertCatalogQuantity, convertToPreferredWeight, normalizeUnitToken, resolveCatalogIngredient, type WeightSystem } from "@/lib/recipes/weight-convert";

export type ResolvedPrice = { canonical_key: string; price_per_unit: number; unit: string; source: "seed" | "ai" | "manual" | "retail" | "converted" };

export async function resolveIngredientUnitPrice(
  supabase: SupabaseClient<Database>,
  options: { name: string; unit: string | null; category?: string | null; system?: WeightSystem; persist?: boolean; currency?: string; market?: string },
): Promise<ResolvedPrice | null> {
  const catalog = await resolveCatalogIngredient(supabase, options.name);
  const key = catalog?.canonical_key ?? options.name.trim().toLowerCase();
  const requested = normalizeUnitToken(options.unit) || catalog?.preferred_shopping_unit || (options.system === "Metric" ? "g" : "oz");
  const rows = await lookupIngredientPrices(supabase, key, options.currency, options.market);
  const priority = (source: string) => source === "manual" ? 0 : source === "retail" ? 1 : source === "seed" ? 2 : 3;
  rows.sort((a, b) => priority(a.source) - priority(b.source));
  const exact = rows.find((row) => normalizeUnitToken(row.unit) === requested);
  if (exact) return { canonical_key: key, price_per_unit: exact.price_per_unit, unit: requested, source: exact.source as ResolvedPrice["source"] };

  for (const row of rows) {
    const oneTargetInSource = convertCatalogQuantity(1, requested, row.unit, catalog?.density_g_per_ml ?? null);
    if (oneTargetInSource != null) return {
      canonical_key: key, unit: requested,
      price_per_unit: roundQuantity(oneTargetInSource * row.price_per_unit) ?? oneTargetInSource * row.price_per_unit,
      source: "converted",
    };
    const [{ data: requestedWeight }, { data: pricedWeight }] = await Promise.all([
      supabase.from("ingredient_unit_weights").select("grams_per_unit")
        .eq("canonical_key", key).eq("unit", requested).maybeSingle(),
      supabase.from("ingredient_unit_weights").select("grams_per_unit")
        .eq("canonical_key", key).eq("unit", normalizeUnitToken(row.unit)).maybeSingle(),
    ]);
    if (requestedWeight?.grams_per_unit && pricedWeight?.grams_per_unit) return {
      canonical_key: key, unit: requested,
      price_per_unit: row.price_per_unit * requestedWeight.grams_per_unit / pricedWeight.grams_per_unit,
      source: "converted",
    };
    const asWeight = await convertToPreferredWeight({ supabase, name: key, quantity: 1, unit: requested, system: "Metric", honorKeepCount: false, allowAi: false });
    if (asWeight.converted) {
      const gramsInPriceUnit = convertCatalogQuantity(1, row.unit, "g", catalog?.density_g_per_ml ?? null);
      if (gramsInPriceUnit) return { canonical_key: key, unit: requested, price_per_unit: row.price_per_unit * (asWeight.quantity ?? 0) / gramsInPriceUnit, source: "converted" };
    }
  }

  const estimated = await estimateIngredientPriceWithAi(key, requested);
  if (!estimated) return null;
  const price = roundQuantity(estimated.price_per_unit) ?? estimated.price_per_unit;
  if (catalog && options.persist !== false) await upsertIngredientPrice(supabase, key, requested, price, "ai", options.currency, options.market);
  return { canonical_key: key, price_per_unit: price, unit: requested, source: "ai" };
}
