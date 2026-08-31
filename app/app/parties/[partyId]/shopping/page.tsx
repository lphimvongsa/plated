import { GroceryOwnedToggle, GroceryPurchasedToggle } from "@/components/party/shopping-toggles";
import { ShoppingSyncBanner } from "@/components/party/shopping-sync-banner";
import { ReceiptScanner } from "@/components/party/receipt-scanner";
import { getPartyCostSummary } from "@/lib/party/cost-summary";
import { formatGroceryQuantity } from "@/lib/recipes/quantity";
import { createClient } from "@/lib/supabase/server";
import { CircleDollarSign, PackageCheck, Plus, ShoppingBasket } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ShoppingPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const [{ data: party }, { data: items }, { data: menuItems }, { data: recipeRows }] = await Promise.all([
    supabase
      .from("parties")
      .select("id, planning_guest_count, shopping_dirty")
      .eq("id", partyId)
      .maybeSingle(),
    supabase.from("grocery_items").select("*").eq("party_id", partyId).order("sort_order"),
    supabase.from("menu_items").select("recipe_id, sort_order").eq("party_id", partyId).order("sort_order"),
    supabase
      .from("recipes")
      .select("id, title, image_url, estimated_cost, servings")
      .eq("party_id", partyId),
  ]);
  if (!party) notFound();

  const allItems = items ?? [];
  const summary = await getPartyCostSummary(supabase, partyId, {
    party,
    grocery: allItems,
    menuItems: menuItems ?? [],
    recipes: recipeRows ?? [],
  });
  const recipeTitleById = new Map((recipeRows ?? []).map((recipe) => [recipe.id, recipe.title]));

  const owned = allItems.filter((item) => item.already_owned);
  const buyList = allItems.filter((item) => !item.already_owned);
  const purchased = buyList.filter((item) => item.purchased);
  const split = Math.max(1, summary.guestCount || 1);

  const groups = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const key = item.category?.trim() || "Other";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return (
    <div className="space-y-8">
      {party.shopping_dirty ? <ShoppingSyncBanner partyId={partyId} /> : null}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-5xl font-semibold">Grocery List</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReceiptScanner partyId={partyId} />
          <button className="btn-secondary" disabled>
            <Plus size={16} /> Add item
          </button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Estimated total</p>
            <CircleDollarSign className="text-tomato" size={20} />
          </div>
          <p className="mt-3 font-editorial text-4xl font-semibold">
            ${summary.estimatedTotal.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-ink/45">
            ${summary.remainingTotal.toFixed(2)} still to buy · matches Costs
          </p>
        </article>
        <article className="card p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Purchased</p>
            <PackageCheck className="text-olive" size={20} />
          </div>
          <p className="mt-3 font-editorial text-4xl font-semibold">
            {purchased.length}/{buyList.length}
          </p>
          <p className="mt-2 text-xs text-ink/45">${summary.purchasedTotal.toFixed(2)} checked off</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Pantry savings</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">${summary.pantrySavings.toFixed(2)}</p>
          <p className="mt-2 text-xs text-ink/45">{owned.length} items already owned</p>
        </article>
        <article className="rounded-[1.75rem] bg-orange p-5 text-paper">
          <p className="eyebrow !text-paper/60">Party split</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">
            ${(summary.estimatedTotal / split).toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-paper/65">per person · {split} ways</p>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {allItems.length === 0 ? (
            <article className="card p-8 text-center">
              <p className="font-editorial text-3xl font-semibold">Shopping list is empty.</p>
              <p className="mt-3 text-sm text-ink/50">
                Grocery items appear here once recipes are on the menu.
              </p>
            </article>
          ) : null}
          {Array.from(groups.entries()).map(([category, groupItems]) => (
            <article key={category} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
                <h3 className="font-editorial text-2xl font-semibold">{category}</h3>
                <span className="chip">{groupItems.length}</span>
              </div>
              <div className="divide-y divide-ink/8">
                {groupItems.map((item) => {
                  const sources = (item.source_recipe_ids ?? [])
                    .map((id) => recipeTitleById.get(id))
                    .filter(Boolean);
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${item.already_owned || item.purchased ? "opacity-55" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{item.ingredient_name}</p>
                        <p className="mt-1 text-xs text-ink/45">
                          {formatGroceryQuantity(item.quantity)}
                          {item.unit ? ` ${item.unit}` : ""}
                          {sources.length ? ` · ${sources.join(", ")}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">${(item.estimated_cost ?? 0).toFixed(2)}</p>
                        <GroceryOwnedToggle
                          itemId={item.id}
                          partyId={partyId}
                          owned={item.already_owned}
                        />
                        <GroceryPurchasedToggle
                          itemId={item.id}
                          partyId={partyId}
                          purchased={item.purchased}
                          owned={item.already_owned}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
        <aside className="space-y-4">
          <article className="card p-5">
            <div className="flex items-center gap-2">
              <ShoppingBasket size={18} className="text-tomato" />
              <p className="eyebrow">How totals work</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/55">
              Estimated total matches the Costs page: all non-pantry grocery lines for the current menu,
              scaled to {summary.guestCount} guests.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
