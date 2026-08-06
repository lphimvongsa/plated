import { MenuBuilder } from "@/components/party/menu-builder";
import { getPartyCostSummary } from "@/lib/party/cost-summary";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function MenuPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: party } = await supabase
    .from("parties")
    .select("id, service_style, planning_guest_count")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) notFound();

  const summary = await getPartyCostSummary(supabase, partyId);

  const [{ data: cookbookRows }, { data: partyRecipeRows }, { data: menuItems }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, course, image_url, servings")
      .eq("owner_id", user.id)
      .is("party_id", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("recipes")
      .select("id, title, course, image_url, servings")
      .eq("party_id", partyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("menu_items")
      .select("id, course, sort_order, recipe_id")
      .eq("party_id", partyId)
      .order("sort_order"),
  ]);

  const menuRecipeIds = new Set((menuItems ?? []).map((item) => item.recipe_id));
  const recipeIds = [...menuRecipeIds];

  const { data: recipeRows } =
    recipeIds.length > 0
      ? await supabase
          .from("recipes")
          .select(
            "id, title, course, image_url, prep_minutes, cook_minutes, allergy_notes, estimated_cost, servings",
          )
          .in("id", recipeIds)
      : {
          data: [] as Array<{
            id: string;
            title: string;
            course: string | null;
            image_url: string | null;
            prep_minutes: number | null;
            cook_minutes: number | null;
            allergy_notes: string | null;
            estimated_cost: number | null;
            servings: number;
          }>,
        };

  const recipeById = new Map((recipeRows ?? []).map((recipe) => [recipe.id, recipe]));
  const recipes = (menuItems ?? [])
    .map((item) => {
      const recipe = recipeById.get(item.recipe_id);
      if (!recipe) return null;
      const dish = summary.dishes.find((row) => row.id === recipe.id);
      return {
        id: recipe.id,
        title: recipe.title,
        course: item.course ?? recipe.course,
        image_url: recipe.image_url,
        prep_minutes: recipe.prep_minutes,
        cook_minutes: recipe.cook_minutes,
        allergy_notes: recipe.allergy_notes,
        estimated_cost: recipe.estimated_cost,
        scaled_cost: dish?.scaled_cost ?? null,
        servings: recipe.servings,
      };
    })
    .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe));

  const partyRecipesOffMenu = (partyRecipeRows ?? []).filter((recipe) => !menuRecipeIds.has(recipe.id));

  return (
    <MenuBuilder
      partyId={partyId}
      serviceStyle={party.service_style}
      planningGuests={summary.guestCount}
      initialRecipes={recipes}
      cookbookRecipes={cookbookRows ?? []}
      partyRecipesOffMenu={partyRecipesOffMenu}
      groceryEstimatedTotal={summary.estimatedTotal}
    />
  );
}
