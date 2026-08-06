"use server";

import {
  importFromPdf,
  importFromText,
  importFromUrl,
} from "@/lib/recipes/import/pipeline";
import type { ImportRecipeDraft, ImportResult } from "@/lib/recipes/import/types";
import { applyPantryFlags } from "@/lib/recipes/pantry";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

async function withUserPantryFlags(
  draft: ImportRecipeDraft,
  userId: string,
): Promise<ImportRecipeDraft> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_pantry_items").select("name").eq("user_id", userId);
  const pantryNames = (data ?? []).map((row) => row.name);
  return {
    ...draft,
    ingredients: applyPantryFlags(draft.ingredients, pantryNames),
  };
}

async function afterImport(result: ImportResult, userId: string): Promise<ImportResult> {
  if (!result.ok) return result;
  return { ok: true, draft: await withUserPantryFlags(result.draft, userId) };
}

export async function importRecipeFromUrlAction(url: string): Promise<ImportResult> {
  const { user } = await requireUser();
  return afterImport(await importFromUrl(url), user.id);
}

export async function importRecipeFromTextAction(text: string): Promise<ImportResult> {
  const { user } = await requireUser();
  return afterImport(await importFromText(text), user.id);
}

export async function importRecipeFromPdfAction(formData: FormData): Promise<ImportResult> {
  const { user } = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose a PDF file first.", code: "empty" };
  }
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "Only PDF uploads are supported in v1.", code: "parse_failed" };
  }
  const buffer = await file.arrayBuffer();
  return afterImport(await importFromPdf(buffer, file.name), user.id);
}
