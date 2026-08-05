"use client";

import { Modal } from "@/components/modal";
import { recipes as initialRecipes } from "@/lib/mock-data";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, Plus, Scale, Sparkles, WandSparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

type Analysis = { tone: "good" | "warn"; title: string; copy: string };

const analyses: Analysis[] = [
  { tone: "warn", title: "One oven conflict", copy: "The tart finish overlaps with the chicken rest at 5:10 PM. Move the tart 20 minutes earlier." },
  { tone: "warn", title: "Two allergy conflicts", copy: "The tart contains gluten and the greens contain sesame. Nina and Ari are affected." },
  { tone: "good", title: "Balanced menu", copy: "Acid, richness, fresh herbs, and texture are well distributed across the meal." },
  { tone: "good", title: "Good last-minute load", copy: "Only two dishes need active finishing in the final 30 minutes." },
];

export default function MenuPage() {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [guests, setGuests] = useState(12);
  const [unit, setUnit] = useState<"US" | "Metric">("US");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const move = (index: number, direction: -1 | 1) => {
    const next = [...recipes];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRecipes(next);
  };
  const estimated = useMemo(() => recipes.reduce((sum, r) => sum + r.cost * (guests / 12), 0), [recipes, guests]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">Menu builder</p><h2 className="mt-2 font-editorial text-5xl font-semibold leading-none">Build the meal first.</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">This guest-facing menu will appear on the invitation. Scale it now, then plated. will adjust as RSVPs arrive.</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setAnalysisOpen(true)}><Sparkles size={16} /> Analyze kitchen</button><button className="btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Add recipe</button></div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div><p className="eyebrow">Menu structure</p><button className="mt-2 flex items-center gap-2 font-editorial text-2xl font-semibold">Family style <ChevronDown size={17} /></button></div>
        <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink/45">Planning servings</span><div className="flex items-center rounded-full border border-ink/15 bg-white/50 p-1"><button onClick={() => setGuests(Math.max(2, guests - 1))} className="h-9 w-9 rounded-full hover:bg-ink/5">−</button><span className="min-w-20 text-center text-sm font-bold">{guests} guests</span><button onClick={() => setGuests(guests + 1)} className="h-9 w-9 rounded-full hover:bg-ink/5">+</button></div></label>
        <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink/45">Measurements</span><div className="flex rounded-full border border-ink/15 bg-white/50 p-1">{(["US", "Metric"] as const).map((name) => <button key={name} onClick={() => setUnit(name)} className={`rounded-full px-4 py-2 text-xs font-bold ${unit === name ? "bg-ink text-paper" : "text-ink/50"}`}>{name}</button>)}</div></label>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {recipes.map((recipe, index) => (
            <article key={recipe.id} className="card overflow-hidden">
              <div className="grid md:grid-cols-[180px_1fr_auto]">
                <div className="relative min-h-44 overflow-hidden bg-ink"><img src={recipe.image} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute left-3 top-3 rounded-full bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-wider">{recipe.course}</div></div>
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-editorial text-3xl font-semibold">{recipe.title}</h3><p className="mt-2 text-xs text-ink/48">{recipe.prep} prep · {recipe.cook} cook · scaled to {guests}</p></div><span className={`chip ${recipe.allergy ? "border-tomato/30 bg-tomato/8 text-tomato" : "border-olive/30 bg-olive/10 text-olive"}`}>{recipe.allergy ? <><AlertTriangle size={13} /> {recipe.allergy}</> : <><Check size={13} /> Allergy clear</>}</span></div>
                  {recipe.allergy ? <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-tomato/20 bg-tomato/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-tomato">Guest allergy conflict</p><p className="mt-1 text-xs text-ink/55">A highlighted ingredient conflicts with an attending guest.</p></div><button onClick={() => setSubOpen(true)} className="btn-secondary shrink-0 border-tomato/30 text-tomato"><WandSparkles size={15} /> Find replacement</button></div> : null}
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-ink/55"><span className="chip"><Scale size={13} /> {unit === "US" ? "12 oz flour" : "340 g flour"}</span><span className="chip">Est. ${(recipe.cost * guests / 12).toFixed(2)}</span><button className="font-bold text-tomato">View recipe →</button></div>
                </div>
                <div className="flex border-t border-ink/10 md:flex-col md:border-l md:border-t-0"><button onClick={() => move(index, -1)} disabled={index === 0} className="grid min-h-12 flex-1 place-items-center text-ink/45 hover:bg-ink/5 disabled:opacity-20" aria-label="Move up"><ArrowUp size={17} /></button><button onClick={() => move(index, 1)} disabled={index === recipes.length - 1} className="grid min-h-12 flex-1 place-items-center border-l border-ink/10 text-ink/45 hover:bg-ink/5 disabled:opacity-20 md:border-l-0 md:border-t" aria-label="Move down"><ArrowDown size={17} /></button><button onClick={() => setRecipes(recipes.filter((x) => x.id !== recipe.id))} className="grid min-h-12 flex-1 place-items-center border-l border-ink/10 text-ink/35 hover:bg-tomato/8 hover:text-tomato md:border-l-0 md:border-t" aria-label="Remove recipe"><X size={17} /></button></div>
              </div>
            </article>
          ))}
          <button className="flex min-h-28 w-full items-center justify-center gap-2 rounded-[1.75rem] border-2 border-dashed border-ink/15 text-sm font-bold text-ink/45 transition hover:border-tomato hover:bg-tomato/5 hover:text-tomato" onClick={() => setAddOpen(true)}><Plus size={17} /> Add another course or dish</button>
        </div>

        <aside className="space-y-4">
          <article className="card p-5"><p className="eyebrow">Menu snapshot</p><div className="mt-5 space-y-4"><div className="flex justify-between text-sm"><span className="text-ink/50">Dishes</span><strong>{recipes.length}</strong></div><div className="flex justify-between text-sm"><span className="text-ink/50">Active prep</span><strong>1 hr 35 min</strong></div><div className="flex justify-between text-sm"><span className="text-ink/50">Estimated cost</span><strong>${estimated.toFixed(2)}</strong></div><div className="flex justify-between text-sm"><span className="text-ink/50">Per guest</span><strong>${(estimated / guests).toFixed(2)}</strong></div></div></article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper"><Sparkles className="text-orange" size={20} /><h3 className="mt-5 font-editorial text-3xl font-semibold">Kitchen read</h3><p className="mt-3 text-sm leading-relaxed text-paper/60">Good balance, but there is one oven overlap and two allergy flags.</p><button className="mt-5 text-sm font-bold text-orange" onClick={() => setAnalysisOpen(true)}>Open full analysis →</button></article>
          <article className="card overflow-hidden"><div className="h-40 overflow-hidden"><img src="/photos/party-09.webp" alt="Guest-facing table preview" className="h-full w-full object-cover" /></div><div className="p-5"><p className="font-handwritten text-sm text-tomato">Guest preview</p><p className="mt-2 font-editorial text-2xl font-semibold">See how the menu looks on your invite.</p><a href="/invite/summer-table" target="_blank" className="btn-secondary mt-5 w-full">Preview invitation</a></div></article>
        </aside>
      </section>

      <Modal open={analysisOpen} onClose={() => setAnalysisOpen(false)} title="Kitchen analysis">
        <div className="rounded-2xl bg-ink p-5 text-paper"><p className="eyebrow !text-paper/45">Mock AI analysis</p><p className="mt-2 font-editorial text-3xl font-semibold">The menu is strong and realistic for three cooks.</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{analyses.map((item) => <article key={item.title} className={`rounded-2xl border p-4 ${item.tone === "warn" ? "border-tomato/25 bg-tomato/5" : "border-olive/25 bg-olive/5"}`}><div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${item.tone === "warn" ? "text-tomato" : "text-olive"}`}>{item.tone === "warn" ? <AlertTriangle size={15} /> : <Check size={15} />}{item.title}</div><p className="mt-3 text-sm leading-relaxed text-ink/60">{item.copy}</p></article>)}</div>
        <button onClick={() => setAnalysisOpen(false)} className="btn-primary mt-6 w-full">Apply recommended timing change</button>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to menu">
        <div className="grid gap-3 sm:grid-cols-2">{["Choose from cookbook", "Paste recipe URL", "Paste plain text", "Upload PDF or image", "Enter manually", "Add non-recipe item"].map((title, i) => <button key={title} onClick={() => setAddOpen(false)} className="rounded-2xl border border-ink/15 bg-white/40 p-5 text-left transition hover:border-tomato hover:bg-tomato/5"><span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span><p className="mt-5 font-editorial text-xl font-semibold">{title}</p></button>)}</div>
      </Modal>

      <Modal open={subOpen} onClose={() => setSubOpen(false)} title="Find a safer replacement">
        <div className="rounded-2xl border border-tomato/20 bg-tomato/5 p-4"><p className="text-xs font-bold uppercase tracking-widest text-tomato">Affected guest</p><p className="mt-2 text-sm font-semibold">Nina Chen · Gluten</p></div>
        <div className="mt-5 space-y-3">{[
          ["Gluten-free cup-for-cup flour", "Closest process match", "Use the same weight. Add 10 minutes of chill time before rolling."],
          ["Almond flour crust", "More tender and nutty", "Press into the pan instead of rolling. Check for nut allergies before using."],
        ].map(([name, tag, copy], i) => <button key={name} onClick={() => setSubOpen(false)} className="w-full rounded-2xl border border-ink/15 bg-white/40 p-5 text-left hover:border-tomato"><div className="flex items-start justify-between gap-3"><p className="font-editorial text-xl font-semibold">{name}</p><span className="chip shrink-0">{i === 0 ? "Recommended" : "Alternative"}</span></div><p className="mt-2 text-xs font-bold text-olive">{tag}</p><p className="mt-3 text-sm leading-relaxed text-ink/55">{copy}</p></button>)}</div>
        <p className="mt-5 text-xs leading-relaxed text-ink/45">Prototype note: substitutions are mocked. Production recommendations will be generated only after the host explicitly requests them.</p>
      </Modal>
    </div>
  );
}
