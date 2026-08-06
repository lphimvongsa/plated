import {
  displayIngredientName,
  guessIngredientCategory,
  shortStepLabel,
} from "@/lib/recipes/standardize";

export type ParsedIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  section?: string | null;
  category?: string | null;
  preparation_note?: string | null;
  pantry_flag?: boolean;
  allergen_tags?: string[];
  sort_order?: number;
};

export type ParsedStep = {
  title: string;
  description?: string | null;
  duration_minutes?: number | null;
  task?: string | null;
  sort_order?: number;
};

export type ParsedRecipeDraft = {
  recipe: {
    title: string;
    servings: number;
    prep_minutes?: number | null;
    cook_minutes?: number | null;
    total_minutes?: number | null;
    description?: string | null;
    notes?: string | null;
    import_status?: string;
  };
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
  import_status: "complete" | "incomplete";
  warnings: string[];
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const UNIT_PATTERN =
  "(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz\\.?|ounces?|lbs?\\.?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|litres?|cloves?|cans?|packages?|pkg|slices?|pieces?|pinch|pinches|bunch|bunches|heads?|stalks?|sprigs?|strips?|ribs?|cubes?|leaves?|each|whole|medium|large|small)?";

const QTY_PATTERN = `(\\d+\\s+[\\d/${Object.keys(UNICODE_FRACTIONS).join("")}]+|[\\d/${Object.keys(UNICODE_FRACTIONS).join("")}]+|\\d+(?:\\.\\d+)?)`;

const INGREDIENT_LINE = new RegExp(
  `^\\s*(?:[-*•]\\s*)?(?:${QTY_PATTERN}\\s*)?${UNIT_PATTERN}\\s*(.+)$`,
  "i",
);

const SECTION_LINE =
  /^(?:for the\s+.+|dressing|sauce|marinade|garnish|topping|seasonings?)s?:?\s*$/i;
const INSTRUCTIONS_HEADER = /^(instructions?|directions?|method|steps?)\b/i;
const INGREDIENTS_HEADER = /^ingredients?\b/i;
const NOTES_HEADER = /^(notes?|pro tips?|tips?|storage|nutrition|nutritional information|calories)\b/i;
const META_LINE =
  /^(prep(?:\s*time)?|cook(?:\s*time)?|total(?:\s*time)?|course|cuisine|servings?|yield|calories|author|keyword|category)\b/i;
const TIME_JUNK =
  /^\d+\s*(?:minutes?|mins?|hours?|hrs?)(?:\s*(?:minutes?|mins?|hours?|hrs?))*$/i;
const SERVINGS_LINE = /(?:serves?|servings?|yield)\s*[:\-]?\s*(\d+)/i;

function parseFraction(raw: string | undefined): number | null {
  if (!raw) return null;
  let cleaned = raw.trim().replace(/\s+/g, " ");
  for (const [glyph, value] of Object.entries(UNICODE_FRACTIONS)) {
    cleaned = cleaned.replace(new RegExp(glyph, "g"), ` ${value} `);
  }
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const mixed = cleaned.match(/^(\d+)\s+(\d+(?:\.\d+)?)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]);

  const frac = cleaned.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeUnit(unit: string | undefined): string | null {
  if (!unit) return null;
  const u = unit.toLowerCase().replace(/\.$/, "");
  if (u.startsWith("cup")) return "cup";
  if (u.startsWith("tbsp") || u.startsWith("tablespoon")) return "tbsp";
  if (u.startsWith("tsp") || u.startsWith("teaspoon")) return "tsp";
  if (u === "oz" || u.startsWith("ounce")) return "oz";
  if (u.startsWith("lb") || u.startsWith("pound")) return "lb";
  if (u === "g" || u.startsWith("gram")) return "g";
  if (u === "kg" || u.startsWith("kilogram")) return "kg";
  if (u === "ml" || u.startsWith("milliliter")) return "ml";
  if (u === "l" || u.startsWith("liter") || u.startsWith("litre")) return "l";
  if (u.startsWith("clove")) return "clove";
  if (u.startsWith("can")) return "can";
  if (u.startsWith("package") || u === "pkg") return "package";
  if (u.startsWith("slice")) return "slice";
  if (u.startsWith("piece")) return "piece";
  if (u.startsWith("pinch")) return "pinch";
  if (u.startsWith("bunch")) return "bunch";
  if (u.startsWith("head")) return "head";
  if (u.startsWith("stalk") || u.startsWith("rib")) return "stalk";
  if (u.startsWith("sprig")) return "sprig";
  if (u.startsWith("strip")) return "strip";
  if (u.startsWith("cube")) return "cube";
  if (u.startsWith("leaf") || u === "leaves") return "each";
  if (u === "medium" || u === "large" || u === "small" || u === "each" || u === "whole") return "each";
  return u;
}

function guessQuantity(name: string): { quantity: number; unit: string } {
  const lower = name.toLowerCase();
  if (/(salt|pepper|spice|seasoning)/.test(lower)) return { quantity: 1, unit: "tsp" };
  if (/(oil|vinegar|sauce|milk|cream|stock|broth|water|juice)/.test(lower)) {
    return { quantity: 1, unit: "tbsp" };
  }
  if (/(onion|garlic|lemon|lime|egg|tomato|pepper|chili|bay leaf)/.test(lower)) {
    return { quantity: 1, unit: "each" };
  }
  return { quantity: 1, unit: "each" };
}

function estimateStepMinutes(text: string, index: number, total: number): number {
  const match = text.match(/(\d+)\s*(?:-|to\s+)?(\d+)?\s*(minutes?|mins?|hours?|hrs?)/i);
  if (match) {
    const a = Number(match[1]);
    const b = match[2] ? Number(match[2]) : a;
    const avg = (a + b) / 2;
    if (/hour/i.test(match[3])) return Math.round(avg * 60);
    return Math.round(avg);
  }
  if (/boil|simmer|bake|roast|grill/i.test(text)) return 15;
  if (/chop|dice|slice|mince|prep/i.test(text)) return 10;
  if (/mix|stir|combine|toss/i.test(text)) return 5;
  return Math.max(5, Math.round(20 - index * (10 / Math.max(total, 1))));
}

function minutesFromTimeChunk(chunk: string): number | null {
  const lower = chunk.toLowerCase().replace(/\s+/g, " ").trim();
  if (!lower) return null;
  let minutes = 0;
  let found = false;
  const hour = lower.match(/(\d+)\s*(?:hours?|hrs?|h)\b/);
  if (hour) {
    minutes += Number(hour[1]) * 60;
    found = true;
  }
  // Match "15minutes", "15 minutes", or trailing "15mins" after an hour clause
  const minMatches = [...lower.matchAll(/(\d+)\s*(?:minutes?|mins?|m)\b/g)];
  if (minMatches.length) {
    // Prefer the last minutes figure when both hour and minutes are present
    minutes += Number(minMatches[minMatches.length - 1][1]);
    found = true;
  }
  if (found) return minutes;
  const bare = lower.match(/^(\d+)$/);
  return bare ? Number(bare[1]) : null;
}

function parseTimeBlock(lines: string[]): {
  prep_minutes: number | null;
  cook_minutes: number | null;
  total_minutes: number | null;
  servings: number | null;
} {
  const head = lines.slice(0, 24);
  const readLabeled = (label: string): number | null => {
    const idx = head.findIndex((line) => new RegExp(`^${label}\\b`, "i").test(line));
    if (idx < 0) {
      // Same-line form: "Prep Time: 15 minutes"
      const inline = head.join(" ").match(
        new RegExp(`${label}\\s*(?:time)?\\s*[:\\-]?\\s*([\\d\\s\\w]+?)(?=(?:prep|cook|total|course|cuisine|servings?|yield|calories|author)\\b|$)`, "i"),
      );
      return inline ? minutesFromTimeChunk(inline[1]) : null;
    }
    const sameLine = head[idx].replace(new RegExp(`^${label}\\s*(?:time)?\\s*[:\\-]?\\s*`, "i"), "");
    if (/\d/.test(sameLine)) return minutesFromTimeChunk(sameLine);
    const next = head[idx + 1] ?? "";
    return minutesFromTimeChunk(next);
  };

  const servingsMatch = head.join(" ").match(SERVINGS_LINE);
  return {
    prep_minutes: readLabeled("prep"),
    cook_minutes: readLabeled("cook"),
    total_minutes: readLabeled("total"),
    servings: servingsMatch ? Number(servingsMatch[1]) : null,
  };
}

function isMetaOrTimeJunk(line: string): boolean {
  if (META_LINE.test(line)) return true;
  if (TIME_JUNK.test(line.replace(/\s+/g, ""))) return true;
  if (/^\d+(?:minutes?|mins?|hours?|hrs?)/i.test(line.replace(/\s+/g, " "))) return true;
  if (/^(?:minutes?|mins?|hours?|hrs?)(?:\s|$)/i.test(line)) return true;
  if (/course\s*:|cuisine\s*:|calories\s*:|author\s*:/i.test(line)) return true;
  return false;
}

function makeIngredient(
  name: string,
  quantity: number | null,
  unit: string | null,
  sortOrder: number,
  section: string | null = null,
): ParsedIngredient {
  const display = displayIngredientName(name);
  return {
    name: display,
    quantity,
    unit,
    section: null,
    category: guessIngredientCategory(display),
    pantry_flag: false,
    allergen_tags: [],
    sort_order: sortOrder,
  };
}

function expandEachIngredients(line: string, section: string | null, startOrder: number): ParsedIngredient[] | null {
  const match = line.match(
    /^([¼½¾⅓⅔⅛⅜⅝⅞\d\s\/\.]+)\s*(teaspoons?|teaspoon|tsp|tablespoons?|tablespoon|tbsp)\s+EACH:\s*(.+)$/i,
  );
  if (!match) return null;
  const quantity = parseFraction(match[1]);
  const unit = normalizeUnit(match[2]) ?? "tsp";
  const names = match[3]
    .split(/,|\/|&| and /i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!names.length) return null;
  return names.map((name, index) => makeIngredient(name, quantity ?? 1, unit, startOrder + index, section));
}

/**
 * Heuristic paste-text parser for v1 (no AI). Marks incomplete when critical pieces are missing.
 */
export function parseRecipeText(raw: string): ParsedRecipeDraft {
  const warnings: string[] = [];
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return {
      recipe: { title: "Untitled recipe", servings: 4, import_status: "incomplete" },
      ingredients: [],
      steps: [],
      import_status: "incomplete",
      warnings: ["No text provided."],
    };
  }

  let title = lines[0];
  if (/^ingredients?$/i.test(title) || INSTRUCTIONS_HEADER.test(title)) {
    title = "Untitled recipe";
    warnings.push("Could not detect a title; using a placeholder.");
  }

  const times = parseTimeBlock(lines);
  let servings = times.servings ?? 4;
  let prep_minutes = times.prep_minutes;
  let cook_minutes = times.cook_minutes;
  let total_minutes = times.total_minutes;
  let description: string | null = null;

  let mode: "scan" | "ingredients" | "instructions" | "notes" = "scan";
  let currentSection: string | null = null;
  const ingredients: ParsedIngredient[] = [];
  const instructionLines: { text: string; task: string | null }[] = [];
  const noteLines: string[] = [];
  let instructionTask: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line === title) continue;

    if (INGREDIENTS_HEADER.test(line)) {
      mode = "ingredients";
      currentSection = null;
      continue;
    }
    if (INSTRUCTIONS_HEADER.test(line)) {
      mode = "instructions";
      instructionTask = null;
      continue;
    }
    if (NOTES_HEADER.test(line)) {
      mode = "notes";
      noteLines.push(line);
      continue;
    }

    if (mode === "scan") {
      if (isMetaOrTimeJunk(line)) continue;
      if (i > 0 && i < 5 && line.length > 40 && !/^[-*•\d]/.test(line)) {
        description = description ? `${description} ${line}` : line;
        continue;
      }
      // Do not treat early numeric time/meta lines as ingredients
      if (isMetaOrTimeJunk(line) || TIME_JUNK.test(line)) continue;
    }

    if (mode === "notes") {
      noteLines.push(line);
      continue;
    }

    if (SECTION_LINE.test(line) && mode !== "instructions") {
      mode = "ingredients";
      currentSection = line.replace(/:$/, "");
      continue;
    }

    if (mode === "instructions") {
      if (/^(prep work|make the\b.+)$/i.test(line) && line.length < 48) {
        instructionTask = line;
        continue;
      }
      instructionLines.push({
        text: line.replace(/^\d+[\).\]]\s+/, "").replace(/^[-*•]\s+/, ""),
        task: instructionTask,
      });
      continue;
    }

    if (mode === "ingredients" || (mode === "scan" && /^[-*•]/.test(line))) {
      if (mode === "scan" && isMetaOrTimeJunk(line)) continue;

      const eachExpanded = expandEachIngredients(line, currentSection, ingredients.length);
      if (eachExpanded) {
        mode = "ingredients";
        ingredients.push(...eachExpanded);
        continue;
      }

      const match = line.match(INGREDIENT_LINE);
      if (match && (mode === "ingredients" || /^[-*•\d]/.test(line))) {
        // Guard: digit lines that are clearly times
        if (isMetaOrTimeJunk(line) || /minute|hour|mins?|hrs?/i.test(line) && /time/i.test(line)) {
          continue;
        }
        mode = "ingredients";
        let quantity = parseFraction(match[1]);
        let unit = normalizeUnit(match[2]);
        let name = (match[3] ?? "").replace(/\s+/g, " ").trim();
        name = name.replace(/^of\s+/i, "").replace(/^\.\s*/, "");

        if (quantity == null) {
          const guessed = guessQuantity(name || line);
          quantity = guessed.quantity;
          unit = unit ?? guessed.unit;
          warnings.push(`Estimated quantity for “${name || line}”.`);
        }
        if (!unit) {
          unit = "each";
          warnings.push(`Assumed unit “each” for “${name || line}”.`);
        }
        if (!name) name = line;

        ingredients.push(makeIngredient(name, quantity, unit, ingredients.length, currentSection));
        continue;
      }
    }

    if (mode === "scan" && /^\d+[\).\]]\s+/.test(line)) {
      mode = "instructions";
      instructionLines.push({
        text: line.replace(/^\d+[\).\]]\s+/, ""),
        task: null,
      });
    }
  }

  // Fallback ingredient scan before numbered steps
  if (!ingredients.length) {
    for (const line of lines.slice(1)) {
      if (INSTRUCTIONS_HEADER.test(line) || NOTES_HEADER.test(line) || /^\d+[\).\]]\s+/.test(line)) break;
      if (isMetaOrTimeJunk(line) || INGREDIENTS_HEADER.test(line)) continue;
      const eachExpanded = expandEachIngredients(line, null, ingredients.length);
      if (eachExpanded) {
        ingredients.push(...eachExpanded);
        continue;
      }
      const match = line.match(INGREDIENT_LINE);
      if (!match || !/^[-*•\d]/.test(line)) continue;
      let quantity = parseFraction(match[1]);
      let unit = normalizeUnit(match[2]);
      let name = (match[3] ?? line).replace(/^of\s+/i, "").replace(/^\.\s*/, "").trim();
      if (quantity == null) {
        const guessed = guessQuantity(name);
        quantity = guessed.quantity;
        unit = unit ?? guessed.unit;
      }
      ingredients.push(makeIngredient(name, quantity, unit ?? "each", ingredients.length));
    }
  }

  if (!instructionLines.length) {
    const start = lines.findIndex((line) => INSTRUCTIONS_HEADER.test(line) || /^\d+[\).\]]\s+/.test(line));
    if (start >= 0) {
      for (const line of lines.slice(start)) {
        if (INSTRUCTIONS_HEADER.test(line)) continue;
        if (NOTES_HEADER.test(line)) break;
        instructionLines.push({
          text: line.replace(/^\d+[\).\]]\s+/, ""),
          task: null,
        });
      }
    }
  }

  const steps: ParsedStep[] = instructionLines
    .filter((row) => row.text.trim().length > 0)
    .map((row, index, arr) => ({
      title: shortStepLabel(row.text, index),
      description: row.text,
      task: row.task?.trim() || "Cooking",
      duration_minutes: estimateStepMinutes(row.text, index, arr.length),
      sort_order: index,
    }));

  if (total_minutes == null) {
    total_minutes =
      (prep_minutes ?? 0) + (cook_minutes ?? 0) ||
      steps.reduce((sum, step) => sum + (step.duration_minutes ?? 0), 0) ||
      null;
  }

  if (!ingredients.length) warnings.push("No ingredients detected.");
  if (!steps.length) warnings.push("No instruction steps detected.");

  const import_status =
    ingredients.length >= 2 && steps.length >= 1 && title !== "Untitled recipe"
      ? "complete"
      : "incomplete";

  const notes =
    noteLines.length > 0
      ? noteLines
          .filter((line) => !NOTES_HEADER.test(line))
          .join("\n")
          .trim() || null
      : null;

  return {
    recipe: {
      title,
      servings,
      prep_minutes,
      cook_minutes,
      total_minutes,
      import_status,
      description,
      ...(notes ? { notes } : {}),
    },
    ingredients,
    steps,
    import_status,
    warnings,
  };
}
