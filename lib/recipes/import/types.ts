import type { ParsedIngredient, ParsedRecipeDraft, ParsedStep } from "@/lib/recipes/parse-text";

export type ImportSourceType = "url" | "text" | "pdf" | "manual";

export type ImportRecipeDraft = ParsedRecipeDraft & {
  recipe: ParsedRecipeDraft["recipe"] & {
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
  import_source_type: ImportSourceType;
};

export type ImportFailure = {
  ok: false;
  error: string;
  code?: "paywall" | "empty" | "non_recipe" | "blocked" | "fetch_failed" | "parse_failed";
};

export type ImportSuccess = {
  ok: true;
  draft: ImportRecipeDraft;
};

export type ImportResult = ImportSuccess | ImportFailure;

export type PartialExtract = {
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  servings?: number | null;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  total_minutes?: number | null;
  course?: string | null;
  cuisine?: string | null;
  ingredients?: ParsedIngredient[];
  steps?: ParsedStep[];
  notes?: string | null;
  equipment?: string[];
  warnings?: string[];
};

export { type ParsedIngredient, type ParsedStep };
