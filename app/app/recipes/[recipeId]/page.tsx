import Link from "next/link";
import { ArrowLeft, Clock3, PencilLine, Users } from "lucide-react";
import { notFound } from "next/navigation";
import {
  enrichCookbookRecipe,
  enrichIngredients,
  formatIngredientLine,
  mockCookbookRecipes,
  parseInstructionSteps,
  type CookbookIngredient,
  type CookbookRecipe,
} from "@/lib/cookbook";
import { formatMinutes } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { AddToPartyMenuButton } from "@/components/cookbook/add-to-party-menu-button";

export default async function RecipeViewPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const supabase = await createClient();

  let recipe: CookbookRecipe | null = null;
  let ingredients: CookbookIngredient[] = [];
  let parties: Array<{ id: string; name: string; starts_at: string | null }> = [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: recipeRow } = await supabase
      .from("recipes")
      .select(
        "id, title, course, description, image_url, prep_minutes, cook_minutes, servings, allergy_notes, status, cuisine, instructions, source_url",
      )
      .eq("id", recipeId)
      .maybeSingle();

    if (recipeRow) {
      recipe = enrichCookbookRecipe(recipeRow);
      const { data: ingredientRows } = await supabase
        .from("ingredients")
        .select("id, name, quantity, unit, preparation_note")
        .eq("recipe_id", recipeId)
        .order("sort_order", { ascending: true });
      ingredients = enrichIngredients(recipe.title, ingredientRows ?? []);
    }

    const { data: memberships } = await supabase
      .from("party_members")
      .select("party_id")
      .eq("user_id", user.id);
    const partyIds = [...new Set((memberships ?? []).map((row) => row.party_id))];
    if (partyIds.length > 0) {
      const { data: partyRows } = await supabase
        .from("parties")
        .select("id, name, starts_at")
        .in("id", partyIds);
      parties = partyRows ?? [];
    }
  }

  if (!recipe) {
    const mock = mockCookbookRecipes().find((item) => item.id === recipeId) ?? null;
    if (!mock) notFound();
    recipe = mock;
    ingredients = enrichIngredients(mock.title, []);
  }

  const steps = parseInstructionSteps(recipe.instructions);

  return (
    <div className="p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/app/recipes" className="editorial-link text-ink/60 hover:text-tomato">
            <ArrowLeft size={13} /> Back to cookbook
          </Link>
          <div className="flex flex-wrap gap-2">
            <AddToPartyMenuButton recipeId={recipe.id} recipeTitle={recipe.title} parties={parties} />
            <button className="btn-secondary">
              <PencilLine size={15} /> Edit
            </button>
          </div>
        </div>

        <article className="overflow-hidden border border-ink/15 bg-[#f8f4ec]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-72 bg-ink lg:min-h-full">
              <img
                src={recipe.image_url || "/photos/party-04.webp"}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="p-6 md:p-8">
              <p className="eyebrow text-tomato">{recipe.course || "Recipe"}</p>
              <h1 className="mt-3 font-editorial text-5xl font-semibold leading-[0.92] md:text-6xl">
                {recipe.title}
              </h1>
              <p className="mt-5 text-sm leading-relaxed text-ink/58 md:text-[15px]">
                {recipe.description || "A saved dinner-party recipe."}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="chip">
                  <Clock3 size={13} /> {formatMinutes(recipe.prep_minutes)} prep
                </span>
                <span className="chip">{formatMinutes(recipe.cook_minutes)} cook</span>
                <span className="chip">
                  <Users size={13} /> {recipe.servings} servings
                </span>
                {recipe.allergy_notes ? (
                  <span className="chip border-tomato/30 text-tomato">{recipe.allergy_notes}</span>
                ) : null}
              </div>
              {recipe.source_url ? (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="editorial-link mt-6 text-tomato"
                >
                  Original source
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-0 border-t border-ink/15 lg:grid-cols-2">
            <section className="border-b border-ink/15 p-6 md:p-8 lg:border-b-0 lg:border-r">
              <p className="eyebrow">Ingredients</p>
              <h2 className="mt-2 font-editorial text-3xl font-semibold">What you need</h2>
              {ingredients.length === 0 ? (
                <p className="mt-5 text-sm text-ink/50">No ingredients saved for this recipe yet.</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {ingredients.map((ingredient, index) => (
                    <li
                      key={ingredient.id ?? `${ingredient.name}-${index}`}
                      className="border-b border-ink/10 pb-3 text-sm leading-relaxed text-ink/70 last:border-b-0"
                    >
                      {formatIngredientLine(ingredient)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="p-6 md:p-8">
              <p className="eyebrow">Method</p>
              <h2 className="mt-2 font-editorial text-3xl font-semibold">Instructions</h2>
              {steps.length === 0 ? (
                <p className="mt-5 text-sm text-ink/50">No instructions saved for this recipe yet.</p>
              ) : (
                <ol className="mt-5 space-y-4">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-4">
                      <span className="font-editorial text-2xl text-tomato/80">{String(index + 1).padStart(2, "0")}</span>
                      <p className="pt-1 text-sm leading-relaxed text-ink/70">{step}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
