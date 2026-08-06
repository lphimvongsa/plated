import type { ImportRecipeDraft, PartialExtract } from "@/lib/recipes/import/types";
import type { ParsedIngredient, ParsedStep } from "@/lib/recipes/parse-text";
import { normalizeIngredientCategory } from "@/lib/recipes/pantry";
import { roundQuantity } from "@/lib/recipes/quantity";
import {
  displayIngredientName,
  guessIngredientCategory,
  shortStepLabel,
  standardizeIngredientKey,
  titleCaseTask,
} from "@/lib/recipes/standardize";
import { convertVolume, convertWeight, isVolumeUnit, isWeightUnit } from "@/lib/recipes/units";

export function hasRecipeSignal(extract: PartialExtract | null | undefined): boolean {
  if (!extract) return false;
  const ingredients = extract.ingredients?.length ?? 0;
  const steps = extract.steps?.length ?? 0;
  return Boolean(extract.title) || ingredients > 0 || steps > 0;
}

export function assessImportStatus(draft: Pick<ImportRecipeDraft, "recipe" | "ingredients" | "steps">): {
  import_status: "complete" | "incomplete";
  warnings: string[];
} {
  const warnings: string[] = [];
  const title = draft.recipe.title?.trim() || "Untitled recipe";
  if (!title || title === "Untitled recipe") warnings.push("Could not detect a title.");
  if (!draft.recipe.course?.trim()) warnings.push("Select a recipe category before saving.");
  if (draft.ingredients.length < 2) warnings.push("Fewer than 2 ingredients detected.");
  if (!draft.steps.length) warnings.push("No instruction steps detected.");

  const missingQty = draft.ingredients.filter((item) => item.quantity == null || !item.unit).length;
  if (missingQty > 0) warnings.push(`${missingQty} ingredient(s) need quantity/unit review.`);

  const complete =
    title !== "Untitled recipe" &&
    draft.ingredients.length >= 2 &&
    draft.steps.length >= 1 &&
    missingQty === 0;

  return { import_status: complete ? "complete" : "incomplete", warnings };
}

export function mergeToDraft(options: {
  extract: PartialExtract;
  sourceType: ImportRecipeDraft["import_source_type"];
  extraWarnings?: string[];
}): ImportRecipeDraft {
  const ingredients = (options.extract.ingredients ?? []).map((item, index) => {
    const name = displayIngredientName(item.name);
    return {
      ...item,
      name,
      section: item.section ?? null,
      preparation_note: item.preparation_note ?? null,
      allergen_tags: item.allergen_tags ?? [],
      category: normalizeIngredientCategory(item.category?.trim() || guessIngredientCategory(name)),
      pantry_flag: false,
      sort_order: item.sort_order ?? index,
    };
  });
  const steps = (options.extract.steps ?? []).map((item, index) => {
    const description = (item.description || item.title || "").trim();
    const titleLooksLikeBody =
      !item.title ||
      item.title === description ||
      item.title.length > 28 ||
      item.title.includes("…");
    return {
      ...item,
      description,
      title: titleLooksLikeBody ? shortStepLabel(description, index) : item.title.trim(),
      task: titleCaseTask(item.task),
      sort_order: item.sort_order ?? index,
    };
  });

  const recipe = {
    title: options.extract.title?.trim() || "Untitled recipe",
    description: options.extract.description ?? null,
    servings: options.extract.servings && options.extract.servings > 0 ? options.extract.servings : 4,
    prep_minutes: options.extract.prep_minutes ?? null,
    cook_minutes: options.extract.cook_minutes ?? null,
    total_minutes:
      options.extract.total_minutes ??
      ((options.extract.prep_minutes ?? 0) + (options.extract.cook_minutes ?? 0) || null),
    course: options.extract.course ?? null,
    cuisine: options.extract.cuisine ?? null,
    difficulty: null as string | null,
    tags: [] as string[],
    dietary_tags: [] as string[],
    allergy_tags: [] as string[],
    image_url: options.extract.image_url ?? null,
    source_url: options.extract.source_url ?? null,
    equipment: options.extract.equipment ?? [],
    notes: options.extract.notes ?? null,
    make_ahead_notes: null as string | null,
    storage_notes: null as string | null,
    reheating_notes: null as string | null,
  };

  const mergedIngredients = mergeDuplicateIngredients(coerceIngredientQuantities(ingredients));
  const assessed = assessImportStatus({ recipe, ingredients: mergedIngredients, steps });
  return {
    recipe: { ...recipe, import_status: assessed.import_status },
    ingredients: mergedIngredients,
    steps,
    import_status: assessed.import_status,
    import_source_type: options.sourceType,
    warnings: [...(options.extract.warnings ?? []), ...(options.extraWarnings ?? []), ...assessed.warnings],
  };
}

