import { CookbookImportButton } from "@/components/recipe/cookbook-import-button";
import { CookbookView } from "@/components/recipe/cookbook-view";
import type { BookIngredient, BookRecipe, BookStep } from "@/lib/recipes/paginate-book";
import { createClient } from "@/lib/supabase/server";
import { FolderPlus } from "lucide-react";
import { redirect } from "next/navigation";

const collections = [
  ["Dinner party tested", "18 recipes", "/photos/party-04.webp"],
  ["Summer things", "11 recipes", "/photos/party-01.webp"],
  ["Desserts worth making", "7 recipes", "/photos/party-08.webp"],
];

export default async function CookbookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: recipeRows } = await supabase
    .from("recipes")
    .select(
      "id, title, description, image_url, servings, prep_minutes, cook_minutes, course, cuisine, difficulty, notes, instructions, import_status",
    )
    .is("party_id", null)
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const recipes = recipeRows ?? [];
  const recipeIds = recipes.map((recipe) => recipe.id);

  const [{ data: ingredientRows }, { data: stepRows }] =
    recipeIds.length === 0
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
    ingredients: ingredientsByRecipe.get(recipe.id) ?? [],
    steps: stepsByRecipe.get(recipe.id) ?? [],
  }));

  const cardRecipes = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    course: recipe.course,
    image_url: recipe.image_url,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    cuisine: recipe.cuisine,
    import_status: recipe.import_status,
  }));

  return (
    <div className="p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Your cookbook</p>
            <h1 className="mt-2 font-editorial text-5xl font-semibold md:text-6xl">
              Recipes worth inviting people over for.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-ink/55">
              Flip through your recipes like a real book — or switch to the grid in Settings.
            </p>
          </div>
          <CookbookImportButton />
        </section>

        <CookbookView recipes={cardRecipes} bookRecipes={bookRecipes} />

        <section>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Collections</p>
              <h2 className="mt-2 font-editorial text-4xl font-semibold">Your shelves</h2>
            </div>
            <button type="button" className="text-sm font-bold text-tomato">
              <FolderPlus size={15} className="mr-1 inline" /> New collection
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {collections.map(([name, count, image], i) => (
              <article
                key={name}
                className={`group relative min-h-64 overflow-hidden rounded-[1.75rem] bg-ink text-paper shadow-card ${i === 1 ? "md:translate-y-3" : ""}`}
              >
                <img
                  src={image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-editorial text-3xl font-semibold">{name}</p>
                  <p className="mt-2 text-xs text-paper/60">{count}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
