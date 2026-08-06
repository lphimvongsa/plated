import { GroceryOwnedToggle, GroceryPurchasedToggle } from "@/components/party/shopping-toggles";
import { createClient } from "@/lib/supabase/server";
import { CircleDollarSign, PackageCheck, Plus, ShoppingBasket } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ShoppingPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, planning_guest_count")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) notFound();

  const { data: items } = await supabase
    .from("grocery_items")
    .select("*")
    .eq("party_id", partyId)
    .order("sort_order");

  const allItems = items ?? [];
  const owned = allItems.filter((item) => item.already_owned);
  const buyList = allItems.filter((item) => !item.already_owned);
  const purchased = buyList.filter((item) => item.purchased);
  const total = buyList.reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const purchasedTotal = purchased.reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const pantrySavings = owned.reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const split = Math.max(1, party.planning_guest_count || 1);

  const groups = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const key = item.category?.trim() || "Other";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Scaled shopping list</p>
          <h2 className="mt-2 font-editorial text-5xl font-semibold">Buy only what the table needs.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">
            Ingredients are consolidated across recipes and organized by store section. Mark pantry items to remove them
            from the estimate.
          </p>
        </div>
        <button className="btn-primary" disabled>
          <Plus size={16} /> Add item
        </button>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Remaining estimate</p>
            <CircleDollarSign className="text-tomato" size={20} />
          </div>
          <p className="mt-3 font-editorial text-4xl font-semibold">${total.toFixed(2)}</p>
          <p className="mt-2 text-xs text-ink/45">After pantry items</p>
        </article>
        <article className="card p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Purchased</p>
            <PackageCheck className="text-olive" size={20} />
          </div>
          <p className="mt-3 font-editorial text-4xl font-semibold">
            {purchased.length}/{buyList.length}
          </p>
          <p className="mt-2 text-xs text-ink/45">${purchasedTotal.toFixed(2)} checked off</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Pantry savings</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">${pantrySavings.toFixed(2)}</p>
          <p className="mt-2 text-xs text-ink/45">{owned.length} items already owned</p>
        </article>
        <article className="rounded-[1.75rem] bg-orange p-5 text-paper">
          <p className="eyebrow !text-paper/60">Party split</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">${(total / split).toFixed(2)}</p>
          <p className="mt-2 text-xs text-paper/65">
            per person · {split} ways
          </p>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {allItems.length === 0 ? (
            <article className="card p-8 text-center">
              <p className="font-editorial text-3xl font-semibold">Shopping list is empty.</p>
              <p className="mt-3 text-sm text-ink/50">Grocery items will appear here once recipes are scaled.</p>
            </article>
          ) : null}
          {[...groups.entries()].map(([groupName, groupItems]) => (
            <article key={groupName} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
                <h3 className="font-editorial text-2xl font-semibold">{groupName}</h3>
                <span className="chip">{groupItems.length} items</span>
              </div>
              <div className="divide-y divide-ink/8">
                {groupItems.map((item) => {
                  const isOwned = item.already_owned;
                  const isPurchased = item.purchased;
                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:px-5 ${isOwned || isPurchased ? "bg-olive/5" : ""}`}
                    >
                      <GroceryPurchasedToggle
                        itemId={item.id}
                        partyId={partyId}
                        purchased={isPurchased}
                        owned={isOwned}
                      />
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${isPurchased || isOwned ? "text-ink/45 line-through" : ""}`}>
                          {item.ingredient_name}
                        </p>
                        <p className="mt-1 text-xs text-ink/45">
                          {[item.required_quantity, item.unit].filter(Boolean).join(" ") || "Quantity TBD"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">${(item.estimated_cost ?? 0).toFixed(2)}</p>
                        <GroceryOwnedToggle itemId={item.id} partyId={partyId} owned={isOwned} />
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
            <ShoppingBasket size={21} className="text-tomato" />
            <h3 className="mt-5 font-editorial text-3xl font-semibold">Pantry check</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/55">
              You marked {owned.length} items as available. Before shopping, confirm that you have enough for the scaled
              menu.
            </p>
          </article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper">
            <p className="eyebrow !text-paper/50">Measurement mode</p>
            <p className="mt-3 font-editorial text-2xl font-semibold">US customary</p>
            <p className="mt-2 text-xs text-paper/50">Convert the entire list at any time.</p>
          </article>
        </aside>
      </section>
    </div>
  );
}