export function coerceIngredientQuantities(ingredients: ParsedIngredient[]): ParsedIngredient[] {
  return ingredients.map((item, index) => {
    if (item.quantity != null && item.unit) return { ...item, sort_order: item.sort_order ?? index };
    return {
      ...item,
      quantity: item.quantity ?? 1,
      unit: item.unit ?? "each",
      sort_order: item.sort_order ?? index,
    };
  });
}

const COUNT_UNIT_ALIASES = new Set([
  "each",
  "ea",
  "piece",
  "pieces",
  "whole",
  "unit",
  "units",
  "count",
]);

function normalizeMergeUnit(unit: string | null | undefined): string {
  const raw = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!raw) return "each";
  if (raw.startsWith("cup")) return "cup";
  if (raw.startsWith("tbsp") || raw.startsWith("tablespoon")) return "tbsp";
  if (raw.startsWith("tsp") || raw.startsWith("teaspoon")) return "tsp";
  if (raw === "oz" || raw.startsWith("ounce")) return "oz";
  if (raw.startsWith("lb") || raw.startsWith("pound")) return "lb";
  if (raw === "g" || raw.startsWith("gram")) return "g";
  if (raw === "kg" || raw.startsWith("kilogram")) return "kg";
  if (raw === "ml" || raw.startsWith("milliliter") || raw.startsWith("millilitre")) return "ml";
  if (raw === "l" || raw.startsWith("liter") || raw.startsWith("litre")) return "l";
  if (COUNT_UNIT_ALIASES.has(raw)) return "each";
  if (raw === "cloves") return "clove";
  if (raw === "strips") return "strip";
  if (raw === "stalks" || raw === "ribs") return "stalk";
  if (raw === "sprigs") return "sprig";
  return raw;
}

function joinUniqueNotes(notes: Array<string | null | undefined>): string | null {
  const unique = [
    ...new Set(
      notes
        .map((note) => note?.trim())
        .filter((note): note is string => Boolean(note)),
    ),
  ];
  return unique.length ? unique.join("; ") : null;
}

function convertQuantityToUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  const from = normalizeMergeUnit(fromUnit);
  const to = normalizeMergeUnit(toUnit);
  if (from === to) return quantity;
  if (COUNT_UNIT_ALIASES.has(from) && COUNT_UNIT_ALIASES.has(to)) return quantity;
  if (isVolumeUnit(from) && isVolumeUnit(to)) return convertVolume(quantity, from, to);
  if (isWeightUnit(from) && isWeightUnit(to)) return convertWeight(quantity, from, to);
  return null;
}

/**
 * Collapse same grocery item listed under multiple components into one totalled row.
 * e.g. Thai chilis for sauce + Thai chilis for meat → one ingredient with summed qty.
 */
export function mergeDuplicateIngredients(ingredients: ParsedIngredient[]): ParsedIngredient[] {
  const groups = new Map<string, ParsedIngredient[]>();
  for (const item of ingredients) {
    const key = standardizeIngredientKey(item.name);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const merged: ParsedIngredient[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]!);
      continue;
    }

    const base = group[0]!;
    const targetUnit = normalizeMergeUnit(base.unit);
    let totalQty = typeof base.quantity === "number" ? base.quantity : 0;
    let canSumAll = typeof base.quantity === "number";
    const sections = new Set(
      group.map((item) => item.section?.trim()).filter((section): section is string => Boolean(section)),
    );

    for (const item of group.slice(1)) {
      if (typeof item.quantity !== "number") {
        canSumAll = false;
        continue;
      }
      const converted = convertQuantityToUnit(item.quantity, item.unit ?? targetUnit, targetUnit);
      if (converted == null) {
        canSumAll = false;
        continue;
      }
      totalQty += converted;
    }

    const allergenTags = [
      ...new Set(group.flatMap((item) => item.allergen_tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
    ];

    merged.push({
      ...base,
      name: displayIngredientName(base.name),
      quantity: canSumAll ? roundQuantity(totalQty) : base.quantity,
      unit: targetUnit,
      section: sections.size === 1 ? [...sections][0]! : null,
      preparation_note: joinUniqueNotes([
        ...group.map((item) => item.preparation_note),
        sections.size > 1 ? "divided" : null,
      ]),
      allergen_tags: allergenTags,
      pantry_flag: group.some((item) => item.pantry_flag),
      sort_order: Math.min(...group.map((item) => item.sort_order ?? 0)),
    });
  }

  return merged
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item, index) => ({ ...item, sort_order: index }));
}

export function ensureStepDurations(steps: ParsedStep[]): ParsedStep[] {
  return steps.map((item, index) => ({
    ...item,
    duration_minutes: item.duration_minutes ?? Math.max(5, 15 - Math.min(index, 8)),
    sort_order: item.sort_order ?? index,
  }));
}
