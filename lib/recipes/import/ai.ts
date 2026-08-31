import "server-only";
import type { ImportRecipeDraft } from "@/lib/recipes/import/types";
import {
  assessImportStatus,
  coerceIngredientQuantities,
  ensureStepDurations,
  mergeDuplicateIngredients,
} from "@/lib/recipes/import/quality";
import { normalizeIngredientCategory } from "@/lib/recipes/pantry";
import { inferAllergensFromIngredient, aggregateRecipeAllergens } from "@/lib/allergens";
import {
  displayIngredientName,
  guessIngredientCategory,
  shortStepLabel,
  titleCaseTask,
} from "@/lib/recipes/standardize";

type AiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type AiExtractHints = {
  image_url?: string | null;
  source_url?: string | null;
};

export type AiExtractResult =
  | { ok: true; draft: ImportRecipeDraft }
  | { ok: false; reason: "not_configured" | "non_recipe" | "parse_failed" | "request_failed"; message: string };

function getAiConfig(): AiConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  };
}

export function isAiConfigured(): boolean {
  return Boolean(getAiConfig());
}

const SYSTEM_PROMPT = `You are the sole recipe parser for a personal dinner-party planning app.
Given raw recipe source text (pasted text, page text, or PDF text), extract a COMPLETE structured recipe.

Rules:
- Return ONLY valid JSON matching the schema. No markdown.
- You do ALL parsing — do not leave fields blank when they can be reasonably inferred.
- Set is_recipe=false only when the text is clearly not a cooking recipe (ads, blog fluff with no dish, login walls, empty junk).
- Every ingredient needs: standardized Title Case grocery name, numeric quantity (max 2 decimals), unit, grocery category, and preparation_note when the source mentions prep (diced, minced, room temp, etc.).
- Grocery category is a shopping aisle only: Produce, Dairy, Meat, Dry Goods, Spices, or Other. Never use "Pantry" as a category — pantry ownership is handled separately by the app.
- Do NOT set pantry ownership; omit pantry_flag (the app matches the user's pantry after import).
- Preserve the source quantity and unit exactly when they are usable, including count units such as each, clove, strip, stalk, sprig, bunch, and can. Never invent a weight to replace a source count; the grocery catalog performs conversions later.
- Ingredient names MUST be grocery base names: no parenthetical asides, no prep words in the name ("Extra Virgin Olive Oil" → "Olive Oil", "thick-cut bacon" → "Bacon", "2 cloves garlic, minced" → name "Garlic", preparation_note "minced").
- Vague amounts ("to taste", "a handful", "for serving") still get a best-estimate quantity + unit.
- Split "½ teaspoon EACH: oregano, parsley" into separate ingredients.
- CRITICAL — one grocery line per ingredient: if the same grocery item appears in multiple components/sections (e.g. Thai chilis for the sauce AND for the meat, soy sauce in marinade and stir-fry), output ONE ingredient with the TOTAL quantity summed. Do not create duplicates. Put distinct prep notes in preparation_note (e.g. "divided; minced for sauce"). Set section to null when an item spans multiple components; only use section when an item is unique to one component.
- Ignore ads, nutrition blocks, author bios, related posts, and comments.
- Split instructions into digestible steps under named tasks. Tasks are timeline bars — keep that structure, but make task names SPECIFIC to this recipe's cooking flow, not generic labels.
  - Prefer concrete names like "Mix Dough", "Rest Dough", "Shape And Proof", "Bake Bread", "Cool Bread", "Make Sauce", "Marinate Meat", "Sear Steak", "Simmer Broth".
  - Avoid bare "Prep", "Cook", "Assemble", "Cooking" unless nothing more specific fits.
  - Prefer source section headings when they are already specific; otherwise invent short task names from the technique + subject.
  - Group related consecutive steps under the same task; start a new task when the activity clearly changes.
- Each step needs:
  - title: short label ONLY (2–4 words), e.g. "Sauté bacon", "Simmer chowder" — never a full sentence
  - description: full actionable step text
  - task: specific phase/task name (see above)
  - duration_minutes: estimate from the text (never null; use a reasonable guess)
- Do NOT put tips/storage/make-ahead into steps; put those in notes fields.
- Fill recipe metadata whenever reasonable:
  - course: Appetizer | Main | Side | Dessert | Drink | Soup | Other
  - cuisine: short label when obvious (Italian, Mexican, American, etc.)
  - difficulty: Easy | Medium | Hard
  - dietary_tags: e.g. vegetarian, vegan, gluten-free, dairy-free when clearly true
  - allergy_tags: use canonical allergens: milk, egg, fish, shellfish, tree nuts, peanut, wheat, soy, sesame, gluten. Infer allergens from ingredient identity even when the source does not say them explicitly (for example tofu/tempeh/miso/edamame -> soy; tahini -> sesame; butter/cheese/cream -> milk; pasta/flour/bread -> wheat + gluten; soy sauce -> soy and usually wheat + gluten).
  - Every ingredient allergen_tags array should use those same canonical labels. If an ingredient may contain an allergen but the exact product is ambiguous, include the likely allergen and add a short warning.
  - equipment, make_ahead_notes, storage_notes, reheating_notes, notes
  - prep_minutes, cook_minutes, total_minutes (estimate if missing)
- Prefer ISO-like clarity. Do not invent ingredients that are not implied by the source.
- import_status is "complete" only if title is real, course is set, >=2 ingredients with qty/unit/category, and >=1 instruction step.`;

