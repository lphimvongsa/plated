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
  ingredients: BookIngredient[];
  steps: BookStep[];
};

export type BookPage =
  | { kind: "cover"; recipeCount: number }
  | {
      kind: "toc";
      entries: { title: string; pageIndex: number; course: string | null }[];
      part: number;
      parts: number;
    }
  | { kind: "recipe-hero"; recipe: BookRecipe }
  | {
      kind: "recipe-body";
      recipe: BookRecipe;
      ingredients: BookIngredient[];
      stepLines: string[];
      part: number;
      parts: number;
    }
  | { kind: "blank" };

const TOC_PER_PAGE = 14;
const INGREDIENTS_PER_PAGE = 12;
export const STEPS_PER_PAGE = 7;

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
    return recipe.steps.map((step, index) => {
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
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function padEven(pages: BookPage[]): BookPage[] {
  const next = [...pages];
  if (next.length % 2 === 1) next.push({ kind: "blank" });
  return next;
}

/** Build ordered flipbook pages for the whole cookbook. */
export function paginateCookbook(recipes: BookRecipe[]): BookPage[] {
  const pages: BookPage[] = [{ kind: "cover", recipeCount: recipes.length }];

  if (recipes.length === 0) {
    pages.push({
      kind: "toc",
      entries: [],
      part: 1,
      parts: 1,
    });
    return padEven(pages);
  }

  const tocChunks = chunk(
    recipes.map((recipe) => ({
      title: recipe.title,
      course: recipe.course,
      // filled after we know hero indexes
      pageIndex: 0,
    })),
    TOC_PER_PAGE,
  );

  // Reserve TOC slots, then fill page indexes once heroes are placed.
  const tocStart = pages.length;
  for (let i = 0; i < tocChunks.length; i++) {
    pages.push({
      kind: "toc",
      entries: tocChunks[i].map((entry) => ({ ...entry, pageIndex: 0 })),
      part: i + 1,
      parts: tocChunks.length,
    });
  }

  const heroIndexByRecipe = new Map<string, number>();

  for (const recipe of recipes) {
    heroIndexByRecipe.set(recipe.id, pages.length);
    pages.push({ kind: "recipe-hero", recipe });

    const ingredients = [...recipe.ingredients].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const steps = stepLinesForRecipe(recipe);
    const ingredientChunks = chunk(ingredients, INGREDIENTS_PER_PAGE);
    const stepChunks = chunk(steps, STEPS_PER_PAGE);
    const bodyCount = Math.max(ingredientChunks.length, stepChunks.length, 1);

    for (let i = 0; i < bodyCount; i++) {
      pages.push({
        kind: "recipe-body",
        recipe,
        ingredients: ingredientChunks[i] ?? [],
        stepLines: stepChunks[i] ?? [],
        part: i + 1,
        parts: bodyCount,
      });
    }
  }

  for (let t = 0; t < tocChunks.length; t++) {
    const page = pages[tocStart + t];
    if (page?.kind !== "toc") continue;
    page.entries = tocChunks[t].map((entry, index) => {
      const recipe = recipes[t * TOC_PER_PAGE + index];
      return {
        title: entry.title,
        course: entry.course,
        pageIndex: recipe ? (heroIndexByRecipe.get(recipe.id) ?? 0) : 0,
      };
    });
  }

  // Closing hard cover needs an even page count before the final blank isn't required —
  // showCover treats first/last as hard; pad so the book closes on a verso.
  return padEven(pages);
}
