import { InvitationEditor } from "@/components/invite/invitation-editor";
import { toDateInputValue, toTimeInputValue } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function InvitationEditorPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();
  const [{ data: party }, { data: menuRows }] = await Promise.all([
    supabase
      .from("parties")
      .select("id,name,starts_at,ends_at,timezone,location,color_scheme,hero_image,cover_crop,dress_code,guest_contribution_notes,invitation_headline,invitation_message,invitation_signoff,invitation_rsvp_label,invitation_photo_urls,invitation_photo_positions,invitation_photo_crops,invitation_menu_overrides")
      .eq("id", partyId)
      .maybeSingle(),
    supabase
      .from("menu_items")
      .select("id,recipe_id,course,sort_order")
      .eq("party_id", partyId)
      .eq("guest_visible", true)
      .order("sort_order"),
  ]);
  if (!party) notFound();

  const recipeIds = (menuRows ?? []).map((row) => row.recipe_id);
  const { data: recipeRows } = recipeIds.length
    ? await supabase.from("recipes").select("id,title,description").in("id", recipeIds)
    : { data: [] as { id: string; title: string; description: string | null }[] };
  const recipes = new Map((recipeRows ?? []).map((recipe) => [recipe.id, recipe]));
  const overrides = (party.invitation_menu_overrides && typeof party.invitation_menu_overrides === "object" && !Array.isArray(party.invitation_menu_overrides)
    ? party.invitation_menu_overrides
    : {}) as Record<string, { title?: string; description?: string }>;

  const menu = (menuRows ?? []).map((row) => {
    const recipe = recipes.get(row.recipe_id);
    const override = overrides[row.id] ?? {};
    return {
      id: row.id,
      course: row.course,
      title: override.title || recipe?.title || "Menu item",
      description: override.description ?? recipe?.description ?? null,
      baseTitle: recipe?.title || "Menu item",
      baseDescription: recipe?.description ?? null,
    };
  });

  return (
    <InvitationEditor
      party={{
        ...party,
        date: toDateInputValue(party.starts_at, party.timezone),
        time: toTimeInputValue(party.starts_at, party.timezone),
      }}
      menu={menu}
    />
  );
}