function buildUserPrompt(
  sourceText: string,
  sourceType: string,
  hints: AiExtractHints,
): string {
  return JSON.stringify(
    {
      source_type: sourceType,
      hints: {
        image_url: hints.image_url ?? null,
        source_url: hints.source_url ?? null,
      },
      source_text: sourceText.slice(0, 28_000),
      schema: {
        is_recipe: "boolean",
        recipe: {
          title: "string",
          description: "string|null",
          servings: "number",
          prep_minutes: "number|null",
          cook_minutes: "number|null",
          total_minutes: "number|null",
          course: "Appetizer|Main|Side|Dessert|Drink|Soup|Other",
          cuisine: "string|null",
          difficulty: "Easy|Medium|Hard|null",
          tags: ["string"],
          dietary_tags: ["string"],
          allergy_tags: ["string"],
          image_url: "string|null",
          source_url: "string|null",
          equipment: ["string"],
          notes: "string|null",
          make_ahead_notes: "string|null",
          storage_notes: "string|null",
          reheating_notes: "string|null",
        },
        ingredients: [
          {
            name: "string (standardized Title Case base name)",
            quantity: "number",
            unit: "string",
            category: "Produce|Dairy|Meat|Dry Goods|Spices|Other",
            preparation_note: "string|null",
            section: "string|null",
            allergen_tags: ["string"],
            sort_order: "number",
          },
        ],
        steps: [
          {
            title: "string (2-4 word label)",
            description: "string (full step text)",
            task: "string (specific phase, e.g. Mix Dough, Make Sauce, Bake Bread — not bare Prep/Cook)",
            duration_minutes: "number",
            sort_order: "number",
          },
        ],
        import_status: "complete|incomplete",
        warnings: ["string"],
      },
    },
    null,
    2,
  );
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCourse(raw: string | null): string | null {
  if (!raw) return null;
  const allowed = ["Appetizer", "Main", "Side", "Dessert", "Drink", "Soup", "Other"];
  const match = allowed.find((item) => item.toLowerCase() === raw.toLowerCase());
  if (match) return match;
  const lower = raw.toLowerCase();
  if (/(appetizer|starter|hors)/.test(lower)) return "Appetizer";
  if (/(main|entree|entrée|dinner)/.test(lower)) return "Main";
  if (/(side|salad)/.test(lower)) return "Side";
  if (/dessert|sweet|cake|cookie|pie/.test(lower)) return "Dessert";
  if (/drink|cocktail|beverage/.test(lower)) return "Drink";
  if (/soup|stew|chowder/.test(lower)) return "Soup";
  return "Other";
}

function normalizeDifficulty(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("easy") || lower.includes("beginner") || lower.includes("simple")) return "Easy";
  if (lower.startsWith("hard") || lower.includes("advanced") || lower.includes("challenging")) return "Hard";
  if (lower.startsWith("med") || lower.includes("intermediate")) return "Medium";
  return null;
}

