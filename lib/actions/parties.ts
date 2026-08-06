"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";
import { schedulePartyDerivedRefresh } from "@/lib/party/refresh-derived";
import { createClient } from "@/lib/supabase/server";

type PartyUpdate = Database["public"]["Tables"]["parties"]["Update"];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prep opens at 9am local on the lead day so the timeline starts on a whole day. */
function prepStartFromLead(startsAt: Date, leadDays: number) {
  const days = Number.isFinite(leadDays) ? Math.max(0, Math.min(90, leadDays)) : 14;
  const prep = new Date(startsAt.getTime() - days * DAY_MS);
  if (days > 0) prep.setHours(9, 0, 0, 0);
  return prep;
}

export async function createParty(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const name = String(formData.get("name") ?? "Untitled party").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "18:30");
  const location = String(formData.get("location") ?? "").trim();
  const theme = String(formData.get("theme") ?? "").trim();
  const cuisine = String(formData.get("cuisine") ?? "").trim();
  const serviceStyle = String(formData.get("service_style") ?? "Family style").trim();
  const guestCount = Number(formData.get("guest_count") ?? 8);
  const startsAt = new Date(`${date}T${time}:00`);
  const prepLeadDays = Number(formData.get("prep_lead_days") ?? 14);

  const { data: party, error } = await supabase
    .from("parties")
    .insert({
      owner_id: user.id,
      name,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      prep_starts_at: prepStartFromLead(startsAt, prepLeadDays).toISOString(),
      location,
      theme,
      cuisine,
      service_style: serviceStyle,
      planning_guest_count: Number.isFinite(guestCount) ? guestCount : 8,
      status: "scheduled",
      hero_image: "/photos/party-01.webp",
    })
    .select("id")
    .single();

  if (error || !party) {
    return { error: error?.message ?? "Could not create party." };
  }

  // Owner membership is created by parties_add_owner_member trigger.
  redirect(`/app/parties/${party.id}`);
}

export async function updatePartySettings(partyId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const theme = String(formData.get("theme") ?? "").trim();
  const cuisine = String(formData.get("cuisine") ?? "").trim();
  const serviceStyle = String(formData.get("service_style") ?? "").trim();
  const dressCode = String(formData.get("dress_code") ?? "").trim();
  const guestContributionNotes = String(formData.get("guest_contribution_notes") ?? "").trim();
  const planningGuestCountRaw = formData.get("planning_guest_count");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const prepDate = String(formData.get("prep_date") ?? "");

  const patch: PartyUpdate = {
    name,
    location,
    theme,
    cuisine,
    service_style: serviceStyle,
    dress_code: dressCode,
    guest_contribution_notes: guestContributionNotes,
  };

  if (planningGuestCountRaw != null && planningGuestCountRaw !== "") {
    const planningGuestCount = Number(planningGuestCountRaw);
    if (Number.isFinite(planningGuestCount) && planningGuestCount > 0) {
      patch.planning_guest_count = planningGuestCount;
    }
  }

  if (date && time) {
    const startsAt = new Date(`${date}T${time}:00`);
    patch.starts_at = startsAt.toISOString();
    patch.ends_at = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000).toISOString();
  }

  if (prepDate) {
    patch.prep_starts_at = new Date(`${prepDate}T09:00:00`).toISOString();
  }

  const { error } = await supabase.from("parties").update(patch).eq("id", partyId);
  if (error) return { error: error.message };

  if (patch.planning_guest_count != null) {
    schedulePartyDerivedRefresh(partyId);
  }

  revalidatePath(`/app/parties/${partyId}`);
  revalidatePath(`/app/parties/${partyId}/menu`);
  revalidatePath(`/app/parties/${partyId}/shopping`);
  revalidatePath(`/app/parties/${partyId}/costs`);
  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
}

export async function deleteParty(partyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("parties").delete().eq("id", partyId).eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/parties");
  redirect("/app/parties");
}

export async function toggleGroceryOwned(itemId: string, alreadyOwned: boolean, partyId: string) {
  const supabase = await createClient();
  await supabase.from("grocery_items").update({ already_owned: alreadyOwned }).eq("id", itemId);
  revalidatePath(`/app/parties/${partyId}/shopping`);
}

export async function toggleGroceryPurchased(itemId: string, purchased: boolean, partyId: string) {
  const supabase = await createClient();
  await supabase.from("grocery_items").update({ purchased }).eq("id", itemId);
  revalidatePath(`/app/parties/${partyId}/shopping`);
}

export async function toggleTaskDone(taskId: string, done: boolean, partyId: string) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo" })
    .eq("id", taskId);
  revalidatePath(`/app/parties/${partyId}/timeline`);
}

export async function toggleTaskLocked(taskId: string, locked: boolean, partyId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ locked }).eq("id", taskId);
  revalidatePath(`/app/parties/${partyId}/timeline`);
}

export async function addGuest(partyId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!name) return { error: "Name is required." };

  const { data: guest, error } = await supabase
    .from("guests")
    .insert({
      party_id: partyId,
      name,
      email: email || null,
      rsvp_status: "no_response",
    })
    .select("id")
    .single();

  if (error || !guest) return { error: error?.message ?? "Could not add guest." };

  const { error: inviteError } = await supabase.from("invites").insert({
    party_id: partyId,
    guest_id: guest.id,
  });

  if (inviteError) return { error: inviteError.message };

  revalidatePath(`/app/parties/${partyId}/guests`);
  return { error: null };
}

export async function revokeInvite(inviteId: string, partyId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}/guests`);
  return { error: null };
}

export async function regenerateInvite(inviteId: string, partyId: string) {
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { error } = await supabase
    .from("invites")
    .update({ token, revoked_at: null })
    .eq("id", inviteId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}/guests`);
  return { error: null, token };
}
