import type { ImportRecipeDraft } from "@/lib/recipes/import/types";
import type { ParsedRecipeDraft } from "@/lib/recipes/parse-text";

export const RECIPE_DRAFT_KEY = "plated.recipe-draft";

export type StoredRecipeDraft = ParsedRecipeDraft | ImportRecipeDraft;

export function saveRecipeDraft(draft: StoredRecipeDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RECIPE_DRAFT_KEY, JSON.stringify(draft));
}

export function loadRecipeDraft(): StoredRecipeDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(RECIPE_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredRecipeDraft;
  } catch {
    return null;
  }
}

export function clearRecipeDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RECIPE_DRAFT_KEY);
}
