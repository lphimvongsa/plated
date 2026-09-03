"use server";

import { revalidatePath } from "next/cache";
import { requirePartyEditor } from "@/lib/party/access";
import { schedulePartyDerivedRefresh } from "@/lib/party/refresh-derived";

function revalidateMenu(partyId: string) {
  revalidatePath(`/app/parties/${partyId}`);
  revalidatePath(`/app/parties/${partyId}/menu`);
  revalidatePath(`/app/parties/${partyId}/recipes`);
  revalidatePath(`/app/parties/${partyId}/shopping`);
  revalidatePath(`/app/parties/${partyId}/timeline`);
  revalidatePath(`/app/parties/${partyId}/costs`);
}

export async function removeRecipeFromMenu(partyId: string, recipeId: string) {
  const access = await requirePartyEditor(partyId);
  if (access.error) return { error: access.error };
  const { supabase } = access;

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("party_id", partyId)
    .eq("recipe_id", recipeId);

  if (error) return { error: error.message };

  // Drop timeline bars for this dish immediately (don't wait for background sync).
  await supabase.from("tasks").delete().eq("party_id", partyId).eq("recipe_id", recipeId);

  schedulePartyDerivedRefresh(partyId);
  revalidateMenu(partyId);
  return { error: null };
}

export async function updatePlanningServings(partyId: string, guestCount: number) {
  const access = await requirePartyEditor(partyId);
  if (access.error) return { error: access.error };
  const { supabase } = access;
  const next = Math.max(1, Math.min(500, Math.round(guestCount)));

  const { error } = await supabase
    .from("parties")
    .update({ planning_guest_count: next })
    .eq("id", partyId);

  if (error) return { error: error.message };

  schedulePartyDerivedRefresh(partyId);
  revalidateMenu(partyId);
  return { error: null, guestCount: next };
}

export async function addPartyRecipeToMenu(partyId: string, recipeId: string) {
  const access = await requirePartyEditor(partyId);
  if (access.error) return { error: access.error };
  const { supabase } = access;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, course, party_id")
    .eq("id", recipeId)
    .eq("party_id", partyId)
    .maybeSingle();

  if (!recipe) {
    return { error: "Party recipe not found." };
  }

  const { data: existing } = await supabase
    .from("menu_items")
    .select("id")
    .eq("party_id", partyId)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existing) {
    return { error: "Recipe is already on the menu.", recipeId };
  }

  const { data: maxSort } = await supabase
    .from("menu_items")
    .select("sort_order")
    .eq("party_id", partyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("menu_items").insert({
    party_id: partyId,
    recipe_id: recipeId,
    course: recipe.course,
    sort_order: (maxSort?.sort_order ?? -1) + 1,
  });

  if (error) return { error: error.message };

  schedulePartyDerivedRefresh(partyId);
  revalidateMenu(partyId);
  return { error: null, recipeId };
}

export async function updateServiceStyle(partyId: string, serviceStyle: string) {
  const access = await requirePartyEditor(partyId);
  if (access.error) return { error: access.error };
  const { error } = await access.supabase.from("parties").update({ service_style: serviceStyle }).eq("id", partyId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}/menu`);
  revalidatePath(`/app/parties/${partyId}`);
  return { error: null };
}
