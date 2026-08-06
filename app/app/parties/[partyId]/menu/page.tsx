import { MenuBuilder } from "@/components/party/menu-builder";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function MenuPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, service_style, planning_guest_count")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) notFound();

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, course, sort_order, recipe_id")
    .eq("party_id", partyId)
    .order("sort_order");

  const recipeIds = [...new Set((menuItems ?? []).map((item) => item.recipe_id))];
  const { data: recipeRows } =
    recipeIds.length > 0
      ? await supabase
          .from("recipes")
          .select("id, title, course, image_url, prep_minutes, cook_minutes, allergy_notes, estimated_cost, servings")
          .in("id", recipeIds)
      : { data: [] as Array<{
          id: string;
          title: string;
          course: string | null;
          image_url: string | null;
          prep_minutes: number | null;
          cook_minutes: number | null;
          allergy_notes: string | null;
          estimated_cost: number | null;
          servings: number;
        }> };

  const recipeById = new Map((recipeRows ?? []).map((recipe) => [recipe.id, recipe]));
  const recipes = (menuItems ?? [])
    .map((item) => {
      const recipe = recipeById.get(item.recipe_id);
      if (!recipe) return null;
      return {
        id: recipe.id,
        title: recipe.title,
        course: item.course ?? recipe.course,
        image_url: recipe.image_url,
        prep_minutes: recipe.prep_minutes,
        cook_minutes: recipe.cook_minutes,
        allergy_notes: recipe.allergy_notes,
        estimated_cost: recipe.estimated_cost,
        servings: recipe.servings,
      };
    })
    .filter((recipe): recipe is NonNullable<typeof recipe> => Boolean(recipe));

  const { data: invite } = await supabase
    .from("invites")
    .select("token")
    .eq("party_id", partyId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <MenuBuilder
      partyId={partyId}
      serviceStyle={party.service_style}
      planningGuests={party.planning_guest_count}
      previewToken={invite?.token ?? null}
      initialRecipes={recipes}
    />
  );
}
