"use client";

import {
  createManualRecipe,
  deleteRecipe,
  ensureIngredientPriceAction,
  updateCookbookFromParty,
  updateRecipe,
} from "@/lib/actions/recipes";
import { clearRecipeDraft, loadRecipeDraft } from "@/lib/recipes/draft-storage";
import { roundQuantity } from "@/lib/recipes/quantity";
import {
  INGREDIENT_GROCERY_CATEGORIES,
  normalizeIngredientCategory,
} from "@/lib/recipes/pantry";
import { displayIngredientName, guessIngredientCategory } from "@/lib/recipes/standardize";
import type { IngredientFields, RecipeFields, RecipeStepFields } from "@/lib/recipes/types";
import { formatMinutes } from "@/lib/rsvp";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookMarked,
  ChefHat,
  ChevronDown,
  Clock3,
  ImageIcon,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

export type RecipeEditorRecipe = RecipeFields & {
  id?: string;
  cookbook_recipe_id?: string | null;
  import_status?: string;
  import_source_type?: string | null;
  allergy_notes?: string | null;
};

export type RecipeEditorIngredient = IngredientFields & { id?: string };
export type RecipeEditorStep = RecipeStepFields & { id?: string };

type RecipeEditorProps = {
  mode: "create" | "edit";
  recipe?: RecipeEditorRecipe;
  ingredients?: RecipeEditorIngredient[];
  steps?: RecipeEditorStep[];
  partyId?: string;
  isPartyRecipe?: boolean;
  backHref?: string;
};

const COURSES = ["Appetizer", "Main", "Side", "Soup", "Dessert", "Drink", "Other"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const INGREDIENT_CATEGORIES = INGREDIENT_GROCERY_CATEGORIES;

function parseList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function emptyIngredient(sortOrder: number): RecipeEditorIngredient {
  return {
    name: "",
    quantity: null,
    unit: "",
    category: "Other",
    pantry_flag: false,
    allergen_tags: [],
    sort_order: sortOrder,
  };
}

function emptyStep(sortOrder: number): RecipeEditorStep {
  return {
    title: "",
    description: "",
    duration_minutes: null,
    task: "Cooking",
    sort_order: sortOrder,
  };
}

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  actions,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group overflow-hidden rounded-[2px] border border-ink/10 bg-white/50"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink/35 transition ${open ? "rotate-180" : ""}`}
        />
        <span className="min-w-0 flex-1 truncate font-editorial text-2xl font-semibold leading-none">
          {title}
        </span>
        {count != null ? (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-ink/35">
            {count}
          </span>
        ) : null}
        {actions ? (
          <div
            className="flex shrink-0 items-center gap-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {actions}
          </div>
        ) : null}
      </summary>
      <div className="space-y-3 border-t border-ink/8 bg-paper/40 px-4 py-4 sm:px-5 sm:py-5">
        {children}
      </div>
    </details>
  );
}

