"use client";

import { Modal } from "@/components/modal";
import { Check, FileScan, Receipt, Split, Upload } from "lucide-react";
import { useState } from "react";

export type CostRecipe = {
  id: string;
  title: string;
  image_url: string | null;
  estimated_cost: number | null;
  servings: number;
};

export function CostsPanel({
  estimate,
  actualLogged,
  recipes,
  guestCount,
}: {
  estimate: number;
  actualLogged: number;
  recipes: CostRecipe[];
  guestCount: number;
}) {
  const [split, setSplit] = useState(Math.max(1, guestCount || 8));
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const actual = scanned ? actualLogged + 74.16 : actualLogged;
  const remaining = Math.max(0, estimate - actual);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-5xl font-semibold">Cost Metrics</h2>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setScanned(false);
            setReceiptOpen(true);
          }}
        >
          <Receipt size={16} /> Upload receipt
        </button>
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr_.8fr]">
        <article className="rounded-[1.9rem] bg-ink p-6 text-paper md:p-8">
          <p className="eyebrow !text-paper/50">Estimated total</p>
          <p className="mt-4 font-editorial text-6xl font-semibold">${estimate.toFixed(2)}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-paper/15">
            <div
              className="h-full rounded-full bg-orange"
              style={{ width: `${estimate ? Math.min(100, (actual / estimate) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-paper/50">
            ${actual.toFixed(2)} logged · ${remaining.toFixed(2)} remaining estimate
          </p>
        </article>
        <article className="card p-6">
          <p className="eyebrow">Actual spend</p>
          <p className="mt-4 font-editorial text-5xl font-semibold">${actual.toFixed(2)}</p>
          <p className="mt-3 text-xs text-ink/45">{scanned ? "2 receipts matched" : actualLogged ? "From grocery actuals" : "No receipts yet"}</p>
        </article>
        <article className="rounded-[1.75rem] bg-orange p-6 text-paper">
          <p className="eyebrow !text-paper/55">Cost per person</p>
          <p className="mt-4 font-editorial text-5xl font-semibold">${(estimate / split).toFixed(2)}</p>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setSplit(Math.max(1, split - 1))} className="h-8 w-8 rounded-full border border-paper/30">
              −
            </button>
            <span className="min-w-20 text-center text-xs font-bold">{split} ways</span>
            <button onClick={() => setSplit(split + 1)} className="h-8 w-8 rounded-full border border-paper/30">
              +
            </button>
          </div>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <article className="card overflow-hidden">
            <div className="flex items-end justify-between border-b border-ink/10 p-6">
              <div>
                <p className="eyebrow">By dish</p>
                <h3 className="mt-2 font-editorial text-3xl font-semibold">Menu cost</h3>
              </div>
              <span className="chip">{guestCount} servings</span>
            </div>
            <div className="divide-y divide-ink/8">
              {recipes.length === 0 ? (
                <p className="p-5 text-sm text-ink/45">No dishes on the menu yet.</p>
              ) : (
                recipes.map((recipe) => {
                  const cost = recipe.estimated_cost ?? 0;
                  return (
                    <div key={recipe.id} className="grid grid-cols-[54px_1fr_auto] items-center gap-4 p-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={recipe.image_url || "/photos/party-04.webp"}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">{recipe.title}</p>
                        <p className="mt-1 text-xs text-ink/45">
                          ${(cost / Math.max(1, guestCount)).toFixed(2)} per guest · scaled to {guestCount}
                        </p>
                      </div>
                      <p className="font-editorial text-xl font-semibold">${cost.toFixed(2)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </article>
          <article className="card overflow-hidden">
            <div className="flex items-end justify-between border-b border-ink/10 p-6">
              <div>
                <p className="eyebrow">Receipt history</p>
                <h3 className="mt-2 font-editorial text-3xl font-semibold">Actual purchases</h3>
              </div>
              <button className="text-sm font-bold text-tomato" onClick={() => setReceiptOpen(true)}>
                Add receipt
              </button>
            </div>
            <div className="p-5">
              {actualLogged > 0 ? (
                <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white/35 p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-olive/10 text-olive">
                    <Receipt size={19} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Grocery actuals</p>
                    <p className="mt-1 text-xs text-ink/45">From purchased items</p>
                  </div>
                  <p className="font-editorial text-xl font-semibold">${actualLogged.toFixed(2)}</p>
                </div>
              ) : (
                <p className="text-sm text-ink/45">Upload a receipt to start tracking actual spend.</p>
              )}
              {scanned ? (
                <div className="mt-3 flex items-center gap-4 rounded-2xl border border-ink/10 bg-white/35 p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-olive/10 text-olive">
                    <Receipt size={19} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Mock receipt scan</p>
                    <p className="mt-1 text-xs text-ink/45">OCR stub · 6 matched items</p>
                  </div>
                  <p className="font-editorial text-xl font-semibold">$74.16</p>
                </div>
              ) : null}
            </div>
          </article>
        </div>
        <aside className="space-y-4">
          <article className="card p-5">
            <Split size={21} className="text-tomato" />
            <h3 className="mt-5 font-editorial text-3xl font-semibold">Split settings</h3>
            <div className="mt-5 space-y-3 text-sm">
              <label className="flex items-center justify-between">
                <span>Include host</span>
                <input type="checkbox" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span>Include helpers</span>
                <input type="checkbox" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span>Use attending guests</span>
                <input type="checkbox" />
              </label>
            </div>
            <button className="btn-secondary mt-6 w-full">Create cost summary</button>
          </article>
          <article className="rounded-[1.75rem] bg-tomato p-5 text-paper">
            <FileScan size={21} />
            <h3 className="mt-5 font-editorial text-3xl font-semibold">Receipt matching</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/70">
              Production OCR will match store line items to the grocery list and let you correct uncertain results.
            </p>
          </article>
        </aside>
      </section>
      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Upload a receipt">
        {!scanned ? (
          <>
            <button className="flex min-h-64 w-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-ink/20 bg-white/35 p-6 text-center">
              <Upload size={27} />
              <p className="mt-4 font-editorial text-2xl font-semibold">Drop a receipt image or PDF</p>
              <p className="mt-2 text-xs text-ink/45">OCR is stubbed in this build.</p>
            </button>
            <button className="btn-primary mt-6 w-full" onClick={() => setScanned(true)}>
              <FileScan size={16} /> Run mock extraction
            </button>
          </>
        ) : (
          <div>
            <div className="rounded-[1.5rem] bg-olive/10 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-olive">
                <Check size={15} /> Extraction complete
              </div>
              <h3 className="mt-3 font-editorial text-3xl font-semibold">Mock Market · $74.16</h3>
              <p className="mt-2 text-sm text-ink/55">6 of 7 items matched automatically.</p>
            </div>
            <button className="btn-primary mt-6 w-full" onClick={() => setReceiptOpen(false)}>
              Save receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