function normalizeAiDraft(
  raw: unknown,
  sourceType: ImportRecipeDraft["import_source_type"],
  hints: AiExtractHints,
): ImportRecipeDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (obj.is_recipe === false) return null;

  const recipeObj = (obj.recipe && typeof obj.recipe === "object" ? obj.recipe : obj) as Record<
    string,
    unknown
  >;

  const ingredientsRaw = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  const stepsRaw = Array.isArray(obj.steps)
    ? obj.steps
    : Array.isArray(obj.templates)
      ? obj.templates
      : [];

  const ingredients = ingredientsRaw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = asString(row.name);
      if (!name) return null;
      const display = displayIngredientName(name);
      const guessed = guessIngredientCategory(display);
      return {
        name: display,
        quantity: asNumber(row.quantity),
        unit: asString(row.unit),
        category: normalizeIngredientCategory(asString(row.category) || guessed),
        preparation_note: asString(row.preparation_note),
        section: asString(row.section),
        // Ownership comes from user_pantry_items after import — never from the model.
        pantry_flag: false,
        allergen_tags: inferAllergensFromIngredient(display, asStringArray(row.allergen_tags)),
        sort_order: asNumber(row.sort_order) ?? index,
      };
    })
    .filter(Boolean) as ImportRecipeDraft["ingredients"];

  const steps = stepsRaw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const description = asString(row.description) || asString(row.title);
      if (!description) return null;
      const rawTitle = asString(row.title);
      const titleLooksLikeBody =
        !rawTitle || rawTitle === description || rawTitle.length > 28 || rawTitle.includes("…");
      return {
        title: titleLooksLikeBody ? shortStepLabel(description, index) : rawTitle,
        description,
        task: titleCaseTask(asString(row.task) ?? asString(row.section)),
        duration_minutes: asNumber(row.duration_minutes),
        sort_order: asNumber(row.sort_order) ?? index,
      };
    })
    .filter(Boolean) as ImportRecipeDraft["steps"];

  if (!ingredients.length && !steps.length) return null;

  const title = asString(recipeObj.title) || "Untitled recipe";
  const servings = asNumber(recipeObj.servings) || 4;
  const course = normalizeCourse(asString(recipeObj.course));
  const prep = asNumber(recipeObj.prep_minutes);
  const cook = asNumber(recipeObj.cook_minutes);
  const total =
    asNumber(recipeObj.total_minutes) ??
    ((prep ?? 0) + (cook ?? 0) || null);

  const recipe = {
    title,
    description: asString(recipeObj.description),
    servings,
    prep_minutes: prep,
    cook_minutes: cook,
    total_minutes: total,
    course,
    cuisine: asString(recipeObj.cuisine),
    difficulty: normalizeDifficulty(asString(recipeObj.difficulty)),
    tags: asStringArray(recipeObj.tags),
    dietary_tags: asStringArray(recipeObj.dietary_tags),
    allergy_tags: aggregateRecipeAllergens(ingredients as Array<{ name: string; allergen_tags?: string[] }>, asStringArray(recipeObj.allergy_tags)),
    image_url: asString(recipeObj.image_url) ?? hints.image_url ?? null,
    source_url: asString(recipeObj.source_url) ?? hints.source_url ?? null,
    equipment: asStringArray(recipeObj.equipment),
    notes: asString(recipeObj.notes),
    make_ahead_notes: asString(recipeObj.make_ahead_notes),
    storage_notes: asString(recipeObj.storage_notes),
    reheating_notes: asString(recipeObj.reheating_notes),
  };

  const coercedIngredients = mergeDuplicateIngredients(coerceIngredientQuantities(ingredients));
  const timedSteps = ensureStepDurations(steps);
  const assessed = assessImportStatus({
    recipe,
    ingredients: coercedIngredients,
    steps: timedSteps,
  });

  const importStatus =
    obj.import_status === "complete" || obj.import_status === "incomplete"
      ? obj.import_status
      : assessed.import_status;

  const aiWarnings = Array.isArray(obj.warnings)
    ? obj.warnings.filter((item): item is string => typeof item === "string")
    : [];

  return {
    recipe: { ...recipe, import_status: importStatus },
    ingredients: coercedIngredients,
    steps: timedSteps,
    import_status: importStatus,
    import_source_type: sourceType,
    warnings: [...aiWarnings, ...assessed.warnings],
  };
}

/** Full LLM extraction — the primary import path. */
export async function extractRecipeWithAi(options: {
  sourceText: string;
  sourceType: ImportRecipeDraft["import_source_type"];
  hints?: AiExtractHints;
}): Promise<AiExtractResult> {
  const config = getAiConfig();
  if (!config) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Set AI_API_KEY to import recipes (LLM parses everything).",
    };
  }

  const hints = options.hints ?? {};
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(options.sourceText, options.sourceType, hints),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      reason: "request_failed",
      message: `AI import failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`,
    };
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, reason: "parse_failed", message: "AI returned an empty response." };
  }

  try {
    const draft = normalizeAiDraft(JSON.parse(content), options.sourceType, hints);
    if (!draft) {
      return {
        ok: false,
        reason: "non_recipe",
        message: "Could not find a recipe in that source.",
      };
    }
    return { ok: true, draft };
  } catch {
    return { ok: false, reason: "parse_failed", message: "AI returned invalid recipe JSON." };
  }
}
