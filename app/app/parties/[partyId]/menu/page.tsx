import { MenuBuilder } from "@/components/party/menu-builder";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { notFound } from "next/navigation";
import { parseAllergyList } from "@/lib/rsvp";
import { normalizeAllergenTag, allergenDisplayName } from "@/lib/allergens";

export default async function MenuPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const userId = await getAuthenticatedUserId();
  if (!userId) notFound();

  const [{ data: party }, { data: cookbookRows }, { data: partyRecipeRows }, { data: menuItems }, { data: grocery }, { data: guestRows }] = await Promise.all([
    supabase
      .from("parties")
      .select("id, service_style, planning_guest_count, shopping_dirty")
      .eq("id", partyId)
      .maybeSingle(),
    supabase
      .from("recipes")
      .select("id, title, course, image_url, servings")
      .eq("owner_id", userId)
      .is("party_id", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("recipes")
      .select("id, title, course, image_url, prep_minutes, cook_minutes, allergy_notes, estimated_cost, servings")
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
    supabase.from("guests").select("name,allergies,rsvp_status").eq("party_id", partyId).in("rsvp_status", ["attending", "maybe"]),
  ]);
  if (!party) notFound();


  const partyRecipeIds = (partyRecipeRows ?? []).map((recipe) => recipe.id);
  const { data: ingredientRows } = partyRecipeIds.length
    ? await supabase.from("ingredients").select("recipe_id,name,allergen_tags").in("recipe_id", partyRecipeIds)
    : { data: [] as Array<{ recipe_id: string; name: string; allergen_tags: string[] }> };
  const guestAllergies = (guestRows ?? []).flatMap((guest) =>
    parseAllergyList(guest.allergies).map((value) => ({ guest: guest.name, raw: value, normalized: normalizeAllergenTag(value) })),
  );
  const conflictsByRecipe = new Map<string, string[]>();
  for (const ingredient of ingredientRows ?? []) {
    const ingredientName = ingredient.name.toLowerCase();
    const tags = (ingredient.allergen_tags ?? []).map(normalizeAllergenTag);
    for (const allergy of guestAllergies) {
      const raw = allergy.raw.toLowerCase();
      const tagMatch = tags.includes(allergy.normalized);
      const ingredientMatch = ingredientName === raw || ingredientName.includes(raw) || raw.includes(ingredientName);
      if (!tagMatch && !ingredientMatch) continue;
      const label = tagMatch ? allergenDisplayName(allergy.normalized) : ingredient.name;
      const list = conflictsByRecipe.get(ingredient.recipe_id) ?? [];
      const message = `${label} · ${allergy.guest}`;
      if (!list.includes(message)) list.push(message);
      conflictsByRecipe.set(ingredient.recipe_id, list);
    }
  }

  const menuRecipeIds = new Set((menuItems ?? []).map((item) => item.recipe_id));
  // `menu_items` always points at party-scoped recipe copies. We already
  // fetched those recipes above, so reuse them instead of issuing a second,
  // sequential recipe query for the menu subset.
  const recipeById = new Map((partyRecipeRows ?? []).map((recipe) => [recipe.id, recipe]));
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
        allergy_notes: conflictsByRecipe.get(recipe.id)?.join("; ") || recipe.allergy_notes,
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
