import { CookbookBook } from "@/components/recipe/cookbook-book";
import type { BookIngredient, BookRecipe, BookStep } from "@/lib/recipes/paginate-book";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CookbookPage() {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/auth/login");

  const { data: recipeRows } = await supabase
    .from("recipes")
    .select("id, title, description, image_url, servings, prep_minutes, cook_minutes, course, cuisine, difficulty, notes, instructions, import_status, color_hex, cover_text_color")
    .is("party_id", null)
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  const recipes = recipeRows ?? [];
  const recipeIds = recipes.map((recipe) => recipe.id);
  const [{ data: ingredientRows }, { data: stepRows }] = recipeIds.length === 0
    ? [{ data: [] as never[] }, { data: [] as never[] }]
    : await Promise.all([
        supabase
          .from("ingredients")
          .select("recipe_id, name, quantity, unit, preparation_note, section, sort_order")
          .in("recipe_id", recipeIds)
          .order("sort_order"),
        supabase
          .from("recipe_steps")
          .select("recipe_id, title, description, duration_minutes, task, sort_order")
          .in("recipe_id", recipeIds)
          .order("sort_order"),
      ]);

  const ingredientsByRecipe = new Map<string, BookIngredient[]>();
  for (const row of ingredientRows ?? []) {
    const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
    list.push({
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      preparation_note: row.preparation_note,
      section: row.section,
      sort_order: row.sort_order,
    });
    ingredientsByRecipe.set(row.recipe_id, list);
  }

  const stepsByRecipe = new Map<string, BookStep[]>();
  for (const row of stepRows ?? []) {
    const list = stepsByRecipe.get(row.recipe_id) ?? [];
    list.push({
      title: row.title,
      description: row.description,
      duration_minutes: row.duration_minutes,
      task: row.task,
      sort_order: row.sort_order,
    });
    stepsByRecipe.set(row.recipe_id, list);
  }

  const bookRecipes: BookRecipe[] = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    image_url: recipe.image_url,
    servings: recipe.servings,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    course: recipe.course,
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    notes: recipe.notes,
    instructions: recipe.instructions,
    import_status: recipe.import_status,
    color_hex: recipe.color_hex,
    cover_text_color: recipe.cover_text_color,
    ingredients: ingredientsByRecipe.get(recipe.id) ?? [],
    steps: stepsByRecipe.get(recipe.id) ?? [],
  }));

  return (
    <div className="h-[calc(100dvh-62px-76px)] overflow-hidden md:h-dvh">
      <CookbookBook recipes={bookRecipes} />
    </div>
  );
}
