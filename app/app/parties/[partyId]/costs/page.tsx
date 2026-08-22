import { CostsPanel } from "@/components/party/costs-panel";
import { ShoppingSyncBanner } from "@/components/party/shopping-sync-banner";
import { getPartyCostSummary } from "@/lib/party/cost-summary";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function CostsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const [{ data: party }, { data: grocery }, { data: menuItems }] = await Promise.all([
    supabase
      .from("parties")
      .select("id, planning_guest_count, shopping_dirty")
      .eq("id", partyId)
      .maybeSingle(),
    supabase
      .from("grocery_items")
      .select("estimated_cost, actual_cost, already_owned, purchased")
      .eq("party_id", partyId),
    supabase.from("menu_items").select("recipe_id, sort_order").eq("party_id", partyId).order("sort_order"),
  ]);
  if (!party) notFound();
  const summary = await getPartyCostSummary(supabase, partyId, {
    party,
    grocery: grocery ?? [],
    menuItems: menuItems ?? [],
  });

  const actualLogged = (grocery ?? []).reduce((sum, item) => sum + (item.actual_cost ?? 0), 0);

  return (
    <div className="space-y-8">
      {party.shopping_dirty ? <ShoppingSyncBanner partyId={partyId} /> : null}
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
    </div>
  );
}
