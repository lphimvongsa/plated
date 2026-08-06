"use client";

import { Modal } from "@/components/modal";
import { formatMinutes } from "@/lib/rsvp";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, Plus, Scale, Sparkles, WandSparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

export type MenuRecipe = {
  id: string;
  title: string;
  course: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  allergy_notes: string | null;
  estimated_cost: number | null;
  servings: number;
};

type Analysis = { tone: "good" | "warn"; title: string; copy: string };

const analyses: Analysis[] = [
  { tone: "warn", title: "One oven conflict", copy: "Check overlapping cook times once your timeline is filled in." },
  { tone: "warn", title: "Allergy conflicts", copy: "Review dishes with allergy notes against guest RSVPs." },
  { tone: "good", title: "Balanced menu", copy: "Acid, richness, fresh herbs, and texture are well distributed across the meal." },
  { tone: "good", title: "Good last-minute load", copy: "Only a couple dishes need active finishing in the final 30 minutes." },
];

export function MenuBuilder({
  serviceStyle,
  planningGuests,
  initialRecipes,
}: {
  serviceStyle: string | null;
  planningGuests: number;
  initialRecipes: MenuRecipe[];
}) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [guests, setGuests] = useState(Math.max(2, planningGuests || 8));
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

  const estimated = useMemo(
    () =>
      recipes.reduce((sum, recipe) => {
        const base = recipe.estimated_cost ?? 0;
        const baseServings = recipe.servings || 12;
        return sum + base * (guests / baseServings);
      }, 0),
    [recipes, guests],
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-5xl font-semibold leading-none">Menu Planner</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setAnalysisOpen(true)}>
            <Sparkles size={16} /> Analyze kitchen
          </button>
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add recipe
          </button>
        </div>
      </section>

      <section className="card overflow-x-auto p-5">
        <div className="flex w-full min-w-max items-start justify-between gap-6">
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <p className="eyebrow leading-none">Menu structure</p>
            <button className="flex h-full items-center gap-2 font-editorial text-2xl font-semibold leading-none">
              {serviceStyle || "Family style"} <ChevronDown size={17} />
            </button>
          </div>
          <label className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <span className="eyebrow leading-none">Planning servings</span>
            <div className="flex h-full items-center rounded-full border border-ink/15 bg-white/50 p-1">
              <button onClick={() => setGuests(Math.max(2, guests - 1))} className="h-9 w-9 rounded-full hover:bg-ink/5">
                −
              </button>
              <span className="min-w-20 text-center text-sm font-bold">{guests} guests</span>
              <button onClick={() => setGuests(guests + 1)} className="h-9 w-9 rounded-full hover:bg-ink/5">
                +
              </button>
            </div>
          </label>
          <label className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <span className="eyebrow leading-none">Measurements</span>
            <div className="flex h-full items-center rounded-full border border-ink/15 bg-white/50 p-1">
              {(["US", "Metric"] as const).map((name) => (
                <button
                  key={name}
                  onClick={() => setUnit(name)}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${unit === name ? "bg-ink text-paper" : "text-ink/50"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </label>
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <p className="eyebrow leading-none">Dishes</p>
            <p className="flex h-full items-center font-editorial text-2xl font-semibold leading-none">{recipes.length}</p>
          </div>
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <p className="eyebrow leading-none">Estimated cost</p>
            <p className="flex h-full items-center font-editorial text-2xl font-semibold leading-none">${estimated.toFixed(2)}</p>
          </div>
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <p className="eyebrow leading-none">Per guest</p>
            <p className="flex h-full items-center font-editorial text-2xl font-semibold leading-none">
              ${guests ? (estimated / guests).toFixed(2) : "0.00"}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
          {recipes.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-editorial text-3xl font-semibold">No dishes on the menu yet.</p>
              <p className="mt-3 text-sm text-ink/50">Add recipes from the party cookbook to build the meal.</p>
              <button className="btn-primary mt-6" onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add recipe
              </button>
            </div>
          ) : null}
          {recipes.map((recipe, index) => {
            const allergy = recipe.allergy_notes;
            const cost = (recipe.estimated_cost ?? 0) * (guests / (recipe.servings || 12));
            return (
              <article key={recipe.id} className="card overflow-hidden">
                <div className="grid md:grid-cols-[180px_1fr_auto]">
                  <div className="relative min-h-44 overflow-hidden bg-ink">
                    <img
                      src={recipe.image_url || "/photos/party-04.webp"}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                      {recipe.course || "Course"}
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-editorial text-3xl font-semibold">{recipe.title}</h3>
                        <p className="mt-2 text-xs text-ink/48">
                          {formatMinutes(recipe.prep_minutes)} prep · {formatMinutes(recipe.cook_minutes)} cook · scaled
                          to {guests}
                        </p>
                      </div>
                      <span
                        className={`chip ${allergy ? "border-tomato/30 bg-tomato/8 text-tomato" : "border-olive/30 bg-olive/10 text-olive"}`}
                      >
                        {allergy ? (
                          <>
                            <AlertTriangle size={13} /> {allergy}
                          </>
                        ) : (
                          <>
                            <Check size={13} /> Allergy clear
                          </>
                        )}
                      </span>
                    </div>
                    {allergy ? (
                      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-tomato/20 bg-tomato/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-tomato">Guest allergy conflict</p>
                          <p className="mt-1 text-xs text-ink/55">A highlighted ingredient conflicts with an attending guest.</p>
                        </div>
                        <button onClick={() => setSubOpen(true)} className="btn-secondary shrink-0 border-tomato/30 text-tomato">
                          <WandSparkles size={15} /> Find replacement
                        </button>
                      </div>
                    ) : null}
                    <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-ink/55">
                      <span className="chip">
                        <Scale size={13} /> {unit === "US" ? "US customary" : "Metric"}
                      </span>
                      <span className="chip">Est. ${cost.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex border-t border-ink/10 md:flex-col md:border-l md:border-t-0">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="grid min-h-12 flex-1 place-items-center text-ink/45 hover:bg-ink/5 disabled:opacity-20"
                      aria-label="Move up"
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === recipes.length - 1}
                      className="grid min-h-12 flex-1 place-items-center border-l border-ink/10 text-ink/45 hover:bg-ink/5 disabled:opacity-20 md:border-l-0 md:border-t"
                      aria-label="Move down"
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      onClick={() => setRecipes(recipes.filter((x) => x.id !== recipe.id))}
                      className="grid min-h-12 flex-1 place-items-center border-l border-ink/10 text-ink/35 hover:bg-tomato/8 hover:text-tomato md:border-l-0 md:border-t"
                      aria-label="Remove recipe"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <button
            className="flex min-h-28 w-full items-center justify-center gap-2 rounded-[1.75rem] border-2 border-dashed border-ink/15 text-sm font-bold text-ink/45 transition hover:border-tomato hover:bg-tomato/5 hover:text-tomato"
            onClick={() => setAddOpen(true)}
          >
            <Plus size={17} /> Add another course or dish
          </button>
      </section>

      <Modal open={analysisOpen} onClose={() => setAnalysisOpen(false)} title="Kitchen analysis">
        <div className="rounded-2xl bg-ink p-5 text-paper">
          <p className="eyebrow !text-paper/45">Mock AI analysis</p>
          <p className="mt-2 font-editorial text-3xl font-semibold">The menu is strong and realistic for your team.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {analyses.map((item) => (
            <article
              key={item.title}
              className={`rounded-2xl border p-4 ${item.tone === "warn" ? "border-tomato/25 bg-tomato/5" : "border-olive/25 bg-olive/5"}`}
            >
              <div
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${item.tone === "warn" ? "text-tomato" : "text-olive"}`}
              >
                {item.tone === "warn" ? <AlertTriangle size={15} /> : <Check size={15} />}
                {item.title}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/60">{item.copy}</p>
            </article>
          ))}
        </div>
        <button onClick={() => setAnalysisOpen(false)} className="btn-primary mt-6 w-full">
          Apply recommended timing change
        </button>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to menu">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Choose from cookbook",
            "Paste recipe URL",
            "Paste plain text",
            "Upload PDF or image",
            "Enter manually",
            "Add non-recipe item",
          ].map((title, i) => (
            <button
              key={title}
              onClick={() => setAddOpen(false)}
              className="rounded-2xl border border-ink/15 bg-white/40 p-5 text-left transition hover:border-tomato hover:bg-tomato/5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span>
              <p className="mt-5 font-editorial text-xl font-semibold">{title}</p>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={subOpen} onClose={() => setSubOpen(false)} title="Find a safer replacement">
        <div className="rounded-2xl border border-tomato/20 bg-tomato/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-tomato">Affected guest</p>
          <p className="mt-2 text-sm font-semibold">Review guest allergies on the Guests tab</p>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-ink/45">
          Prototype note: substitutions are mocked. Production recommendations will be generated only after the host
          explicitly requests them.
        </p>
        <button className="btn-primary mt-6 w-full" onClick={() => setSubOpen(false)}>
          Close
        </button>
      </Modal>
    </div>
  );
}
