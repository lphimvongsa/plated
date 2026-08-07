import { recipes as mockRecipes } from "@/lib/mock-data";

export type CookbookRecipe = {
  id: string;
  title: string;
  course: string | null;
  description: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number;
  allergy_notes: string | null;
  status: string;
  cuisine: string | null;
  instructions: string | null;
  source_url: string | null;
};

export type CookbookIngredient = {
  id?: string;
  name: string;
  quantity: number | string | null;
  unit: string | null;
  preparation_note: string | null;
};

export type PartyOption = {
  id: string;
  name: string;
  starts_at: string | null;
};

function mockByTitle(title: string) {
  return mockRecipes.find((recipe) => recipe.title.toLowerCase() === title.toLowerCase());
}

export function enrichCookbookRecipe(recipe: CookbookRecipe): CookbookRecipe {
  const mock = mockByTitle(recipe.title);
  if (!mock) return recipe;

  const description =
    recipe.description && recipe.description.length > 48
      ? recipe.description
      : mock.description || recipe.description;

  return {
    ...recipe,
    description,
    image_url: recipe.image_url || mock.image,
    prep_minutes: recipe.prep_minutes ?? mock.prep_minutes,
    cook_minutes: recipe.cook_minutes ?? mock.cook_minutes,
    allergy_notes: recipe.allergy_notes ?? mock.allergy,
    instructions:
      recipe.instructions ||
      mock.instructions.map((step, index) => `${index + 1}. ${step}`).join("\n"),
  };
}

export function enrichIngredients(
  recipeTitle: string,
  ingredients: CookbookIngredient[],
): CookbookIngredient[] {
  if (ingredients.length > 0) return ingredients;
  const mock = mockByTitle(recipeTitle);
  if (!mock) return [];
  return mock.ingredients.map((item, index) => ({
    id: `mock-${index}`,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    preparation_note: item.note,
  }));
}

export function mockCookbookRecipes(): CookbookRecipe[] {
  return mockRecipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    course: recipe.course,
    description: recipe.description,
    image_url: recipe.image,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    servings: recipe.servings,
    allergy_notes: recipe.allergy,
    status: recipe.status,
    cuisine: null,
    instructions: recipe.instructions.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    source_url: null,
  }));
}

export function formatIngredientLine(ingredient: CookbookIngredient) {
  const amount = [ingredient.quantity, ingredient.unit].filter(Boolean).join(" ");
  const note = ingredient.preparation_note ? `, ${ingredient.preparation_note}` : "";
  return amount ? `${amount} ${ingredient.name}${note}` : `${ingredient.name}${note}`;
}

export function parseInstructionSteps(instructions: string | null | undefined) {
  if (!instructions?.trim()) return [];
  return instructions
    .split(/\n+/)
    .map((step) => step.replace(/^\d+[\).\s]+/, "").trim())
    .filter(Boolean);
}
