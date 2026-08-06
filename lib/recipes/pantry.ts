import { standardizeIngredientKey } from "@/lib/recipes/standardize";

const GROCERY_CATEGORIES = ["Produce", "Dairy", "Meat", "Dry Goods", "Spices", "Other"] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

export const INGREDIENT_GROCERY_CATEGORIES: GroceryCategory[] = [...GROCERY_CATEGORIES];

/** Map free-form / legacy AI categories onto shopping aisles (never "Pantry"). */
export function normalizeIngredientCategory(raw: string | null | undefined): GroceryCategory {
  const value = (raw ?? "").trim();
  if (!value) return "Other";

  const lower = value.toLowerCase();
  const exact = GROCERY_CATEGORIES.find((item) => item.toLowerCase() === lower);
  if (exact) return exact;

  if (lower.includes("vegetable") || lower.includes("fruit") || lower === "produce") return "Produce";
  if (lower.includes("dairy") || lower.includes("egg")) return "Dairy";
  if (lower.includes("meat") || lower.includes("seafood") || lower.includes("protein")) return "Meat";
  if (lower.includes("spice") || lower.includes("seasoning")) return "Spices";
  if (
    lower === "pantry" ||
    lower.includes("bakery") ||
    lower.includes("canned") ||
    lower.includes("grocery") ||
    lower.includes("dry")
  ) {
    return "Dry Goods";
  }
  return "Other";
}

export function pantryKeySet(pantryNames: string[]): Set<string> {
  return new Set(
    pantryNames
      .map((name) => standardizeIngredientKey(name))
      .filter(Boolean),
  );
}

export function isInUserPantry(name: string, pantryKeys: Set<string>): boolean {
  const key = standardizeIngredientKey(name);
  if (!key) return false;
  if (pantryKeys.has(key)) return true;
  // Allow pantry staple "olive oil" to match ingredient "oil" only when keys equal after aliasing.
  return false;
}

export function applyPantryFlags<T extends { name: string; pantry_flag?: boolean }>(
  ingredients: T[],
  pantryNames: string[],
): T[] {
  const keys = pantryKeySet(pantryNames);
  return ingredients.map((item) => ({
    ...item,
    pantry_flag: isInUserPantry(item.name, keys),
  }));
}
