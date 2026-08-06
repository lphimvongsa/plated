import { RecipesGrid } from "@/components/party/recipes-grid";
import { createClient } from "@/lib/supabase/server";

export default async function PartyRecipesPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, title, course, image_url, prep_minutes, cook_minutes, allergy_notes, servings")
    .eq("party_id", partyId)
    .order("created_at", { ascending: true });

  return <RecipesGrid recipes={recipes ?? []} partyId={partyId} />;
}
