import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { resolveIngredientUnitPrice, type ResolvedPrice } from "@/lib/recipes/price-resolve";
import type { WeightSystem } from "@/lib/recipes/weight-convert";

export type EnsuredPrice = ResolvedPrice;

/**
 * Ensure a unit price exists for costing. Never returns null for a named ingredient —
 * falls back to category averages when seed/AI are unavailable.
 */
export async function ensureIngredientPrice(
  supabase: SupabaseClient<Database>,
  rawName: string,
  unit: string | null,
  options?: { category?: string | null; system?: WeightSystem },
): Promise<EnsuredPrice | null> {
  if (!rawName.trim()) return null;
  return resolveIngredientUnitPrice(supabase, {
    name: rawName,
    unit,
    category: options?.category,
    system: options?.system,
    persist: true,
  });
}
