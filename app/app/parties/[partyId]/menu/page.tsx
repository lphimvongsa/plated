import { MenuBuilder } from "@/components/party/menu-builder";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function MenuPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: party }, { data: cookbookRows }, { data: partyRecipeRows }, { data: menuItems }, { data: grocery }] = await Promise.all([
    supabase
      .from("parties")
      .select("id, service_style, planning_guest_count, shopping_dirty")
      .eq("id", partyId)
      .maybeSingle(),
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
    supabase
      .from("grocery_items")
      .select("estimated_cost, already_owned")
      .eq("party_id", partyId),
  ]);
  if (!party) notFound();

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
      const baseCost = recipe.estimated_cost ?? 0;
      const scaledCost = Math.round(baseCost * (party.planning_guest_count / (recipe.servings || 1)) * 100) / 100;
      return {
        id: recipe.id,
        title: recipe.title,
        course: item.course ?? recipe.course,
        image_url: recipe.image_url,
        prep_minutes: recipe.prep_minutes,
        cook_minutes: recipe.cook_minutes,
        allergy_notes: recipe.allergy_notes,
        estimated_cost: recipe.estimated_cost,
        scaled_cost: scaledCost,
        servings: recipe.servings,
      };
    })
    .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe));

  const partyRecipesOffMenu = (partyRecipeRows ?? []).filter((recipe) => !menuRecipeIds.has(recipe.id));
  const groceryEstimatedTotal = Math.round(
    (grocery ?? [])
      .filter((item) => !item.already_owned)
      .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0) * 100,
  ) / 100;

  return (
    <MenuBuilder
      partyId={partyId}
      serviceStyle={party.service_style}
      planningGuests={Math.max(1, party.planning_guest_count || 1)}
      initialRecipes={recipes}
      cookbookRecipes={cookbookRows ?? []}
      partyRecipesOffMenu={partyRecipesOffMenu}
      groceryEstimatedTotal={groceryEstimatedTotal}
    />
  );
}
