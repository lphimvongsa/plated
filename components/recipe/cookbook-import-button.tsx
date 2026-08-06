"use client";

import { ImportRecipeModal } from "@/components/recipe/import-recipe-modal";
import { Plus } from "lucide-react";
import { useState } from "react";

export function CookbookImportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} /> Import recipe
      </button>
      <ImportRecipeModal open={open} onClose={() => setOpen(false)} newRecipeHref="/app/recipes/new" />
    </>
  );
}
