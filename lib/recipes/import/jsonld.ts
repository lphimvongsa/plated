import { durationToMinutes, yieldToServings } from "@/lib/recipes/import/duration";
import type { PartialExtract, ParsedIngredient, ParsedStep } from "@/lib/recipes/import/types";
import { parseRecipeText } from "@/lib/recipes/parse-text";

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj["@value"] === "string") return obj["@value"].trim();
    if (typeof obj.text === "string") return obj.text.trim();
    if (typeof obj.name === "string") return obj.name.trim();
  }
  return "";
}

function firstImage(value: unknown): string | null {
  for (const item of asArray(value)) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (item && typeof item === "object") {
      const url = textOf((item as Record<string, unknown>).url);
      if (url) return url;
    }
  }
  return null;
}

function isRecipeType(type: unknown): boolean {
  return asArray(type).some((entry) => String(entry).toLowerCase().includes("recipe"));
}

function walkGraph(node: unknown, out: Record<string, unknown>[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkGraph(item, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  out.push(obj);
  if (obj["@graph"]) walkGraph(obj["@graph"], out);
}

function parseIngredientLine(line: string, index: number, section: string | null): ParsedIngredient {
  const trimmed = line.trim();
  const parsed = parseRecipeText(`Ingredients\n${trimmed}\nInstructions\n1. Cook.`);
  const first = parsed.ingredients[0];
  if (first?.name) {
    return {
      ...first,
      section: section ?? first.section ?? null,
      sort_order: index,
    };
  }
  return {
    name: trimmed,
    quantity: null,
    unit: null,
    section,
    pantry_flag: false,
    allergen_tags: [],
    sort_order: index,
  };
}

function parseInstructions(raw: unknown): ParsedStep[] {
  const steps: ParsedStep[] = [];

  function pushStep(text: string, task: string | null) {
    const cleaned = text.replace(/^\d+[\).\]]\s+/, "").trim();
    if (!cleaned) return;
    steps.push({
      title: cleaned.length > 72 ? `${cleaned.slice(0, 69)}…` : cleaned,
      description: cleaned,
      duration_minutes: null,
      sort_order: steps.length,
      ...(task ? { task } : {}),
    });
  }

  function walk(node: unknown, task: string | null = null) {
    for (const item of asArray(node)) {
      if (typeof item === "string") {
        pushStep(item, task);
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const type = String(obj["@type"] ?? "");
      if (/HowToSection/i.test(type)) {
        const taskName = textOf(obj.name) || task;
        walk(obj.itemListElement ?? obj.steps ?? obj.supply, taskName);
        continue;
      }
      if (/HowToStep|HowToDirection|HowToTip/i.test(type) || obj.text || obj.name) {
        pushStep(textOf(obj.text) || textOf(obj.name), task);
        continue;
      }
      if (obj.itemListElement) walk(obj.itemListElement, task);
    }
  }

  walk(raw);
  return steps;
}

function recipeFromObject(obj: Record<string, unknown>, sourceUrl: string): PartialExtract {
  const ingredientLines = asArray(obj.recipeIngredient ?? obj.ingredients)
    .map((line) => textOf(line))
    .filter(Boolean);

  let currentSection: string | null = null;
  const ingredients: ParsedIngredient[] = [];
  for (const line of ingredientLines) {
    if (/^seasonings?$|^for the\s+/i.test(line) && line.length < 48) {
      currentSection = line.replace(/:$/, "");
      continue;
    }
    ingredients.push(parseIngredientLine(line, ingredients.length, currentSection));
  }

  const steps = parseInstructions(obj.recipeInstructions ?? obj.instructions);
  const servings =
    yieldToServings(obj.recipeYield ?? obj.yield) ??
    yieldToServings(obj.servings) ??
    null;

  return {
    title: textOf(obj.name) || textOf(obj.headline) || null,
    description: textOf(obj.description) || null,
    image_url: firstImage(obj.image),
    source_url: sourceUrl,
    servings,
    prep_minutes: durationToMinutes(obj.prepTime),
    cook_minutes: durationToMinutes(obj.cookTime),
    total_minutes: durationToMinutes(obj.totalTime),
    course: textOf(obj.recipeCategory) || null,
    cuisine: textOf(obj.recipeCuisine) || null,
    ingredients,
    steps,
    notes: null,
    equipment: asArray(obj.tool ?? obj.equipment)
      .map((item) => textOf(item))
      .filter(Boolean),
    warnings: [],
  };
}

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const raw = match[1]
      .trim()
      .replace(/^\s*<!--/, "")
      .replace(/-->\s*$/, "");
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // ignore malformed blocks
    }
  }
  return blocks;
}

