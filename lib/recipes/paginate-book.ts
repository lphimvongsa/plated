import { formatGroceryQuantity } from "@/lib/recipes/quantity";

export type BookIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  preparation_note: string | null;
  section: string | null;
  sort_order: number | null;
};

export type BookStep = {
  title: string;
  description: string | null;
  duration_minutes: number | null;
  task: string | null;
  sort_order: number | null;
};

export type BookRecipe = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  servings: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  course: string | null;
  cuisine: string | null;
  difficulty: string | null;
  notes: string | null;
  instructions: string | null;
  import_status: string | null;
  color_hex?: string | null;
  cover_text_color?: string | null;
  ingredients: BookIngredient[];
  steps: BookStep[];
};

export type BookPage =
  | { kind: "recipe-cover"; recipe: BookRecipe }
  | {
      kind: "recipe-main";
      recipe: BookRecipe;
      stepLines: string[];
      stepOffset: number;
      continuationCount: number;
    }
  | {
      kind: "recipe-continuation";
      recipe: BookRecipe;
      stepLines: string[];
      stepOffset: number;
      part: number;
      parts: number;
    }
  | { kind: "blank"; recipeId?: string | null };

const FIRST_PAGE_STEPS = 5;
const CONTINUATION_STEPS = 7;

export function formatIngredientLine(ingredient: BookIngredient): string {
  const qty = formatGroceryQuantity(ingredient.quantity);
  const unit = ingredient.unit?.trim() ?? "";
  const prep = ingredient.preparation_note?.trim();
  const lead = [qty, unit].filter(Boolean).join(" ");
  const base = lead ? `${lead} ${ingredient.name}` : ingredient.name;
  return prep ? `${base}, ${prep}` : base;
}

export function stepLinesForRecipe(recipe: BookRecipe): string[] {
  if (recipe.steps.length > 0) {
    return [...recipe.steps]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((step, index) => {
        const body = step.description?.trim();
        const title = step.title.trim() || `Step ${index + 1}`;
        if (body && body !== title) return `${title} — ${body}`;
        return title;
      });
  }

  if (!recipe.instructions?.trim()) return [];
  return recipe.instructions
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Build a physical two-page cookbook. Every recipe starts on the left-hand page:
 * hero cover on the left, editorial recipe page on the right, then continuation
 * instruction pages as needed. A decorative blank is inserted after a recipe
 * whenever needed so the next recipe begins on a left page again.
 */
export function paginateCookbook(recipes: BookRecipe[]): BookPage[] {
  const pages: BookPage[] = [];

  if (recipes.length === 0) return [{ kind: "blank" }, { kind: "blank" }];

  for (const recipe of recipes) {
    if (pages.length % 2 === 1) pages.push({ kind: "blank" });

    const steps = stepLinesForRecipe(recipe);
    const firstSteps = steps.slice(0, FIRST_PAGE_STEPS);
    const continuation = chunk(steps.slice(FIRST_PAGE_STEPS), CONTINUATION_STEPS);

    pages.push({ kind: "recipe-cover", recipe });
    pages.push({
      kind: "recipe-main",
      recipe,
      stepLines: firstSteps,
      stepOffset: 0,
      continuationCount: continuation.length,
    });

    continuation.forEach((stepLines, index) => {
      pages.push({
        kind: "recipe-continuation",
        recipe,
        stepLines,
        stepOffset: FIRST_PAGE_STEPS + index * CONTINUATION_STEPS,
        part: index + 1,
        parts: continuation.length,
      });
    });

    if (pages.length % 2 === 1) pages.push({ kind: "blank", recipeId: recipe.id });
  }

  if (pages.length % 2 === 1) pages.push({ kind: "blank" });
  return pages;
}

export function recipeStartPageMap(pages: BookPage[]) {
  const map = new Map<string, number>();
  pages.forEach((page, index) => {
    if (page.kind === "recipe-cover" && !map.has(page.recipe.id)) map.set(page.recipe.id, index);
  });
  return map;
}

export function recipePageIndicesMap(pages: BookPage[]) {
  const map = new Map<string, number[]>();
  pages.forEach((page, index) => {
    const recipeId = page.kind === "blank" ? page.recipeId : page.recipe.id;
    if (!recipeId) return;
    const list = map.get(recipeId) ?? [];
    list.push(index);
    map.set(recipeId, list);
  });
  return map;
}
