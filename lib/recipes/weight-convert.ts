import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { roundQuantity } from "@/lib/recipes/quantity";
import { standardizeIngredientKey } from "@/lib/recipes/standardize";
import { convertVolume, convertWeight, isVolumeUnit, isWeightUnit } from "@/lib/recipes/units";

export type WeightSystem = "US" | "Metric";
export type WeightUnit = "oz" | "g";

const UNIT_ALIASES: Record<string, string> = {
  cloves: "clove", strips: "strip", stalks: "stalk", ribs: "rib", pieces: "piece",
  leaves: "leaf", sprigs: "sprig", heads: "head", bunches: "bunch", cans: "can",
  packages: "package", pkg: "package", eggs: "each", whole: "each",
  ounces: "oz", ounce: "oz", pounds: "lb", pound: "lb", grams: "g", gram: "g",
  teaspoons: "tsp", teaspoon: "tsp", tablespoons: "tbsp", tablespoon: "tbsp",
  cups: "cup", milliliters: "ml", milliliter: "ml", liters: "l", liter: "l",
};

const COUNT_UNITS = new Set([
  "each", "strip", "stalk", "rib", "clove", "piece", "cube", "leaf", "sprig",
  "head", "bunch", "can", "package", "pinch", "medium", "large", "small", "dozen",
]);

type CatalogIngredient = {
  canonical_key: string;
  display_name: string;
  category: string;
  preferred_shopping_unit: string;
  keep_count: boolean;
  density_g_per_ml: number | null;
};

export function normalizeUnitToken(unit: string | null | undefined): string {
  const token = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
  return UNIT_ALIASES[token] ?? token;
}

export function isCountOrMiscUnit(unit: string | null | undefined): boolean {
  const token = normalizeUnitToken(unit);
  return !token || COUNT_UNITS.has(token);
}

export function preferredWeightUnit(system: WeightSystem): WeightUnit {
  return system === "Metric" ? "g" : "oz";
}

export function gramsToPreferred(grams: number, system: WeightSystem) {
  const quantity = system === "Metric" ? grams : grams / 28.3495;
  return { quantity: roundQuantity(quantity) ?? quantity, unit: preferredWeightUnit(system) };
}

export async function resolveCatalogIngredient(
  supabase: SupabaseClient<Database>,
  rawName: string,
): Promise<CatalogIngredient | null> {
  const rawKey = standardizeIngredientKey(rawName);
  const { data: alias } = await supabase
    .from("ingredient_aliases")
    .select("canonical_key")
    .eq("alias_key", rawKey)
    .maybeSingle();
  const key = alias?.canonical_key ?? rawKey;
  const { data } = await supabase
    .from("grocery_ingredients")
    .select("canonical_key, display_name, category, preferred_shopping_unit, keep_count, density_g_per_ml")
    .eq("canonical_key", key)
    .eq("active", true)
    .maybeSingle();
  return data ?? null;
}

async function catalogGramsPerUnit(
  supabase: SupabaseClient<Database>, key: string, unit: string,
): Promise<number | null> {
  const { data } = await supabase.from("ingredient_unit_weights")
    .select("grams_per_unit").eq("canonical_key", key).eq("unit", unit).maybeSingle();
  return data?.grams_per_unit ?? null;
}

function clampAiWeight(unit: string, grams: number): number | null {
  const ranges: Record<string, [number, number]> = {
    clove: [0.5, 15], sprig: [0.05, 15], leaf: [0.02, 20], strip: [1, 100],
    stalk: [2, 400], rib: [2, 400], each: [0.1, 5000], bunch: [5, 1500],
    head: [20, 5000], can: [50, 2000], package: [10, 5000], pinch: [0.05, 2], cube: [1, 30],
  };
  const range = ranges[unit];
  return Number.isFinite(grams) && grams > 0 && (!range || (grams >= range[0] && grams <= range[1])) ? grams : null;
}

async function aiGramsPerUnit(name: string, unit: string): Promise<number | null> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.AI_MODEL?.trim() || "gpt-4o-mini", temperature: 0.1,
      response_format: { type: "json_object" }, messages: [
        { role: "system", content: "Return only JSON {\"grams_per_unit\":number}. Estimate edible grams for one stated grocery unit. Be conservative for small chilies, herbs, cloves, and leaves." },
        { role: "user", content: JSON.stringify({ ingredient: standardizeIngredientKey(name), unit }) },
      ] }),
  });
  if (!response.ok) return null;
  try {
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const grams = Number(JSON.parse(payload.choices?.[0]?.message?.content ?? "{}").grams_per_unit);
    return clampAiWeight(unit, grams);
  } catch { return null; }
}

export async function convertToPreferredWeight(options: {
  supabase: SupabaseClient<Database>;
  name: string;
  quantity: number | null;
  unit: string | null;
  system: WeightSystem;
  honorKeepCount?: boolean;
  allowAi?: boolean;
}): Promise<{ quantity: number | null; unit: string | null; converted: boolean; canonicalKey: string; catalog: CatalogIngredient | null }> {
  const catalog = await resolveCatalogIngredient(options.supabase, options.name);
  const key = catalog?.canonical_key ?? standardizeIngredientKey(options.name);
  const unit = normalizeUnitToken(options.unit) || "each";
  const quantity = options.quantity == null || !Number.isFinite(options.quantity) ? 1 : options.quantity;
  if (catalog?.keep_count && options.honorKeepCount !== false && isCountOrMiscUnit(unit)) {
    return { quantity: roundQuantity(quantity), unit, converted: false, canonicalKey: key, catalog };
  }
  if (!isCountOrMiscUnit(unit)) {
    return { quantity: roundQuantity(options.quantity), unit: options.unit, converted: false, canonicalKey: key, catalog };
  }
  let gramsPer = await catalogGramsPerUnit(options.supabase, key, unit);
  if (gramsPer == null && unit === "dozen") {
    const each = await catalogGramsPerUnit(options.supabase, key, "each");
    gramsPer = each == null ? null : each * 12;
  }
  if (gramsPer == null && options.allowAi !== false) gramsPer = await aiGramsPerUnit(options.name, unit);
  if (gramsPer == null) {
    return { quantity: roundQuantity(options.quantity), unit: options.unit, converted: false, canonicalKey: key, catalog };
  }
  const preferred = gramsToPreferred(quantity * gramsPer, options.system);
  return { ...preferred, converted: true, canonicalKey: key, catalog };
}

export function convertWeightPrice(price: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnitToken(fromUnit); const to = normalizeUnitToken(toUnit);
  if (from === to) return price;
  const grams = convertWeight(1, from, "g");
  const targetGrams = convertWeight(1, to, "g");
  return grams == null || targetGrams == null ? null : price * targetGrams / grams;
}

export function convertCatalogQuantity(quantity: number, fromUnit: string, toUnit: string, density: number | null): number | null {
  const from = normalizeUnitToken(fromUnit); const to = normalizeUnitToken(toUnit);
  if (from === to) return quantity;
  if (isWeightUnit(from) && isWeightUnit(to)) return convertWeight(quantity, from, to);
  if (isVolumeUnit(from) && isVolumeUnit(to)) return convertVolume(quantity, from, to);
  if (density && isVolumeUnit(from) && isWeightUnit(to)) {
    const ml = convertVolume(quantity, from, "ml"); return ml == null ? null : convertWeight(ml * density, "g", to);
  }
  if (density && isWeightUnit(from) && isVolumeUnit(to)) {
    const grams = convertWeight(quantity, from, "g"); return grams == null ? null : convertVolume(grams / density, "ml", to);
  }
  return null;
}
