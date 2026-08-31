import { RecipeEditor } from "@/components/recipe/recipe-editor";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { notFound, redirect } from "next/navigation";

export default async function PartyRecipePage({
  params,
}: {
  params: Promise<{ partyId: string; recipeId: string }>;
}) {
  const { partyId, recipeId } = await params;
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();

  if (!userId) redirect("/auth/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .eq("party_id", partyId)
    .maybeSingle();

  if (!recipe) notFound();

  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase.from("ingredients").select("*").eq("recipe_id", recipeId).order("sort_order"),
    supabase.from("recipe_steps").select("*").eq("recipe_id", recipeId).order("sort_order"),
  ]);

  return (
    <RecipeEditor
      mode="edit"
      recipe={recipe}
      ingredients={ingredients ?? []}
      steps={steps ?? []}
      partyId={partyId}
      isPartyRecipe
      backHref={`/app/parties/${partyId}/recipes`}
    />
  );
}
