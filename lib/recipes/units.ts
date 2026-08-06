import { standardizeIngredientKey } from "@/lib/recipes/standardize";

export type CanonicalUnit =
  | "tsp"
  | "tbsp"
  | "cup"
  | "fl oz"
  | "pt"
  | "qt"
  | "gal"
  | "ml"
  | "l"
  | "oz"
  | "lb"
  | "g"
  | "kg";

const VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
  "fl oz": 29.5735,
  pt: 473.176,
  qt: 946.353,
  gal: 3785.41,
  ml: 1,
  l: 1000,
};

const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.3495,
  lb: 453.592,
  g: 1,
  kg: 1000,
};

const US_VOLUME: CanonicalUnit[] = ["tsp", "tbsp", "cup", "fl oz", "pt", "qt", "gal"];
const METRIC_VOLUME: CanonicalUnit[] = ["ml", "l"];
const US_WEIGHT: CanonicalUnit[] = ["oz", "lb"];
const METRIC_WEIGHT: CanonicalUnit[] = ["g", "kg"];

export function canonicalKey(name: string): string {
  return standardizeIngredientKey(name);
}

export function scaleQuantity(
  qty: number | null,
  fromServings: number,
  toServings: number,
): number | null {
  if (qty == null || fromServings <= 0) return qty;
  return (qty * toServings) / fromServings;
}

export function convertVolume(value: number, from: string, to: string): number | null {
  const fromMl = VOLUME_TO_ML[from];
  const toMl = VOLUME_TO_ML[to];
  if (fromMl == null || toMl == null) return null;
  return (value * fromMl) / toMl;
}

export function convertWeight(value: number, from: string, to: string): number | null {
  const fromG = WEIGHT_TO_G[from];
  const toG = WEIGHT_TO_G[to];
  if (fromG == null || toG == null) return null;
  return (value * fromG) / toG;
}

export function isVolumeUnit(unit: string): boolean {
  return unit in VOLUME_TO_ML;
}

export function isWeightUnit(unit: string): boolean {
  return unit in WEIGHT_TO_G;
}

export function convertBetweenUsMetric(
  value: number,
  unit: string,
  targetSystem: "US" | "Metric",
  dimension: "volume" | "weight",
): { value: number; unit: CanonicalUnit } | null {
  if (dimension === "volume") {
    if (!isVolumeUnit(unit)) return null;
    const isUs = US_VOLUME.includes(unit as CanonicalUnit);
    if ((targetSystem === "US" && isUs) || (targetSystem === "Metric" && !isUs)) {
      return { value, unit: unit as CanonicalUnit };
    }
    const targetUnit: CanonicalUnit = targetSystem === "US" ? "cup" : "ml";
    const converted = convertVolume(value, unit, targetUnit);
    if (converted == null) return null;
    return { value: converted, unit: targetUnit };
  }

  if (!isWeightUnit(unit)) return null;
  const isUs = US_WEIGHT.includes(unit as CanonicalUnit);
  if ((targetSystem === "US" && isUs) || (targetSystem === "Metric" && !isUs)) {
    return { value, unit: unit as CanonicalUnit };
  }
  const targetUnit: CanonicalUnit = targetSystem === "US" ? "oz" : "g";
  const converted = convertWeight(value, unit, targetUnit);
  if (converted == null) return null;
  return { value: converted, unit: targetUnit };
}

export { US_VOLUME, METRIC_VOLUME, US_WEIGHT, METRIC_WEIGHT };
