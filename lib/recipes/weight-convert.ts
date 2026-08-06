import "server-only";

import { roundQuantity } from "@/lib/recipes/quantity";
import { standardizeIngredientKey } from "@/lib/recipes/standardize";

export type WeightSystem = "US" | "Metric";
export type WeightUnit = "oz" | "g";

const COUNT_OR_MISC_UNITS = new Set([
  "each",
  "strip",
  "strips",
  "stalk",
  "stalks",
  "rib",
  "ribs",
  "clove",
  "cloves",
  "piece",
  "pieces",
  "cube",
  "cubes",
  "leaf",
  "leaves",
  "sprig",
  "sprigs",
  "head",
  "heads",
  "bunch",
  "bunches",
  "can",
  "cans",
  "package",
  "packages",
  "pkg",
  "pinch",
  "pinches",
  "whole",
  "medium",
  "large",
  "small",
]);

/** Approximate edible grams per 1 count-unit for common pantry items (fallback without AI). */
const FALLBACK_GRAMS: Record<string, Partial<Record<string, number>>> = {
  garlic: { clove: 3, each: 3 },
  onion: { each: 150 },
  "bay leaf": { each: 0.2, leaf: 0.2 },
  bacon: { strip: 28, each: 28 },
  celery: { stalk: 40, rib: 40 },
  egg: { each: 50 },
  eggs: { each: 50 },
  lemon: { each: 85 },
  lime: { each: 70 },
  potato: { each: 170 },
  potatoes: { each: 170 },
  parsley: { bunch: 30, sprig: 1 },
  "chicken bouillon": { cube: 4 },
  "bouillon cube": { cube: 4 },
};

type AiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function getAiConfig(): AiConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  };
}

export function normalizeUnitToken(unit: string | null | undefined): string {
  return (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
}

export function isCountOrMiscUnit(unit: string | null | undefined): boolean {
  const token = normalizeUnitToken(unit);
  if (!token) return true; // unitless → treat as count/misc needing weight
  return COUNT_OR_MISC_UNITS.has(token);
}

export function preferredWeightUnit(system: WeightSystem): WeightUnit {
  return system === "Metric" ? "g" : "oz";
}

export function gramsToPreferred(grams: number, system: WeightSystem): { quantity: number; unit: WeightUnit } {
  if (system === "Metric") {
    return { quantity: roundQuantity(grams) ?? grams, unit: "g" };
  }
  return { quantity: roundQuantity(grams / 28.3495) ?? grams / 28.3495, unit: "oz" };
}

function fallbackGrams(name: string, unit: string): number | null {
  const key = standardizeIngredientKey(name);
  const unitToken = normalizeUnitToken(unit) || "each";
  const byIngredient = FALLBACK_GRAMS[key];
  if (byIngredient?.[unitToken] != null) return byIngredient[unitToken]!;
  // Generic count fallbacks
  if (unitToken === "pinch") return 0.3;
  if (unitToken === "sprig") return 1;
  if (unitToken === "clove") return 3;
  if (unitToken === "strip") return 28;
  if (unitToken === "stalk" || unitToken === "rib") return 40;
  if (unitToken === "cube") return 4;
  if (unitToken === "leaf") return 0.5;
  if (unitToken === "each" || unitToken === "whole" || unitToken === "piece") return 28;
  if (unitToken === "can") return 400;
  if (unitToken === "package" || unitToken === "pkg") return 340;
  if (unitToken === "bunch") return 60;
  if (unitToken === "head") return 500;
  return null;
}

async function aiGramsPerUnit(name: string, unit: string): Promise<number | null> {
  const config = getAiConfig();
  if (!config) return null;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Convert cooking count/misc units to edible weight. Return ONLY JSON {"grams_per_unit": number}. Use typical grocery edible yield for 1 unit (e.g. 1 strip bacon, 1 stalk celery, 1 clove garlic). grams_per_unit must be > 0.',
        },
        {
          role: "user",
          content: JSON.stringify({
            ingredient: standardizeIngredientKey(name),
            unit: normalizeUnitToken(unit) || "each",
          }),
        },
      ],
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}") as {
      grams_per_unit?: unknown;
    };
    const grams = Number(parsed.grams_per_unit);
    return Number.isFinite(grams) && grams > 0 ? grams : null;
  } catch {
    return null;
  }
}

/**
 * Convert count/misc units (strip, stalk, each, …) into preferred weight (oz or g).
 * Leaves true volume/weight units unchanged.
 */
export async function convertToPreferredWeight(options: {
  name: string;
  quantity: number | null;
  unit: string | null;
  system: WeightSystem;
}): Promise<{ quantity: number | null; unit: string | null; converted: boolean }> {
  const qty = options.quantity;
  const unit = options.unit;
  if (!isCountOrMiscUnit(unit)) {
    return { quantity: roundQuantity(qty), unit, converted: false };
  }

  const count = qty == null || !Number.isFinite(qty) || qty <= 0 ? 1 : qty;
  const unitToken = normalizeUnitToken(unit) || "each";
  let gramsPer = fallbackGrams(options.name, unitToken);
  if (gramsPer == null) {
    gramsPer = await aiGramsPerUnit(options.name, unitToken);
  }
  if (gramsPer == null) {
    // Last resort: 1 oz / 28 g per count so costing still works
    gramsPer = options.system === "Metric" ? 28 : 28.3495;
  }

  const preferred = gramsToPreferred(count * gramsPer, options.system);
  return {
    quantity: preferred.quantity,
    unit: preferred.unit,
    converted: true,
  };
}

/** Convert a unit price between compatible weight units. */
export function convertWeightPrice(
  pricePerUnit: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  const from = normalizeUnitToken(fromUnit);
  const to = normalizeUnitToken(toUnit);
  if (from === to) return pricePerUnit;

  const toGrams: Record<string, number> = {
    g: 1,
    kg: 1000,
    oz: 28.3495,
    lb: 453.592,
  };
  if (!(from in toGrams) || !(to in toGrams)) return null;
  // price is per `from` unit → per gram → per `to` unit
  const perGram = pricePerUnit / toGrams[from];
  return roundQuantity(perGram * toGrams[to]);
}
