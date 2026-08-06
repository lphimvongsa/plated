import { CostsPanel } from "@/components/party/costs-panel";
import { regenerateShoppingList } from "@/lib/actions/shopping";
import { getPartyCostSummary } from "@/lib/party/cost-summary";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function CostsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, shopping_dirty")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) notFound();

  // Fallback if background refresh has not finished yet.
  if (party.shopping_dirty) {
    try {
      await regenerateShoppingList(partyId);
    } catch {
      // Keep reading current grocery snapshot.
    }
  }

  const summary = await getPartyCostSummary(supabase, partyId);

  const [{ data: groceryActuals }] = await Promise.all([
    supabase.from("grocery_items").select("actual_cost").eq("party_id", partyId),
  ]);

  const actualLogged = (groceryActuals ?? []).reduce((sum, item) => sum + (item.actual_cost ?? 0), 0);

  return (
    <CostsPanel
      estimate={summary.estimatedTotal}
      actualLogged={actualLogged}
      recipes={summary.dishes.map((dish) => ({
        id: dish.id,
        title: dish.title,
        image_url: dish.image_url,
        estimated_cost: dish.scaled_cost,
        servings: dish.servings,
      }))}
      guestCount={summary.guestCount}
    />
  );
}
