import { CostsPanel } from "@/components/party/costs-panel";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function CostsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, planning_guest_count")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) notFound();

  const [{ data: grocery }, { data: recipes }] = await Promise.all([
    supabase
      .from("grocery_items")
      .select("estimated_cost, actual_cost, already_owned")
      .eq("party_id", partyId),
    supabase
      .from("recipes")
      .select("id, title, image_url, estimated_cost, servings")
      .eq("party_id", partyId),
  ]);

  const groceryEstimate = (grocery ?? [])
    .filter((item) => !item.already_owned)
    .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const recipeEstimate = (recipes ?? []).reduce((sum, recipe) => sum + (recipe.estimated_cost ?? 0), 0);
  const estimate = groceryEstimate || recipeEstimate;
  const actualLogged = (grocery ?? []).reduce((sum, item) => sum + (item.actual_cost ?? 0), 0);

  return (
    <CostsPanel
      estimate={estimate}
      actualLogged={actualLogged}
      recipes={recipes ?? []}
      guestCount={party.planning_guest_count}
    />
  );
}
