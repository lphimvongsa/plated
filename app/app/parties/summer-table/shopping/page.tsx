"use client";

import { shoppingGroups } from "@/lib/mock-data";
import { Check, ChevronDown, CircleDollarSign, PackageCheck, Plus, Search, ShoppingBasket } from "lucide-react";
import { useMemo, useState } from "react";

export default function ShoppingPage() {
  const allItems = shoppingGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.name })));
  const [owned, setOwned] = useState<number[]>(allItems.filter((item) => item.have).map((item) => item.id));
  const [purchased, setPurchased] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const total = useMemo(() => allItems.reduce((sum, item) => sum + (owned.includes(item.id) ? 0 : item.price), 0), [allItems, owned]);
  const purchasedTotal = useMemo(() => allItems.reduce((sum, item) => sum + (purchased.includes(item.id) && !owned.includes(item.id) ? item.price : 0), 0), [allItems, purchased, owned]);
  const toggle = (setter: React.Dispatch<React.SetStateAction<number[]>>, id: number) => setter((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]);
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">Scaled shopping list</p><h2 className="mt-2 font-editorial text-5xl font-semibold">Buy only what the table needs.</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">Ingredients are consolidated across four recipes and organized by store section. Mark pantry items to remove them from the estimate.</p></div>
        <button className="btn-primary"><Plus size={16} /> Add item</button>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5"><div className="flex items-center justify-between"><p className="eyebrow">Remaining estimate</p><CircleDollarSign className="text-tomato" size={20} /></div><p className="mt-3 font-editorial text-4xl font-semibold">${total.toFixed(2)}</p><p className="mt-2 text-xs text-ink/45">After pantry items</p></article>
        <article className="card p-5"><div className="flex items-center justify-between"><p className="eyebrow">Purchased</p><PackageCheck className="text-olive" size={20} /></div><p className="mt-3 font-editorial text-4xl font-semibold">{purchased.length}/{allItems.filter((x) => !owned.includes(x.id)).length}</p><p className="mt-2 text-xs text-ink/45">${purchasedTotal.toFixed(2)} checked off</p></article>
        <article className="card p-5"><p className="eyebrow">Pantry savings</p><p className="mt-3 font-editorial text-4xl font-semibold">${allItems.filter((x) => owned.includes(x.id)).reduce((s, x) => s + x.price, 0).toFixed(2)}</p><p className="mt-2 text-xs text-ink/45">{owned.length} items already owned</p></article>
        <article className="rounded-[1.75rem] bg-orange p-5 text-paper"><p className="eyebrow !text-paper/60">Party split</p><p className="mt-3 font-editorial text-4xl font-semibold">${(total / 12).toFixed(2)}</p><p className="mt-2 text-xs text-paper/65">per person · 12 ways</p></article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-ink/10 bg-white/35 p-3 sm:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="field pl-11" placeholder="Search ingredients" /></label><button className="btn-secondary">All stores <ChevronDown size={15} /></button></div>
          <div className="mt-5 space-y-4">{shoppingGroups.map((group) => {
            const items = group.items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
            if (!items.length) return null;
            return <article key={group.name} className="card overflow-hidden"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><h3 className="font-editorial text-2xl font-semibold">{group.name}</h3><span className="chip">{items.length} items</span></div><div className="divide-y divide-ink/8">{items.map((item) => {
              const isOwned = owned.includes(item.id); const isPurchased = purchased.includes(item.id);
              return <div key={item.id} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:px-5 ${isOwned || isPurchased ? "bg-olive/5" : ""}`}><button onClick={() => toggle(setPurchased, item.id)} disabled={isOwned} className={`grid h-7 w-7 place-items-center rounded-full border ${isPurchased ? "border-olive bg-olive text-paper" : isOwned ? "border-ink/10 bg-ink/10 text-ink/35" : "border-ink/25"}`}>{isPurchased || isOwned ? <Check size={14} /> : null}</button><div className="min-w-0"><p className={`text-sm font-semibold ${isPurchased || isOwned ? "text-ink/45 line-through" : ""}`}>{item.name}</p><p className="mt-1 text-xs text-ink/45">{item.amount} · from {item.id % 2 === 0 ? "2 recipes" : "1 recipe"}</p></div><div className="text-right"><p className="text-sm font-bold">${item.price.toFixed(2)}</p><button onClick={() => toggle(setOwned, item.id)} className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${isOwned ? "text-olive" : "text-tomato"}`}>{isOwned ? "In pantry" : "I have this"}</button></div></div>;
            })}</div></article>;
          })}</div>
        </div>
        <aside className="space-y-4">
          <article className="card p-5"><ShoppingBasket size={21} className="text-tomato" /><h3 className="mt-5 font-editorial text-3xl font-semibold">Pantry check</h3><p className="mt-3 text-sm leading-relaxed text-ink/55">You marked {owned.length} items as available. Before shopping, confirm that you have enough for the scaled menu.</p><button className="btn-secondary mt-5 w-full">Confirm quantities</button></article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper"><p className="eyebrow !text-paper/50">Measurement mode</p><p className="mt-3 font-editorial text-2xl font-semibold">US customary</p><p className="mt-2 text-xs text-paper/50">Convert the entire list at any time.</p><button className="mt-5 text-sm font-bold text-orange">Switch to metric →</button></article>
        </aside>
      </section>
    </div>
  );
}
