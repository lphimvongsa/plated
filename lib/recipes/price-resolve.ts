import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { lookupIngredientPrice, upsertIngredientPrice } from "@/lib/recipes/cost";
import { estimateIngredientPriceWithAi } from "@/lib/recipes/price-ai";
import { roundQuantity } from "@/lib/recipes/quantity";
import { guessIngredientCategory, standardizeIngredientKey } from "@/lib/recipes/standardize";
import {
  convertWeightPrice,
  isCountOrMiscUnit,
  normalizeUnitToken,
  preferredWeightUnit,
  type WeightSystem,
} from "@/lib/recipes/weight-convert";

export type ResolvedPrice = {
  canonical_key: string;
  price_per_unit: number;
  unit: string;
  source: "seed" | "ai" | "manual" | "existing" | "converted" | "fallback";
};

/** Rough USD per ounce by grocery category — last-resort so lists never show $0.00. */
const CATEGORY_PRICE_PER_OZ: Record<string, number> = {
  Meat: 0.45,
  Dairy: 0.28,
  Produce: 0.12,
  "Dry Goods": 0.18,
  Pantry: 0.18, // legacy category label
  Spices: 1.25,
  Other: 0.3,
};

/** Grams in one “package unit” for converting seeded count/volume prices → weight. */
const SEED_UNIT_TO_GRAMS: Record<string, number> = {
  // weight
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
  // volume (water-ish / cooking approximations)
  tsp: 5,
  tbsp: 15,
  "fl oz": 29.57,
  cup: 240,
  ml: 1,
  l: 1000,
  // count (generic edible yield when ingredient-specific unknown)
  each: 100,
  whole: 100,
  clove: 3,
  strip: 28,
  stalk: 40,
  rib: 40,
  piece: 30,
  cube: 4,
  leaf: 0.5,
  sprig: 1,
  bunch: 60,
  head: 500,
  can: 400,
  package: 340,
  pkg: 340,
  pinch: 0.3,
};

function pricePerOzFromSeed(pricePerUnit: number, seedUnit: string): number | null {
  const unit = normalizeUnitToken(seedUnit);
  const grams = SEED_UNIT_TO_GRAMS[unit];
  if (grams == null || grams <= 0) return null;
  const perGram = pricePerUnit / grams;
  return perGram * 28.3495;
}

function categoryFallbackPerOz(name: string, category?: string | null): number {
  const cat = category?.trim() || guessIngredientCategory(name);
  return CATEGORY_PRICE_PER_OZ[cat] ?? CATEGORY_PRICE_PER_OZ.Other;
}

function toTargetUnit(pricePerOz: number, targetUnit: string): number {
  const target = normalizeUnitToken(targetUnit) || "oz";
  if (target === "oz") return pricePerOz;
  const converted = convertWeightPrice(pricePerOz, "oz", target);
  return converted ?? pricePerOz;
}

/**
 * Resolve a usable unit price for grocery costing.
 * Cascade: exact match → convert seed → AI → category fallback.
 * Always returns a price when name is non-empty.
 */
export async function resolveIngredientUnitPrice(
  supabase: SupabaseClient<Database>,
  options: {
    name: string;
    unit: string | null;
    category?: string | null;
    system?: WeightSystem;
    persist?: boolean;
  },
): Promise<ResolvedPrice> {
  const key = standardizeIngredientKey(options.name) || options.name.toLowerCase().trim();
  const system = options.system ?? "US";
  const targetUnit =
    normalizeUnitToken(options.unit) ||
    (isCountOrMiscUnit(options.unit) ? preferredWeightUnit(system) : preferredWeightUnit(system));

  const existing = await lookupIngredientPrice(supabase, key);
  if (existing) {
    const existingUnit = normalizeUnitToken(existing.unit);

    if (existingUnit === targetUnit) {
      return {
        canonical_key: key,
        price_per_unit: existing.price_per_unit,
        unit: targetUnit,
        source: "existing",
      };
    }

    const weightConverted = convertWeightPrice(existing.price_per_unit, existingUnit, targetUnit);
    if (weightConverted != null) {
      if (options.persist !== false) {
        await upsertIngredientPrice(supabase, key, targetUnit, weightConverted, "ai");
      }
      return {
        canonical_key: key,
        price_per_unit: weightConverted,
        unit: targetUnit,
        source: "converted",
      };
    }

    const perOz = pricePerOzFromSeed(existing.price_per_unit, existingUnit);
    if (perOz != null) {
      const price = roundQuantity(toTargetUnit(perOz, targetUnit)) ?? toTargetUnit(perOz, targetUnit);
      if (options.persist !== false) {
        await upsertIngredientPrice(supabase, key, targetUnit, price, "ai");
      }
      return {
        canonical_key: key,
        price_per_unit: price,
        unit: targetUnit,
        source: "converted",
      };
    }
  }

  const estimated = await estimateIngredientPriceWithAi(key, targetUnit);
  if (estimated) {
    let price = estimated.price_per_unit;
    let priceUnit = normalizeUnitToken(estimated.unit) || targetUnit;
    if (priceUnit !== targetUnit) {
      const asWeight = convertWeightPrice(price, priceUnit, targetUnit);
      if (asWeight != null) {
        price = asWeight;
        priceUnit = targetUnit;
      } else {
        const perOz = pricePerOzFromSeed(price, priceUnit);
        if (perOz != null) {
          price = toTargetUnit(perOz, targetUnit);
          priceUnit = targetUnit;
        }
      }
    }
    price = roundQuantity(price) ?? price;
    if (options.persist !== false) {
      await upsertIngredientPrice(supabase, key, priceUnit, price, "ai");
    }
    return {
      canonical_key: key,
      price_per_unit: price,
      unit: priceUnit,
      source: "ai",
    };
  }

  const fallbackPerOz = categoryFallbackPerOz(options.name, options.category);
  const price = roundQuantity(toTargetUnit(fallbackPerOz, targetUnit)) ?? fallbackPerOz;
  if (options.persist !== false) {
    await upsertIngredientPrice(supabase, key, targetUnit, price, "ai");
  }
  return {
    canonical_key: key,
    price_per_unit: price,
    unit: targetUnit,
    source: "fallback",
  };
}
