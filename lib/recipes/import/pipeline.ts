import "server-only";

import { extractRecipeWithAi, isAiConfigured } from "@/lib/recipes/import/ai";
import { fetchRecipePage, looksPaywalled } from "@/lib/recipes/import/fetch-url";
import { extractRecipeFromHtml, htmlToPlainText } from "@/lib/recipes/import/jsonld";
import { extractTextFromPdf } from "@/lib/recipes/import/pdf";
import type { ImportResult } from "@/lib/recipes/import/types";

function mapAiFailure(reason: string, message: string): ImportResult {
  if (reason === "non_recipe") {
    return { ok: false, error: message, code: "non_recipe" };
  }
  if (reason === "not_configured") {
    return { ok: false, error: message, code: "parse_failed" };
  }
  return { ok: false, error: message, code: "parse_failed" };
}

async function parseWithAi(options: {
  sourceText: string;
  sourceType: "url" | "text" | "pdf";
  imageUrl?: string | null;
  sourceUrl?: string | null;
  extraWarnings?: string[];
}): Promise<ImportResult> {
  if (!isAiConfigured()) {
    return {
      ok: false,
      error: "Set AI_API_KEY to import recipes — the LLM parses ingredients, steps, and details.",
      code: "parse_failed",
    };
  }

  const text = options.sourceText.trim();
  if (text.replace(/\s+/g, "").length < 40) {
    return {
      ok: false,
      error: "Not enough recipe text to parse.",
      code: "empty",
    };
  }

  const result = await extractRecipeWithAi({
    sourceText: text,
    sourceType: options.sourceType,
    hints: {
      image_url: options.imageUrl ?? null,
      source_url: options.sourceUrl ?? null,
    },
  });

  if (!result.ok) {
    return mapAiFailure(result.reason, result.message);
  }

  const draft = result.draft;
  if (options.sourceUrl) {
    draft.recipe.source_url = options.sourceUrl;
  }
  if (options.imageUrl && !draft.recipe.image_url) {
    draft.recipe.image_url = options.imageUrl;
  }
  if (options.extraWarnings?.length) {
    draft.warnings = [...options.extraWarnings, ...draft.warnings];
  }

  return { ok: true, draft };
}

function extractOgImage(html: string): string | null {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const url = match?.[1]?.trim();
  return url || null;
}

export async function importFromText(rawText: string): Promise<ImportResult> {
  const text = rawText.trim();
  if (!text) {
    return { ok: false, error: "Paste recipe text first.", code: "empty" };
  }
  return parseWithAi({ sourceText: text, sourceType: "text" });
}

export async function importFromUrl(rawUrl: string): Promise<ImportResult> {
  try {
    const page = await fetchRecipePage(rawUrl);
    if (looksPaywalled(page.html)) {
      return {
        ok: false,
        error: "This recipe looks paywalled or login-walled.",
        code: "paywall",
      };
    }

    const plain = htmlToPlainText(page.html);
    const structured = extractRecipeFromHtml(page.html, page.finalUrl);
    const imageUrl = structured?.image_url ?? extractOgImage(page.html);

    // Prefer page text; if thin, fall back to a compact JSON-LD dump as source text for the LLM.
    let sourceText = plain;
    if (sourceText.replace(/\s+/g, "").length < 80 && structured) {
      const ingredientLines = (structured.ingredients ?? [])
        .map((item) => {
          const qty = item.quantity != null ? `${item.quantity} ` : "";
          const unit = item.unit ? `${item.unit} ` : "";
          return `${qty}${unit}${item.name}`.trim();
        })
        .join("\n");
      const stepLines = (structured.steps ?? [])
        .map((item, index) => `${index + 1}. ${item.description || item.title}`)
        .join("\n");
      sourceText = [
        structured.title ? `Title: ${structured.title}` : "",
        structured.description ? `Description: ${structured.description}` : "",
        structured.servings ? `Servings: ${structured.servings}` : "",
        structured.course ? `Course: ${structured.course}` : "",
        structured.cuisine ? `Cuisine: ${structured.cuisine}` : "",
        structured.prep_minutes != null ? `Prep: ${structured.prep_minutes} min` : "",
        structured.cook_minutes != null ? `Cook: ${structured.cook_minutes} min` : "",
        ingredientLines ? `\nIngredients:\n${ingredientLines}` : "",
        stepLines ? `\nInstructions:\n${stepLines}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return parseWithAi({
      sourceText,
      sourceType: "url",
      imageUrl,
      sourceUrl: page.finalUrl,
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "paywall") {
      return { ok: false, error: err.message, code: "paywall" };
    }
    if (err.message?.includes("blocked for security")) {
      return { ok: false, error: err.message, code: "blocked" };
    }
    return {
      ok: false,
      error: err.message || "Could not import from that URL.",
      code: "fetch_failed",
    };
  }
}

export async function importFromPdf(data: ArrayBuffer | Uint8Array, fileName?: string): Promise<ImportResult> {
  try {
    const { text, pageCount } = await extractTextFromPdf(data);
    if (!text || text.replace(/\s+/g, "").length < 40) {
      return {
        ok: false,
        error:
          "Could not extract usable text from that PDF. Image-only scans are not supported in v1 — try paste text or a text PDF.",
        code: "empty",
      };
    }

    return parseWithAi({
      sourceText: text,
      sourceType: "pdf",
      extraWarnings: [
        `Extracted text from PDF${fileName ? ` (${fileName})` : ""}${pageCount ? `, ${pageCount} page(s)` : ""}. Source file is not retained.`,
      ],
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not read that PDF.",
      code: "parse_failed",
    };
  }
}
