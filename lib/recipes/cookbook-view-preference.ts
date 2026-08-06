export type CookbookViewMode = "book" | "grid";

export const COOKBOOK_VIEW_STORAGE_KEY = "plated.cookbookViewMode";
export const COOKBOOK_VIEW_CHANGE_EVENT = "plated:cookbook-view";
export const DEFAULT_COOKBOOK_VIEW: CookbookViewMode = "book";

export function getCookbookViewMode(): CookbookViewMode {
  if (typeof window === "undefined") return DEFAULT_COOKBOOK_VIEW;
  try {
    const value = window.localStorage.getItem(COOKBOOK_VIEW_STORAGE_KEY);
    return value === "grid" ? "grid" : "book";
  } catch {
    return DEFAULT_COOKBOOK_VIEW;
  }
}

export function setCookbookViewMode(mode: CookbookViewMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKBOOK_VIEW_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / private-mode failures; in-memory UI still updates.
  }
  window.dispatchEvent(new CustomEvent(COOKBOOK_VIEW_CHANGE_EVENT, { detail: mode }));
}
