"use client";

import { CookbookBook } from "@/components/recipe/cookbook-book";
import { CookbookRecipesSection, type CookbookRecipeCard } from "@/components/recipe/cookbook-recipes-section";
import {
  COOKBOOK_VIEW_CHANGE_EVENT,
  DEFAULT_COOKBOOK_VIEW,
  getCookbookViewMode,
  type CookbookViewMode,
} from "@/lib/recipes/cookbook-view-preference";
import type { BookRecipe } from "@/lib/recipes/paginate-book";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CookbookView({
  recipes,
  bookRecipes,
}: {
  recipes: CookbookRecipeCard[];
  bookRecipes: BookRecipe[];
}) {
  const [mode, setMode] = useState<CookbookViewMode>(DEFAULT_COOKBOOK_VIEW);

  useEffect(() => {
    setMode(getCookbookViewMode());
    function onChange(event: Event) {
      const detail = (event as CustomEvent<CookbookViewMode>).detail;
      if (detail === "book" || detail === "grid") setMode(detail);
      else setMode(getCookbookViewMode());
    }
    function onStorage(event: StorageEvent) {
      if (event.key === "plated.cookbookViewMode") setMode(getCookbookViewMode());
    }
    window.addEventListener(COOKBOOK_VIEW_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKBOOK_VIEW_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (mode === "grid") {
    return <CookbookRecipesSection recipes={recipes} />;
  }

  return (
    <div className="space-y-4">
      <CookbookBook recipes={bookRecipes} />
      <p className="text-center text-xs text-ink/40">
        Want the card grid instead?{" "}
        <Link href="/app/settings?section=Cookbook" className="font-semibold text-tomato hover:underline">
          Change cookbook view in Settings
        </Link>
      </p>
    </div>
  );
}
