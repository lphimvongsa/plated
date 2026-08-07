"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type PartyUpdate = Database["public"]["Tables"]["parties"]["Update"];

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

  const { data: party, error } = await supabase
    .from("parties")
    .insert({
      owner_id: user.id,
      name,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000).toISOString(),
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

  const { error: memberError } = await supabase.from("party_members").insert({
    party_id: party.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    await supabase.from("parties").delete().eq("id", party.id);
    return { error: memberError.message };
  }

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
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");

  const patch: PartyUpdate = {
    name,
    location,
    theme,
    cuisine,
    service_style: serviceStyle,
    dress_code: dressCode,
    guest_contribution_notes: guestContributionNotes,
  };

  if (date && time) {
    const startsAt = new Date(`${date}T${time}:00`);
    patch.starts_at = startsAt.toISOString();
    patch.ends_at = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000).toISOString();
  }

  const { error } = await supabase.from("parties").update(patch).eq("id", partyId);
  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}`);
  return { error: null };
}

export async function deleteParty(partyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("parties").delete().eq("id", partyId);
  if (error) return { error: error.message };
  redirect("/app");
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

export async function rescheduleTask(taskId: string, partyId: string, startAtIso: string) {
  const supabase = await createClient();
  const startAt = new Date(startAtIso);
  if (Number.isNaN(startAt.getTime())) {
    return { error: "Invalid start time." };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("duration_minutes, title, locked")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) return { error: "Task not found." };
  if (task.locked) return { error: "Locked tasks cannot be rescheduled." };

  const duration =
    task.duration_minutes && task.duration_minutes > 0 ? task.duration_minutes : 30;
  const dueAt = new Date(startAt.getTime() + duration * 60_000).toISOString();

  const { error } = await supabase
    .from("tasks")
    .update({ start_at: startAt.toISOString(), due_at: dueAt })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath(`/app/parties/${partyId}/timeline`);
  return { error: null };
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