function scoreRecipe(extract: PartialExtract): number {
  return (
    (extract.title ? 2 : 0) +
    (extract.ingredients?.length ?? 0) +
    (extract.steps?.length ?? 0) * 2
  );
}

/** Extract schema.org Recipe objects from page HTML (JSON-LD first). */
export function extractRecipeFromHtml(html: string, sourceUrl: string): PartialExtract | null {
  const nodes: Record<string, unknown>[] = [];
  for (const block of extractJsonLdBlocks(html)) walkGraph(block, nodes);

  const candidates = nodes
    .filter((node) => isRecipeType(node["@type"]) || node.recipeIngredient || node.recipeInstructions)
    .map((node) => recipeFromObject(node, sourceUrl))
    .filter((extract) => (extract.ingredients?.length ?? 0) > 0 || (extract.steps?.length ?? 0) > 0);

  if (!candidates.length) {
    return extractMicrodataRecipe(html, sourceUrl);
  }

  candidates.sort((a, b) => scoreRecipe(b) - scoreRecipe(a));
  return candidates[0] ?? null;
}

function extractMicrodataRecipe(html: string, sourceUrl: string): PartialExtract | null {
  if (!/itemtype=["'][^"']*schema\.org\/Recipe["']/i.test(html)) return null;

  const chunkMatch = html.match(
    /itemtype=["'][^"']*schema\.org\/Recipe["'][\s\S]{0,120000}?(?=itemtype=["']https?:\/\/schema\.org\/(?!Recipe)|$)/i,
  );
  const chunk = chunkMatch?.[0] ?? html;

  const props = (name: string): string[] => {
    const values: string[] = [];
    const re = new RegExp(
      `itemprop=["']${name}["'][^>]*content=["']([^"']+)["']|itemprop=["']${name}["'][^>]*>([^<]+)`,
      "gi",
    );
    let match: RegExpExecArray | null;
    while ((match = re.exec(chunk))) {
      const value = (match[1] || match[2] || "").trim();
      if (value) values.push(value);
    }
    return values;
  };

  const ingredients = props("recipeIngredient").map((line, index) =>
    parseIngredientLine(line, index, null),
  );
  const steps = props("recipeInstructions").map((line, index) => ({
    title: line.length > 72 ? `${line.slice(0, 69)}…` : line,
    description: line,
    duration_minutes: null as number | null,
    sort_order: index,
  }));

  if (!ingredients.length && !steps.length) return null;

  return {
    title: props("name")[0] ?? null,
    description: props("description")[0] ?? null,
    image_url: props("image")[0] ?? null,
    source_url: sourceUrl,
    servings: yieldToServings(props("recipeYield")[0]),
    prep_minutes: durationToMinutes(props("prepTime")[0]),
    cook_minutes: durationToMinutes(props("cookTime")[0]),
    total_minutes: durationToMinutes(props("totalTime")[0]),
    course: props("recipeCategory")[0] ?? null,
    cuisine: props("recipeCuisine")[0] ?? null,
    ingredients,
    steps,
    warnings: ["Extracted from microdata; review recommended."],
  };
}

/** Strip scripts/styles and collapse whitespace for AI / heuristic fallback. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|br|tr|section|article)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, 40_000);
}
