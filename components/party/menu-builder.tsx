"use client";

import { ImportRecipeModal } from "@/components/recipe/import-recipe-modal";
import { Modal } from "@/components/modal";
import {
  addPartyRecipeToMenu,
  removeRecipeFromMenu,
  updatePlanningServings,
} from "@/lib/actions/menu";
import { copyCookbookRecipeToParty } from "@/lib/actions/recipes";
import { formatMinutes } from "@/lib/rsvp";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Plus,
  Save,
  Scale,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

export type MenuRecipe = {
  id: string;
  title: string;
  course: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  allergy_notes: string | null;
  estimated_cost: number | null;
  scaled_cost?: number | null;
  servings: number;
};

export type CookbookPickRecipe = {
  id: string;
  title: string;
  course: string | null;
  image_url: string | null;
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
  partyId,
  serviceStyle,
  planningGuests,
  initialRecipes,
  cookbookRecipes = [],
  partyRecipesOffMenu = [],
  groceryEstimatedTotal = 0,
}: {
  partyId: string;
  serviceStyle: string | null;
  planningGuests: number;
  initialRecipes: MenuRecipe[];
  cookbookRecipes?: CookbookPickRecipe[];
  partyRecipesOffMenu?: CookbookPickRecipe[];
  groceryEstimatedTotal?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [recipes, setRecipes] = useState(initialRecipes);
  const [savedGuests, setSavedGuests] = useState(Math.max(1, planningGuests || 8));
  const [guests, setGuests] = useState(Math.max(1, planningGuests || 8));
  const [unit, setUnit] = useState<"US" | "Metric">("US");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [cookbookOpen, setCookbookOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [servingsMessage, setServingsMessage] = useState<string | null>(null);

  useEffect(() => {
    setRecipes(initialRecipes);
  }, [initialRecipes]);

  useEffect(() => {
    const next = Math.max(1, planningGuests || 8);
    setSavedGuests(next);
    setGuests(next);
  }, [planningGuests]);

  const servingsDirty = guests !== savedGuests;

  const move = (index: number, direction: -1 | 1) => {
    const next = [...recipes];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRecipes(next);
  };

  const provisionalDishTotal = useMemo(
    () =>
      recipes.reduce((sum, recipe) => {
        const base = recipe.estimated_cost ?? 0;
        const baseServings = recipe.servings || 12;
        return sum + base * (guests / baseServings);
      }, 0),
    [recipes, guests],
  );

  /** Prefer grocery total (same as Costs/Shopping) unless servings draft differs. */
  const estimated = servingsDirty ? provisionalDishTotal : groceryEstimatedTotal;

  function handleRemove(recipeId: string) {
    setActionError(null);
    const previous = recipes;
    setRecipes((rows) => rows.filter((row) => row.id !== recipeId));
    startTransition(async () => {
      const result = await removeRecipeFromMenu(partyId, recipeId);
      if (result.error) {
        setRecipes(previous);
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAddFromCookbook(cookbookRecipeId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await copyCookbookRecipeToParty(cookbookRecipeId, partyId);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setCookbookOpen(false);
      setAddOpen(false);
      router.refresh();
    });
  }

  function handleAddPartyRecipe(recipeId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await addPartyRecipeToMenu(partyId, recipeId);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setCookbookOpen(false);
      setAddOpen(false);
      router.refresh();
    });
  }

  function handleSaveServings() {
    setActionError(null);
    setServingsMessage(null);
    startTransition(async () => {
      const result = await updatePlanningServings(partyId, guests);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setSavedGuests(result.guestCount ?? guests);
      setServingsMessage("Servings saved.");
      router.refresh();
    });
  }

  const newRecipeHref = `/app/recipes/new?partyId=${partyId}`;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-5xl font-semibold leading-none">Menu Planner</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setAnalysisOpen(true)}>
            <Sparkles size={16} /> Analyze kitchen
          </button>
          <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add recipe
          </button>
        </div>
      </section>

      {actionError ? (
        <div className="rounded-[2px] border border-tomato/25 bg-tomato/5 p-4 text-sm font-semibold text-tomato">
          {actionError}
        </div>
      ) : null}
      {servingsMessage ? (
        <div className="rounded-[2px] border border-olive/25 bg-olive/8 p-4 text-sm font-semibold text-olive">
          {servingsMessage}
        </div>
      ) : null}

      <section className="card overflow-x-auto p-5">
        <div className="flex w-full min-w-max items-start justify-between gap-6">
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <p className="eyebrow leading-none">Menu structure</p>
            <button type="button" className="flex h-full items-center gap-2 font-editorial text-2xl font-semibold leading-none">
              {serviceStyle || "Family style"} <ChevronDown size={17} />
            </button>
          </div>
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <span className="eyebrow leading-none">Planning servings</span>
            <div className="flex h-full items-center rounded-full border border-ink/15 bg-white/50 p-1">
              <button
                type="button"
                onClick={() => setGuests(Math.max(1, guests - 1))}
                className="h-9 w-9 rounded-full hover:bg-ink/5"
              >
                −
              </button>
              <span className="min-w-20 text-center text-sm font-bold">{guests} guests</span>
              <button
                type="button"
                onClick={() => setGuests(guests + 1)}
                className="h-9 w-9 rounded-full hover:bg-ink/5"
              >
                +
              </button>
            </div>
          </div>
          <label className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <span className="eyebrow leading-none">Measurements</span>
            <div className="flex h-full items-center rounded-full border border-ink/15 bg-white/50 p-1">
              {(["US", "Metric"] as const).map((name) => (
                <button
                  key={name}
                  type="button"
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
            <p className="eyebrow leading-none">
              {servingsDirty ? "Preview cost" : "Estimated cost"}
            </p>
            <p className="flex h-full items-center font-editorial text-2xl font-semibold leading-none">
              ${estimated.toFixed(2)}
            </p>
          </div>
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <p className="eyebrow leading-none">Per guest</p>
            <p className="flex h-full items-center font-editorial text-2xl font-semibold leading-none">
              ${guests ? (estimated / guests).toFixed(2) : "0.00"}
            </p>
          </div>
          <div className="grid shrink-0 grid-rows-[1rem_2.75rem] gap-2">
            <span className="eyebrow invisible leading-none" aria-hidden="true">
              Save
            </span>
            <div className="flex h-full items-center">
              <button
                type="button"
                className="btn-primary h-11 px-4 text-[10px]"
                disabled={!servingsDirty || pending}
                onClick={handleSaveServings}
              >
                <Save size={14} /> Save
              </button>
            </div>
          </div>
        </div>
        {servingsDirty ? (
          <p className="mt-3 text-xs text-ink/45">
            Save servings to update grocery and costs. Preview uses dish estimates until then.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        {recipes.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-editorial text-3xl font-semibold">No dishes on the menu yet.</p>
            <p className="mt-3 text-sm text-ink/50">Add recipes from your cookbook to build the meal.</p>
            <button type="button" className="btn-primary mt-6" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add recipe
            </button>
          </div>
        ) : null}
        {recipes.map((recipe, index) => {
          const allergy = recipe.allergy_notes;
          const cost = servingsDirty
            ? (recipe.estimated_cost ?? 0) * (guests / (recipe.servings || 12))
            : (recipe.scaled_cost ??
              (recipe.estimated_cost ?? 0) * (savedGuests / (recipe.servings || 12)));
          return (
            <article key={recipe.id} className="card overflow-hidden">
              <div className="grid md:grid-cols-[180px_1fr_auto]">
                <div className="relative min-h-44 overflow-hidden bg-ink">
                  <Image
                    src={recipe.image_url || "/photos/party-04.webp"}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 180px, 100vw"
                    unoptimized={Boolean(recipe.image_url?.startsWith("http"))}
                    className="object-cover"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-paper px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {recipe.course || "Course"}
                  </div>
                </div>
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/app/parties/${partyId}/recipes/${recipe.id}`}
                        className="font-editorial text-3xl font-semibold transition hover:text-tomato"
                      >
                        {recipe.title}
                      </Link>
                      <p className="mt-2 text-xs text-ink/48">
                        {formatMinutes(recipe.prep_minutes)} prep · {formatMinutes(recipe.cook_minutes)} cook ·
                        scaled to {guests}
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
                        <p className="mt-1 text-xs text-ink/55">
                          A highlighted ingredient conflicts with an attending guest.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubOpen(true)}
                        className="btn-secondary shrink-0 border-tomato/30 text-tomato"
                      >
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
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || pending}
                    className="grid min-h-12 flex-1 place-items-center text-ink/45 hover:bg-ink/5 disabled:opacity-20"
                    aria-label="Move up"
                  >
                    <ArrowUp size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === recipes.length - 1 || pending}
                    className="grid min-h-12 flex-1 place-items-center border-l border-ink/10 text-ink/45 hover:bg-ink/5 disabled:opacity-20 md:border-l-0 md:border-t"
                    aria-label="Move down"
                  >
                    <ArrowDown size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(recipe.id)}
                    disabled={pending}
                    className="grid min-h-12 flex-1 place-items-center border-l border-ink/10 text-ink/35 hover:bg-tomato/8 hover:text-tomato disabled:opacity-40 md:border-l-0 md:border-t"
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
          type="button"
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
        <button type="button" onClick={() => setAnalysisOpen(false)} className="btn-primary mt-6 w-full">
          Apply recommended timing change
        </button>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to menu">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setAddOpen(false);
              setCookbookOpen(true);
            }}
            className="rounded-2xl border border-ink/15 bg-white/40 p-5 text-left transition hover:border-tomato hover:bg-tomato/5"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper">
              <BookOpen size={16} />
            </span>
            <p className="mt-5 font-editorial text-xl font-semibold">Choose from cookbook</p>
            <p className="mt-2 text-xs text-ink/45">Personal cookbook or party recipes not yet on the menu.</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setAddOpen(false);
              setImportOpen(true);
            }}
            className="rounded-2xl border border-ink/15 bg-white/40 p-5 text-left transition hover:border-tomato hover:bg-tomato/5"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-bold text-paper">2</span>
            <p className="mt-5 font-editorial text-xl font-semibold">Import recipe</p>
            <p className="mt-2 text-xs text-ink/45">URL, text paste, PDF, or manual entry.</p>
          </button>
          <Link
            href={newRecipeHref}
            onClick={() => setAddOpen(false)}
            className="rounded-2xl border border-ink/15 bg-white/40 p-5 text-left transition hover:border-tomato hover:bg-tomato/5 sm:col-span-2"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-bold text-paper">3</span>
            <p className="mt-5 font-editorial text-xl font-semibold">Enter manually</p>
          </Link>
        </div>
      </Modal>

      <Modal open={cookbookOpen} onClose={() => setCookbookOpen(false)} title="Add from cookbook">
        <div className="space-y-6">
          {partyRecipesOffMenu.length > 0 ? (
            <div>
              <p className="eyebrow">Party recipes</p>
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                {partyRecipesOffMenu.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    disabled={pending}
                    onClick={() => handleAddPartyRecipe(recipe.id)}
                    className="flex w-full items-center gap-3 rounded-[2px] border border-ink/10 bg-white/50 p-3 text-left transition hover:border-tomato disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={recipe.image_url || "/photos/party-04.webp"}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-[2px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{recipe.title}</p>
                      <p className="text-xs text-ink/45">{recipe.course || "Recipe"} · {recipe.servings} servings</p>
                    </div>
                    <Plus size={16} className="shrink-0 text-ink/35" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="eyebrow">Your cookbook</p>
            {cookbookRecipes.length === 0 ? (
              <div className="mt-3 rounded-[2px] border border-dashed border-ink/15 p-6 text-center">
                <p className="text-sm text-ink/50">No personal cookbook recipes yet.</p>
                <Link href="/app/recipes" className="editorial-link mt-3 inline-block text-sm">
                  Open cookbook →
                </Link>
              </div>
            ) : (
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {cookbookRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    disabled={pending}
                    onClick={() => handleAddFromCookbook(recipe.id)}
                    className="flex w-full items-center gap-3 rounded-[2px] border border-ink/10 bg-white/50 p-3 text-left transition hover:border-tomato disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={recipe.image_url || "/photos/party-04.webp"}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-[2px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{recipe.title}</p>
                      <p className="text-xs text-ink/45">{recipe.course || "Recipe"} · {recipe.servings} servings</p>
                    </div>
                    <Plus size={16} className="shrink-0 text-ink/35" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ImportRecipeModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        newRecipeHref={newRecipeHref}
      />

      <Modal open={subOpen} onClose={() => setSubOpen(false)} title="Find a safer replacement">
        <div className="rounded-2xl border border-tomato/20 bg-tomato/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-tomato">Affected guest</p>
          <p className="mt-2 text-sm font-semibold">Review guest allergies on the Guests tab</p>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-ink/45">
          Prototype note: substitutions are mocked. Production recommendations will be generated only after the host
          explicitly requests them.
        </p>
        <button type="button" className="btn-primary mt-6 w-full" onClick={() => setSubOpen(false)}>
          Close
        </button>
      </Modal>
    </div>
  );
}