export function RecipeEditor({
  mode,
  recipe,
  ingredients: initialIngredients = [],
  steps: initialSteps = [],
  partyId,
  isPartyRecipe = false,
  backHref,
}: RecipeEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cookbookPending, startCookbookTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(recipe?.title ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [imageUrl, setImageUrl] = useState(recipe?.image_url ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.source_url ?? "");
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [prepMinutes, setPrepMinutes] = useState<number | "">(recipe?.prep_minutes ?? "");
  const [cookMinutes, setCookMinutes] = useState<number | "">(recipe?.cook_minutes ?? "");
  const [totalMinutes, setTotalMinutes] = useState<number | "">(recipe?.total_minutes ?? "");
  const [course, setCourse] = useState(recipe?.course ?? "");
  const [cuisine, setCuisine] = useState(recipe?.cuisine ?? "");
  const [difficulty, setDifficulty] = useState(recipe?.difficulty ?? "");
  const [tags, setTags] = useState((recipe?.tags ?? []).join(", "));
  const [dietaryTags, setDietaryTags] = useState((recipe?.dietary_tags ?? []).join(", "));
  const [allergyTags, setAllergyTags] = useState((recipe?.allergy_tags ?? []).join(", "));
  const [equipment, setEquipment] = useState((recipe?.equipment ?? []).join(", "));
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [makeAhead, setMakeAhead] = useState(recipe?.make_ahead_notes ?? "");
  const [storage, setStorage] = useState(recipe?.storage_notes ?? "");
  const [reheating, setReheating] = useState(recipe?.reheating_notes ?? "");

  const [ingredients, setIngredients] = useState<RecipeEditorIngredient[]>(
    initialIngredients.length > 0
      ? initialIngredients.map((row, index) => ({
          ...row,
          category: normalizeIngredientCategory(row.category || guessIngredientCategory(row.name)),
          sort_order: row.sort_order ?? index,
        }))
      : [emptyIngredient(0)],
  );
  const [steps, setSteps] = useState<RecipeEditorStep[]>(
    initialSteps.length > 0
      ? initialSteps.map((row, index) => ({ ...row, sort_order: row.sort_order ?? index }))
      : [emptyStep(0)],
  );
  const [importStatus, setImportStatus] = useState(recipe?.import_status ?? "manual");
  const [importSourceType, setImportSourceType] = useState<string | null>(
    recipe?.import_source_type ?? "manual",
  );
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (mode !== "create") return;
    const draft = loadRecipeDraft();
    if (!draft) return;

    const imported = draft as typeof draft & {
      import_source_type?: string;
      recipe: {
        image_url?: string | null;
        source_url?: string | null;
        course?: string | null;
        cuisine?: string | null;
        difficulty?: string | null;
        tags?: string[];
        dietary_tags?: string[];
        allergy_tags?: string[];
        equipment?: string[];
        notes?: string | null;
        make_ahead_notes?: string | null;
        storage_notes?: string | null;
        reheating_notes?: string | null;
      };
    };

    setTitle(draft.recipe.title ?? "");
    setDescription(draft.recipe.description ?? "");
    setImageUrl(imported.recipe.image_url ?? "");
    setSourceUrl(imported.recipe.source_url ?? "");
    setServings(draft.recipe.servings ?? 4);
    setPrepMinutes(draft.recipe.prep_minutes ?? "");
    setCookMinutes(draft.recipe.cook_minutes ?? "");
    setTotalMinutes(draft.recipe.total_minutes ?? "");
    setCourse(imported.recipe.course ?? "");
    setCuisine(imported.recipe.cuisine ?? "");
    setDifficulty(imported.recipe.difficulty ?? "");
    setTags((imported.recipe.tags ?? []).join(", "));
    setDietaryTags((imported.recipe.dietary_tags ?? []).join(", "));
    setAllergyTags((imported.recipe.allergy_tags ?? []).join(", "));
    setEquipment((imported.recipe.equipment ?? []).join(", "));
    setNotes(imported.recipe.notes ?? "");
    setMakeAhead(imported.recipe.make_ahead_notes ?? "");
    setStorage(imported.recipe.storage_notes ?? "");
    setReheating(imported.recipe.reheating_notes ?? "");
    setImportStatus(draft.import_status);
    setImportSourceType(imported.import_source_type ?? "text");
    setImportWarnings(draft.warnings ?? []);
    setIngredients(
      draft.ingredients.length
        ? draft.ingredients.map((row, index) => {
            const name = displayIngredientName(row.name);
            return {
              name,
              quantity: row.quantity,
              unit: row.unit ?? "",
              preparation_note: row.preparation_note ?? null,
              section: row.section ?? null,
              pantry_flag: row.pantry_flag ?? false,
              allergen_tags: row.allergen_tags ?? [],
              sort_order: row.sort_order ?? index,
              category: normalizeIngredientCategory(
                ("category" in row && row.category) || guessIngredientCategory(name),
              ),
            };
          })
        : [emptyIngredient(0)],
    );
    type DraftStepRow = {
      title: string;
      description?: string | null;
      duration_minutes?: number | null;
      task?: string | null;
      section?: string | null;
      sort_order?: number;
    };
    const legacy = draft as typeof draft & { templates?: DraftStepRow[] };
    const draftSteps: DraftStepRow[] = draft.steps?.length
      ? draft.steps
      : legacy.templates?.length
        ? legacy.templates
        : [];
    setSteps(
      draftSteps.length
        ? draftSteps.map((row, index) => ({
            title: row.title,
            description: row.description ?? "",
            duration_minutes: row.duration_minutes ?? null,
            task: row.task?.trim() || row.section?.trim() || "Cooking",
            sort_order: row.sort_order ?? index,
          }))
        : [emptyStep(0)],
    );
    clearRecipeDraft();
  }, [mode]);

  const showIncompleteBadge = importStatus === "incomplete";
  const canUpdateCookbook = isPartyRecipe && Boolean(recipe?.cookbook_recipe_id);

  function buildPayload(): {
    recipe: RecipeFields;
    ingredients: IngredientFields[];
    steps: RecipeStepFields[];
  } {
    return {
      recipe: {
        title: title.trim() || "Untitled recipe",
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        source_url: sourceUrl.trim() || null,
        servings: Number.isFinite(Number(servings)) ? Number(servings) : 4,
        prep_minutes: prepMinutes === "" ? null : Number(prepMinutes),
        cook_minutes: cookMinutes === "" ? null : Number(cookMinutes),
        total_minutes: totalMinutes === "" ? null : Number(totalMinutes),
        course: course.trim() || null,
        cuisine: cuisine.trim() || null,
        difficulty: difficulty.trim() || null,
        tags: parseList(tags),
        dietary_tags: parseList(dietaryTags),
        import_status: importStatus,
        import_source_type: importSourceType,
        allergy_tags: parseList(allergyTags),
        equipment: parseList(equipment),
        notes: notes.trim() || null,
        make_ahead_notes: makeAhead.trim() || null,
        storage_notes: storage.trim() || null,
        reheating_notes: reheating.trim() || null,
      },
      ingredients: ingredients
        .filter((row) => row.name.trim())
        .map((row, index) => ({
          id: row.id,
          name: displayIngredientName(row.name),
          quantity: roundQuantity(row.quantity ?? null),
          unit: row.unit?.trim() || null,
          preparation_note: row.preparation_note?.trim() || null,
          section: row.section?.trim() || null,
          category: row.category?.trim() || "Other",
          pantry_flag: Boolean(row.pantry_flag),
          allergen_tags: row.allergen_tags ?? [],
          sort_order: index,
        })),
      steps: steps
        .filter((row) => row.title.trim() || row.description?.trim())
        .map((row, index) => ({
          id: row.id,
          title: row.title.trim() || "Step",
          description: row.description?.trim() || null,
          duration_minutes: row.duration_minutes ?? null,
          task: row.task?.trim() || "Cooking",
          sort_order: index,
        })),
    };
  }

  async function finalizeIngredientRow(index: number) {
    const row = ingredients[index];
    if (!row?.name.trim()) return;
    const standardized = displayIngredientName(row.name);
    const category = normalizeIngredientCategory(
      row.category?.trim() || guessIngredientCategory(standardized),
    );
    setIngredients((rows) =>
      rows.map((item, i) =>
        i === index
          ? {
              ...item,
              name: standardized,
              category,
            }
          : item,
      ),
    );
    try {
      const result = await ensureIngredientPriceAction(standardized, row.unit);
      if (result.price) {
        setIngredients((rows) =>
          rows.map((item, i) =>
            i === index ? { ...item, estimated_unit_cost: result.price!.price_per_unit } : item,
          ),
        );
      }
    } catch {
      // Pricing is best-effort; save path will retry.
    }
  }

  function handleSave() {
    setMessage(null);
    setError(null);

    if (!course.trim()) {
      setError("Select a recipe category before saving.");
      return;
    }

    const payload = buildPayload();

    startTransition(async () => {
      try {
        if (mode === "create") {
          const result = await createManualRecipe({
            recipe: payload.recipe,
            ingredients: payload.ingredients,
            steps: payload.steps,
            partyId,
          });
          if (result.error) {
            setError(result.error);
            return;
          }
          if (result.recipeId) {
            router.push(
              partyId
                ? `/app/parties/${partyId}/recipes/${result.recipeId}`
                : `/app/recipes/${result.recipeId}`,
            );
            router.refresh();
          }
          return;
        }

        if (!recipe?.id) {
          setError("Recipe id is missing.");
          return;
        }

        const result = await updateRecipe(recipe.id, {
          recipe: payload.recipe,
          ingredients: payload.ingredients,
          steps: payload.steps,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setMessage("Recipe saved.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save recipe.");
      }
    });
  }

  function handleUpdateCookbook() {
    if (!recipe?.id) return;
    setMessage(null);
    setError(null);
    startCookbookTransition(async () => {
      try {
        const result = await updateCookbookFromParty(recipe.id!);
        if (result.error) {
          setError(result.error);
          return;
        }
        setMessage("Cookbook recipe updated with party changes.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update cookbook.");
      }
    });
  }

  function handleDelete() {
    if (!recipe?.id) return;
    if (!window.confirm("Delete this recipe? This cannot be undone.")) return;
    setError(null);
    startDeleteTransition(async () => {
      try {
        const result = await deleteRecipe(recipe.id!, partyId);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push(backHref ?? (partyId ? `/app/parties/${partyId}/recipes` : "/app/recipes"));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete recipe.");
      }
    });
  }

  function moveRow<T extends { sort_order?: number }>(
    list: T[],
    setList: (rows: T[]) => void,
    index: number,
    direction: -1 | 1,
  ) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const copy = [...list];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
    setList(copy.map((row, i) => ({ ...row, sort_order: i })));
  }

  const computedTotal =
    totalMinutes !== ""
      ? Number(totalMinutes)
      : Number(prepMinutes || 0) + Number(cookMinutes || 0);

  const ingredientsByCategory = useMemo(() => {
    const map = new Map<string, { index: number; row: RecipeEditorIngredient }[]>();
    for (const category of INGREDIENT_CATEGORIES) map.set(category, []);
    ingredients.forEach((row, index) => {
      const category = row.category?.trim() || "Other";
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push({ index, row });
    });
    return map;
  }, [ingredients]);

  const stepsByTask = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { index: number; row: RecipeEditorStep }[]>();
    steps.forEach((row, index) => {
      const task = row.task?.trim() || "Cooking";
      if (!map.has(task)) {
        map.set(task, []);
        order.push(task);
      }
      map.get(task)!.push({ index, row });
    });
    if (order.length === 0) {
      order.push("Cooking");
      map.set("Cooking", []);
    }
    return { order, map };
  }, [steps]);

  function updateIngredient(index: number, patch: Partial<RecipeEditorIngredient>) {
    setIngredients((rows) => rows.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function updateStep(index: number, patch: Partial<RecipeEditorStep>) {
    setSteps((rows) => rows.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addIngredient(category: string) {
    setIngredients((rows) => [...rows, { ...emptyIngredient(rows.length), category }]);
  }

  function addStep(task: string) {
    setSteps((rows) => [...rows, { ...emptyStep(rows.length), task }]);
  }

  function addTask() {
    const base = "New task";
    let name = base;
    let n = 2;
    const existing = new Set(stepsByTask.order.map((s) => s.toLowerCase()));
    while (existing.has(name.toLowerCase())) {
      name = `${base} ${n++}`;
    }
    addStep(name);
  }

  function renameTask(from: string, to: string) {
    const next = to.trim() || "Cooking";
    if (next === from) return;
    setSteps((rows) =>
      rows.map((row) => ((row.task?.trim() || "Cooking") === from ? { ...row, task: next } : row)),
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          {backHref ? (
            <Link href={backHref} className="editorial-link mb-3 text-ink/55">
              ← Back
            </Link>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{isPartyRecipe ? "Party recipe" : "Cookbook"}</p>
            {showIncompleteBadge ? (
              <span className="chip border-orange/30 bg-orange/10 text-orange">
                <AlertTriangle size={12} /> Incomplete import
              </span>
            ) : null}
            {importStatus === "complete" ? (
              <span className="chip border-olive/30 text-olive">Import complete</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdateCookbook ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={cookbookPending || pending}
              onClick={handleUpdateCookbook}
            >
              <BookMarked size={15} /> Update cookbook
            </button>
          ) : null}
          {mode === "edit" ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={deletePending || pending}
              onClick={handleDelete}
            >
              <Trash2 size={15} /> Delete
            </button>
          ) : null}
          <button type="button" className="btn-primary" disabled={pending} onClick={handleSave}>
            <Save size={15} /> {pending ? "Saving…" : mode === "create" ? "Create recipe" : "Save changes"}
          </button>
        </div>
      </section>

      {importWarnings.length ? (
        <ul className="space-y-1 rounded-[2px] border border-orange/20 bg-orange/8 px-4 py-3 text-sm text-ink/65">
          {importWarnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <div className="rounded-[2px] border border-olive/25 bg-olive/8 p-4 text-sm font-semibold text-olive">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[2px] border border-tomato/25 bg-tomato/5 p-4 text-sm font-semibold text-tomato">
          {error}
        </div>
      ) : null}

      {/* Hero image */}
      <section className="card overflow-hidden">
        <div className="relative aspect-[16/9] max-h-[420px] w-full bg-ink/5 md:aspect-[21/9]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-ink/30">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={36} strokeWidth={1.25} />
                <p className="text-xs font-semibold uppercase tracking-widest">Add a recipe photo</p>
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent p-4 pt-16">
            <label className="block max-w-xl">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-paper/70">
                Image URL
              </span>
              <input
                className="field border-paper/20 bg-paper/95 py-2 text-ink"
                placeholder="https://…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Title + timing strip */}
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            className="min-w-0 flex-1 border-0 bg-transparent font-editorial text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink outline-none placeholder:text-ink/25 focus:ring-0 md:text-5xl"
            placeholder="Recipe title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="w-full shrink-0 sm:w-44">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-ink/40">
              Category *
            </span>
            <select
              className="field py-2"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {COURSES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="rounded-[2px] border border-ink/10 bg-white/40 px-4 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink/40">
              <Clock3 size={12} /> Prep
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <input
                className="w-full border-0 bg-transparent font-editorial text-3xl font-semibold leading-none outline-none"
                type="number"
                min={0}
                placeholder="—"
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="shrink-0 text-xs text-ink/40">min</span>
            </div>
          </label>
          <label className="rounded-[2px] border border-ink/10 bg-white/40 px-4 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink/40">
              <ChefHat size={12} /> Cook
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <input
                className="w-full border-0 bg-transparent font-editorial text-3xl font-semibold leading-none outline-none"
                type="number"
                min={0}
                placeholder="—"
                value={cookMinutes}
                onChange={(e) => setCookMinutes(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="shrink-0 text-xs text-ink/40">min</span>
            </div>
          </label>
          <label className="rounded-[2px] border border-ink/10 bg-white/40 px-4 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink/40">
              <Clock3 size={12} /> Total
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <input
                className="w-full border-0 bg-transparent font-editorial text-3xl font-semibold leading-none outline-none"
                type="number"
                min={0}
                placeholder={computedTotal ? String(computedTotal) : "—"}
                value={totalMinutes}
                onChange={(e) => setTotalMinutes(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="shrink-0 text-xs text-ink/40">min</span>
            </div>
          </label>
          <label className="rounded-[2px] border border-ink/10 bg-white/40 px-4 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink/40">
              <Users size={12} /> Serves
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <input
                className="w-full border-0 bg-transparent font-editorial text-3xl font-semibold leading-none outline-none"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              />
              <span className="shrink-0 text-xs text-ink/40">base</span>
            </div>
          </label>
        </div>
      </section>

      {/* Ingredients + Steps */}
      <section className="grid gap-8 lg:grid-cols-2 lg:gap-8 xl:gap-10">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-editorial text-3xl font-semibold">Ingredients</h2>
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-[10px]"
              onClick={() => addIngredient("Other")}
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-3">
            {INGREDIENT_CATEGORIES.map((category) => {
              const rows = ingredientsByCategory.get(category) ?? [];
              if (rows.length === 0) return null;
              return (
                <CollapsibleSection
                  key={category}
                  title={category}
                  count={rows.length}
                  defaultOpen
                  actions={
                    <button
                      type="button"
                      className="btn-icon h-8 w-8"
                      aria-label={`Add ${category} ingredient`}
                      onClick={() => addIngredient(category)}
                    >
                      <Plus size={14} />
                    </button>
                  }
                >
                  {rows.map(({ index, row }) => (
                    <div
                      key={row.id ?? `ing-${index}`}
                      className="space-y-1.5 rounded-[2px] border border-ink/10 bg-white/70 px-2.5 py-2"
                    >
                      <div className="flex items-center gap-2">
                      <input
                        className="field min-w-0 flex-1 basis-0 px-3 py-2"
                        placeholder="Ingredient"
                        aria-label="Ingredient name"
                        value={row.name}
                        onChange={(e) => updateIngredient(index, { name: e.target.value })}
                        onBlur={() => {
                          void finalizeIngredientRow(index);
                        }}
                      />
                      <input
                        className="field w-16 shrink-0 px-2 py-2 text-center"
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        aria-label="Quantity"
                        value={row.quantity ?? ""}
                        onChange={(e) =>
                          updateIngredient(index, {
                            quantity: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        onBlur={(e) => {
                          const next =
                            e.target.value === "" ? null : roundQuantity(Number(e.target.value));
                          updateIngredient(index, { quantity: next });
                        }}
                      />
                      <input
                        className="field w-14 shrink-0 px-2 py-2 text-center"
                        placeholder="Unit"
                        aria-label="Unit"
                        value={row.unit ?? ""}
                        onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                        onBlur={() => {
                          void finalizeIngredientRow(index);
                        }}
                      />
                      <select
                        className="field w-[6.5rem] shrink-0 px-2 py-2 text-xs"
                        value={row.category || "Other"}
                        onChange={(e) => updateIngredient(index, { category: e.target.value })}
                        aria-label="Category"
                      >
                        {INGREDIENT_CATEGORIES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <label
                        className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-ink/50"
                        title="Pantry staple"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(row.pantry_flag)}
                          onChange={(e) =>
                            updateIngredient(index, { pantry_flag: e.target.checked })
                          }
                        />
                        Pantry
                      </label>
                      <button
                        type="button"
                        className="btn-icon h-9 w-9 shrink-0"
                        aria-label="Remove ingredient"
                        onClick={() =>
                          setIngredients((list) => list.filter((_, i) => i !== index))
                        }
                      >
                        <X size={14} />
                      </button>
                      </div>
                      <input
                        className="field w-full px-3 py-1.5 text-xs"
                        placeholder="Prep note (diced, minced…)"
                        aria-label="Preparation note"
                        value={row.preparation_note ?? ""}
                        onChange={(e) =>
                          updateIngredient(index, {
                            preparation_note: e.target.value || null,
                          })
                        }
                      />
                    </div>
                  ))}
                </CollapsibleSection>
              );
            })}
            {ingredients.every((row) => !row.name.trim()) && ingredients.length <= 1 ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-dashed border-ink/15 py-10 text-sm font-semibold text-ink/40 transition hover:border-tomato hover:text-tomato"
                onClick={() => addIngredient("Produce")}
              >
                <Plus size={16} /> Add your first ingredient
              </button>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {INGREDIENT_CATEGORIES.filter(
                (category) => (ingredientsByCategory.get(category) ?? []).length === 0,
              ).map((category) => (
                <button
                  key={category}
                  type="button"
                  className="chip text-ink/45 hover:border-tomato/30 hover:text-tomato"
                  onClick={() => addIngredient(category)}
                >
                  <Plus size={12} /> {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-editorial text-3xl font-semibold">Directions</h2>
            <button type="button" className="btn-secondary px-3 py-2 text-[10px]" onClick={addTask}>
              <Plus size={14} /> Task
            </button>
          </div>
          <div className="space-y-3">
            {stepsByTask.order.map((taskName) => {
              const rows = stepsByTask.map.get(taskName) ?? [];
              const taskMinutes = rows.reduce(
                (sum, { row }) => sum + (row.duration_minutes ?? 0),
                0,
              );
              return (
                <CollapsibleSection
                  key={taskName}
                  title={taskName}
                  count={rows.length}
                  defaultOpen
                  actions={
                    <>
                      {taskMinutes > 0 ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/35">
                          {formatMinutes(taskMinutes)}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="btn-icon h-8 w-8"
                        aria-label={`Add step to ${taskName}`}
                        onClick={() => addStep(taskName)}
                      >
                        <Plus size={14} />
                      </button>
                    </>
                  }
                >
                  <label className="mb-1 block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-ink/40">
                      Task name
                    </span>
                    <input
                      className="field w-full py-2"
                      defaultValue={taskName}
                      key={taskName}
                      onBlur={(e) => renameTask(taskName, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  </label>
                  {rows.length === 0 ? (
                    <p className="text-xs text-ink/40">No steps in this task yet.</p>
                  ) : null}
                  {rows.map(({ index, row }, localIndex) => (
                    <article
                      key={row.id ?? `step-${index}`}
                      className="space-y-3 rounded-[2px] border border-ink/10 bg-white/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ink/35">
                          Step {localIndex + 1}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="btn-icon h-8 w-8"
                            aria-label="Move step up"
                            onClick={() => moveRow(steps, setSteps, index, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon h-8 w-8"
                            aria-label="Move step down"
                            onClick={() => moveRow(steps, setSteps, index, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon h-8 w-8"
                            aria-label="Remove step"
                            onClick={() => setSteps((list) => list.filter((_, i) => i !== index))}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5.5rem]">
                        <label className="min-w-0">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-ink/40">
                            Label
                          </span>
                          <input
                            className="field w-full min-w-0 py-2.5"
                            placeholder="Step label"
                            value={row.title}
                            onChange={(e) => updateStep(index, { title: e.target.value })}
                          />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-ink/40">
                            Min
                          </span>
                          <input
                            className="field w-full py-2.5"
                            type="number"
                            min={0}
                            placeholder="0"
                            value={row.duration_minutes ?? ""}
                            onChange={(e) =>
                              updateStep(index, {
                                duration_minutes:
                                  e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-ink/40">
                          Instructions
                        </span>
                        <textarea
                          className="field min-h-28 w-full resize-y py-2.5 leading-relaxed"
                          placeholder="Full step instructions…"
                          value={row.description ?? ""}
                          onChange={(e) => updateStep(index, { description: e.target.value })}
                        />
                      </label>
                      {stepsByTask.order.length > 1 ? (
                        <label className="flex flex-wrap items-center gap-2 border-t border-ink/8 pt-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                            Move to
                          </span>
                          <select
                            className="field max-w-full py-1.5 text-xs sm:max-w-[12rem]"
                            value={row.task ?? "Cooking"}
                            onChange={(e) => updateStep(index, { task: e.target.value })}
                          >
                            {stepsByTask.order.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </article>
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-dashed border-ink/12 py-3 text-xs font-bold uppercase tracking-widest text-ink/40 transition hover:border-tomato hover:text-tomato"
                    onClick={() => addStep(taskName)}
                  >
                    <Plus size={14} /> Add step
                  </button>
                </CollapsibleSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Misc details — collapsed by default */}
      <CollapsibleSection title="Recipe details" count={undefined} defaultOpen={false}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold">Description</span>
            <textarea
              className="field min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Cuisine</span>
            <input className="field" value={cuisine} onChange={(e) => setCuisine(e.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Difficulty</span>
            <select className="field" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">Select difficulty</option>
              {DIFFICULTIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Source URL</span>
            <input className="field" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Tags</span>
            <input
              className="field"
              placeholder="weeknight, vegetarian"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Dietary tags</span>
            <input
              className="field"
              placeholder="gluten-free, vegan"
              value={dietaryTags}
              onChange={(e) => setDietaryTags(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Allergy tags</span>
            <input
              className="field"
              placeholder="dairy, gluten, nuts"
              value={allergyTags}
              onChange={(e) => setAllergyTags(e.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold">Equipment</span>
            <input
              className="field"
              placeholder="Dutch oven, blender"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Make ahead</span>
            <textarea className="field min-h-20" value={makeAhead} onChange={(e) => setMakeAhead(e.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Storage</span>
            <textarea className="field min-h-20" value={storage} onChange={(e) => setStorage(e.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Reheating</span>
            <textarea className="field min-h-20" value={reheating} onChange={(e) => setReheating(e.target.value)} />
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Personal notes</span>
            <textarea className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      </CollapsibleSection>
    </div>
  );
}
