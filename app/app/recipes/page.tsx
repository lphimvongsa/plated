import { CookbookBook } from "@/components/cookbook/cookbook-book";
import {
  enrichCookbookRecipe,
  mockCookbookRecipes,
  type CookbookRecipe,
  type PartyOption,
} from "@/lib/cookbook";
import { createClient } from "@/lib/supabase/server";

export default async function CookbookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recipes: CookbookRecipe[] = mockCookbookRecipes();
  let parties: PartyOption[] = [];

  if (user) {
    const [{ data: recipeRows }, { data: memberships }] = await Promise.all([
      supabase
        .from("recipes")
        .select(
          "id, title, course, description, image_url, prep_minutes, cook_minutes, servings, allergy_notes, status, cuisine, instructions, source_url",
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true }),
      supabase.from("party_members").select("party_id").eq("user_id", user.id),
    ]);

    if (recipeRows && recipeRows.length > 0) {
      recipes = recipeRows.map(enrichCookbookRecipe);
    }

    const partyIds = [...new Set((memberships ?? []).map((row) => row.party_id))];
    if (partyIds.length > 0) {
      const { data: partyRows } = await supabase
        .from("parties")
        .select("id, name, starts_at")
        .in("id", partyIds);
      parties = partyRows ?? [];
    }
  }

  return <CookbookBook recipes={recipes} parties={parties} />;
}
