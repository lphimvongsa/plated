"use client";

import { ReceiptScanner } from "@/components/party/receipt-scanner";
import { usePartyAccess } from "@/lib/party/access-client";
import { CircleDollarSign, FileScan, Receipt, Split } from "lucide-react";
import { useState } from "react";

export type CostRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  estimated_cost: number | null;
  servings: number;
};

export function CostsPanel({
  partyId,
  estimate,
  actualLogged,
  recipes,
  guestCount,
  receiptCount = 0,
}: {
  partyId: string;
  estimate: number;
  actualLogged: number;
  recipes: CostRecipe[];
  guestCount: number;
  receiptCount?: number;
}) {
  const [split, setSplit] = useState(Math.max(1, guestCount || 8));
  const [includeHost, setIncludeHost] = useState(true);
  const [includeHelpers, setIncludeHelpers] = useState(true);
  const [useAttending, setUseAttending] = useState(false);
  const effectiveSplit = useAttending ? Math.max(1, guestCount) : Math.max(1, split + (includeHost ? 0 : -1) + (includeHelpers ? 0 : -1));
  const { canEdit } = usePartyAccess();
  const remaining = Math.max(0, estimate - actualLogged);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-editorial text-4xl font-semibold sm:text-5xl">Cost Metrics</h2>
          <p className="mt-2 max-w-xl text-sm text-ink/45">Scan store receipts, review uncertain matches, and turn estimates into actual ingredient costs.</p>
        </div>
        {canEdit ? <ReceiptScanner partyId={partyId} /> : null}
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_.8fr_.8fr]">
        <article className="rounded-[1.9rem] bg-ink p-6 text-paper sm:col-span-2 md:p-8 xl:col-span-1">
          <p className="eyebrow !text-paper/50">Estimated total</p>
          <p className="mt-4 font-editorial text-5xl font-semibold sm:text-6xl">${estimate.toFixed(2)}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-paper/15">
            <div className="h-full rounded-full bg-orange" style={{ width: `${estimate ? Math.min(100, (actualLogged / estimate) * 100) : 0}%` }} />
          </div>
          <p className="mt-3 text-xs text-paper/50">${actualLogged.toFixed(2)} logged · ${remaining.toFixed(2)} remaining estimate</p>
        </article>
        <article className="card p-6">
          <p className="eyebrow">Actual spend</p>
          <p className="mt-4 font-editorial text-4xl font-semibold sm:text-5xl">${actualLogged.toFixed(2)}</p>
          <p className="mt-3 text-xs text-ink/45">{receiptCount ? `${receiptCount} receipt${receiptCount === 1 ? "" : "s"} saved` : actualLogged ? "From grocery actuals" : "No receipts yet"}</p>
        </article>
        <article className="rounded-[1.75rem] bg-orange p-6 text-paper">
          <p className="eyebrow !text-paper/55">Cost per person</p>
          <p className="mt-4 font-editorial text-4xl font-semibold sm:text-5xl">${(estimate / effectiveSplit).toFixed(2)}</p>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setSplit(Math.max(1, split - 1))} className="h-8 w-8 rounded-full border border-paper/30">−</button>
            <span className="min-w-20 text-center text-xs font-bold">{effectiveSplit} ways</span>
            <button onClick={() => setSplit(split + 1)} className="h-8 w-8 rounded-full border border-paper/30">+</button>
          </div>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <article className="card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 p-5 sm:p-6">
              <div><p className="eyebrow">By dish</p><h3 className="mt-2 font-editorial text-3xl font-semibold">Menu cost</h3></div>
              <span className="chip">{guestCount} servings</span>
            </div>
            <div className="divide-y divide-ink/8">
              {recipes.length === 0 ? <p className="p-5 text-sm text-ink/45">No dishes on the menu yet.</p> : recipes.map((recipe) => {
                const cost = recipe.estimated_cost ?? 0;
                return (
                  <div key={recipe.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[54px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={recipe.image_url || "/photos/party-04.webp"} alt="" className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14" />
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{recipe.title}</p><p className="mt-1 text-xs text-ink/45">${(cost / Math.max(1, guestCount)).toFixed(2)} per guest · scaled to {guestCount}</p></div>
                    <p className="col-start-2 font-editorial text-xl font-semibold sm:col-start-auto">${cost.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </article>
          <article className="card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 p-5 sm:p-6">
              <div><p className="eyebrow">Receipt history</p><h3 className="mt-2 font-editorial text-3xl font-semibold">Actual purchases</h3></div>
              <ReceiptScanner partyId={partyId} compact />
            </div>
            <div className="p-5">
              {actualLogged > 0 ? (
                <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white/35 p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-olive/10 text-olive"><Receipt size={19} /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Matched grocery purchases</p><p className="mt-1 text-xs text-ink/45">Receipt matches populate actual ingredient costs and check items off.</p></div>
                  <p className="font-editorial text-xl font-semibold">${actualLogged.toFixed(2)}</p>
                </div>
              ) : <p className="text-sm text-ink/45">Upload or photograph a receipt to start tracking actual spend.</p>}
            </div>
          </article>
        </div>
        <aside className="space-y-4">
          <article className="card p-5">
            <Split size={21} className="text-tomato" />
            <h3 className="mt-5 font-editorial text-3xl font-semibold">Split settings</h3>
            <div className="mt-5 space-y-3 text-sm">
              <label className="flex items-center justify-between gap-3"><span>Include host</span><input type="checkbox" checked={includeHost} onChange={(e)=>setIncludeHost(e.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Include helpers</span><input type="checkbox" checked={includeHelpers} onChange={(e)=>setIncludeHelpers(e.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Use attending guests</span><input type="checkbox" checked={useAttending} onChange={(e)=>setUseAttending(e.target.checked)} /></label>
            </div>
            <button className="btn-secondary mt-6 w-full" onClick={() => { const text = `plated. cost summary\nEstimated total: $${estimate.toFixed(2)}\nActual spend: $${actualLogged.toFixed(2)}\nSplit: ${effectiveSplit} ways\nEstimated per person: $${(estimate/effectiveSplit).toFixed(2)}`; const blob = new Blob([text], {type:"text/plain"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="plated-cost-summary.txt"; a.click(); URL.revokeObjectURL(url); }}>Create cost summary</button>
          </article>
          <article className="rounded-[1.75rem] bg-tomato p-5 text-paper">
            <FileScan size={21} />
            <h3 className="mt-5 font-editorial text-3xl font-semibold">Receipt matching</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/70">Receipt names are normalized, matched against your grocery list, and uncertain lines are held for review before anything changes.</p>
          </article>
        </aside>
      </section>
    </div>
  );
}
