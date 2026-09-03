"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database, Json } from "@/lib/database.types";
import { durationMinutesBetween, parsePartyDurationMinutes, partyEndsAt } from "@/lib/party/duration";
import { normalizeTimezone, zonedDateTimeToUtc } from "@/lib/timezone";
import { schedulePartyDerivedRefresh } from "@/lib/party/refresh-derived";
import { normalizePhone } from "@/lib/outbound/phone";
import { friendlyStorageUploadError, withStorageUploadRetry } from "@/lib/media/storage-upload";
import { MAX_INVITATION_PHOTOS } from "@/lib/invitation-photo-slots";
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
  const dressCode = String(formData.get("dress_code") ?? "").trim();
  const guestContributionNotes = String(formData.get("guest_contribution_notes") ?? "").trim();
  const guestCount = Number(formData.get("guest_count") ?? 8);
  const durationMinutes = parsePartyDurationMinutes(formData.get("duration_minutes"));
  const startsAt = new Date(`${date}T${time}:00`);
  const prepLeadDays = Number(formData.get("prep_lead_days") ?? 14);
  const colorScheme = String(formData.get("color_scheme") ?? "tomato-cream");
  const coverPosition = String(formData.get("cover_position") ?? "50% 50%");
  let coverCrop: Record<string, number> | null = null;
  try { coverCrop = JSON.parse(String(formData.get("cover_crop") ?? "null")); } catch { coverCrop = null; }
  const heroChoice = String(formData.get("hero_image") ?? "/photos/party-01.webp");

  const { data: party, error } = await supabase
    .from("parties")
    .insert({
      owner_id: user.id,
      name,
      starts_at: startsAt.toISOString(),
      ends_at: partyEndsAt(startsAt, durationMinutes).toISOString(),
      prep_starts_at: prepStartFromLead(startsAt, prepLeadDays).toISOString(),
      location,
      theme,
      cuisine,
      service_style: serviceStyle,
      dress_code: dressCode || null,
      guest_contribution_notes: guestContributionNotes || null,
      planning_guest_count: Number.isFinite(guestCount) ? guestCount : 8,
      status: "scheduled",
      hero_image: heroChoice || "/photos/party-01.webp",
      color_scheme: colorScheme,
      cover_position: coverPosition,
      cover_crop: coverCrop,
      invitation_photo_urls: [heroChoice || "/photos/party-01.webp"],
      invitation_draft: true,
    })
    .select("id")
    .single();

  if (error || !party) {
    return { error: error?.message ?? "Could not create party." };
  }

  const coverFile = formData.get("cover_photo");
  if (coverFile instanceof Blob && coverFile.size > 0) {
    const uploaded = await uploadPartyImage(supabase, party.id, coverFile);
    if (!uploaded.error && uploaded.url) {
      await supabase.from("parties").update({
        hero_image: uploaded.url,
        invitation_photo_urls: [uploaded.url],
      }).eq("id", party.id);
    }
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
  const colorScheme = String(formData.get("color_scheme") ?? "tomato-cream");
  const coverPosition = String(formData.get("cover_position") ?? "50% 50%");
  let coverCrop: Record<string, number> | null = null;
  try { coverCrop = JSON.parse(String(formData.get("cover_crop") ?? "null")); } catch { coverCrop = null; }
  const heroImage = String(formData.get("hero_image") ?? "").trim();
  const planningGuestCountRaw = formData.get("planning_guest_count");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const timezone = normalizeTimezone(String(formData.get("timezone") ?? ""));
  const durationMinutes = parsePartyDurationMinutes(formData.get("duration_minutes"));
  const prepDate = String(formData.get("prep_date") ?? "");
  const invitationPhotoPositions = formData.getAll("invitation_photo_positions").map(String).filter(Boolean);
  let invitationPhotoCrops: Json[] | null = null;
  try {
    const parsed = JSON.parse(String(formData.get("invitation_photo_crops") ?? "null"));
    if (Array.isArray(parsed)) invitationPhotoCrops = parsed as Json[];
  } catch { invitationPhotoCrops = null; }

  const patch: PartyUpdate = {
    name,
    location,
    theme,
    cuisine,
    service_style: serviceStyle,
    dress_code: dressCode,
    guest_contribution_notes: guestContributionNotes,
    color_scheme: colorScheme,
    cover_position: coverPosition,
    cover_crop: coverCrop,
    timezone,
    ...(heroImage ? { hero_image: heroImage } : {}),
    ...(invitationPhotoPositions.length ? { invitation_photo_positions: invitationPhotoPositions } : {}),
    ...(invitationPhotoCrops ? { invitation_photo_crops: invitationPhotoCrops } : {}),
  };

  if (planningGuestCountRaw != null && planningGuestCountRaw !== "") {
    const planningGuestCount = Number(planningGuestCountRaw);
    if (Number.isFinite(planningGuestCount) && planningGuestCount > 0) {
      patch.planning_guest_count = planningGuestCount;
    }
  }

  if (date && time) {
    const startsAt = zonedDateTimeToUtc(date, time, timezone);
    if (startsAt) {
      patch.starts_at = startsAt.toISOString();
      patch.ends_at = partyEndsAt(startsAt, durationMinutes).toISOString();
    }
  }

  if (prepDate) {
    const prepAt = zonedDateTimeToUtc(prepDate, "09:00", timezone);
    if (prepAt) patch.prep_starts_at = prepAt.toISOString();
  }

  const coverFile = formData.get("cover_photo");
  if (coverFile instanceof Blob && coverFile.size > 0) {
    const uploaded = await uploadPartyImage(supabase, partyId, coverFile);
    if (uploaded.error) return { error: uploaded.error };
    if (uploaded.url) patch.hero_image = uploaded.url;
  }

  const { error } = await supabase.from("parties").update(patch).eq("id", partyId);
  if (error) return { error: error.message };

  if (patch.planning_guest_count != null) {
    schedulePartyDerivedRefresh(partyId);
  }

  revalidatePath(`/app/parties/${partyId}`, "layout");
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

export async function addGuest(
  partyId: string,
  input: { name: string; email?: string; phone?: string } | FormData,
) {
  const supabase = await createClient();
  const name = input instanceof FormData ? String(input.get("name") ?? "").trim() : input.name.trim();
  const email = input instanceof FormData ? String(input.get("email") ?? "").trim() : (input.email ?? "").trim();
  const phone = input instanceof FormData ? String(input.get("phone") ?? "").trim() : (input.phone ?? "").trim();

  if (!name) return { error: "Name is required.", guestId: null, inviteId: null, token: null };

  const { data: guest, error } = await supabase
    .from("guests")
    .insert({
      party_id: partyId,
      name,
      email: email || null,
      phone: phone ? normalizePhone(phone) || phone : null,
      rsvp_status: "no_response",
    })
    .select("id")
    .single();

  if (error || !guest) return { error: error?.message ?? "Could not add guest.", guestId: null, inviteId: null, token: null };

  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .insert({
      party_id: partyId,
      guest_id: guest.id,
    })
    .select("id, token")
    .single();

  if (inviteError || !invite) {
    return { error: inviteError?.message ?? "Could not create an invite.", guestId: guest.id, inviteId: null, token: null };
  }

  revalidatePath(`/app/parties/${partyId}/guests`);
  return { error: null, guestId: guest.id, inviteId: invite.id, token: invite.token };
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

export async function rotateShareToken(partyId: string) {
  const supabase = await createClient();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { data, error } = await supabase
    .from("parties")
    .update({ share_token: token })
    .eq("id", partyId)
    .select("share_token")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not reset the party link.", token: null };
  revalidatePath(`/app/parties/${partyId}`, "layout");
  revalidatePath(`/app/parties/${partyId}/guests`);
  revalidatePath(`/app/parties/${partyId}/invitation`);
  return { error: null, token: data.share_token };
}

export async function deleteGuest(guestId: string, partyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("guests").delete().eq("id", guestId).eq("party_id", partyId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}/guests`);
  revalidatePath(`/app/parties/${partyId}`);
  return { error: null };
}

const PARTY_MEDIA_BUCKET = "party-media";

async function uploadPartyImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partyId: string,
  file: Blob,
) {
  try {
    const type = file.type || "image/jpeg";
    const name = file instanceof File ? file.name : "cover.jpg";
    if (!file.size || !type.startsWith("image/")) return { url: null, error: "Choose an image file." };
    if (file.size > 12 * 1024 * 1024) return { url: null, error: "Cover photos must be under 12 MB." };
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "cover.jpg";
    const bytes = Buffer.from(new Uint8Array(await file.arrayBuffer()));
    let uploadedPath = "";
    const result = await withStorageUploadRetry(async () => {
      uploadedPath = `${partyId}/${crypto.randomUUID()}-${safeName}`;
      return supabase.storage.from(PARTY_MEDIA_BUCKET).upload(uploadedPath, bytes, {
        contentType: type,
        upsert: false,
      });
    });
    if (result.error) return { url: null, error: friendlyStorageUploadError(result.error.message) };
    return {
      url: supabase.storage.from(PARTY_MEDIA_BUCKET).getPublicUrl(uploadedPath).data.publicUrl,
      error: null,
    };
  } catch (error) {
    return {
      url: null,
      error: friendlyStorageUploadError(error instanceof Error ? error.message : undefined),
    };
  }
}

export async function updateInvitationDraft(partyId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: party } = await supabase
    .from("parties")
    .select("starts_at, ends_at")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) return { error: "Party not found." };

  const photos = formData.getAll("invitation_photo_urls").map(String).filter(Boolean).slice(0, MAX_INVITATION_PHOTOS);
  const photoPositions = formData.getAll("invitation_photo_positions").map(String).slice(0, photos.length);
  let photoCrops: Json[] = [];
  let menuOverrides: Record<string, { title?: string; description?: string }> = {};
  try {
    const parsed = JSON.parse(String(formData.get("invitation_photo_crops") ?? "[]"));
    if (Array.isArray(parsed)) photoCrops = parsed.slice(0, photos.length) as Json[];
  } catch { photoCrops = []; }
  try {
    const parsed = JSON.parse(String(formData.get("invitation_menu_overrides") ?? "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) menuOverrides = parsed;
  } catch { menuOverrides = {}; }
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const timezone = normalizeTimezone(String(formData.get("timezone") ?? ""));
  const patch: PartyUpdate = {
    location: String(formData.get("location") ?? "").trim(),
    color_scheme: String(formData.get("color_scheme") ?? "tomato-cream"),
    timezone,
    invitation_headline: String(formData.get("invitation_headline") ?? "").trim() || null,
    invitation_message: String(formData.get("invitation_message") ?? "").trim() || null,
    invitation_signoff: String(formData.get("invitation_signoff") ?? "").trim() || null,
    invitation_rsvp_label: String(formData.get("invitation_rsvp_label") ?? "").trim() || null,
    dress_code: String(formData.get("dress_code") ?? "").trim() || null,
    guest_contribution_notes: String(formData.get("guest_contribution_notes") ?? "").trim() || null,
    invitation_photo_urls: photos,
    invitation_photo_positions: photoPositions,
    invitation_photo_crops: photoCrops,
    invitation_menu_overrides: menuOverrides,
    invitation_draft: true,
  };
  if (date && time) {
    const startsAt = zonedDateTimeToUtc(date, time, timezone);
    if (startsAt) {
      const durationMinutes = durationMinutesBetween(party.starts_at, party.ends_at);
      patch.starts_at = startsAt.toISOString();
      patch.ends_at = partyEndsAt(startsAt, durationMinutes).toISOString();
    }
  }

  const { error } = await supabase.from("parties").update(patch).eq("id", partyId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}`, "layout");
  revalidatePath(`/app/parties/${partyId}`);
  revalidatePath(`/app/parties/${partyId}/invitation`);
  return { error: null };
}

export async function uploadPartyCover(partyId: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("cover_photo");
  if (!(file instanceof Blob) || file.size === 0) return { error: "Choose a photo." };
  const upload = await uploadPartyImage(supabase, partyId, file);
  if (upload.error || !upload.url) return { error: upload.error ?? "Could not upload photo." };
  const { error } = await supabase.from("parties").update({ hero_image: upload.url }).eq("id", partyId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}`);
  revalidatePath(`/app/parties/${partyId}/settings`);
  revalidatePath(`/app/parties/${partyId}/invitation`);
  return { error: null, url: upload.url };
}


export async function uploadInvitationPhoto(partyId: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("photo");
  if (!(file instanceof Blob) || file.size === 0) return { error: "Choose a photo." };
  const upload = await uploadPartyImage(supabase, partyId, file);
  if (upload.error || !upload.url) return { error: upload.error ?? "Could not upload photo." };
  return { error: null, url: upload.url };
}


export async function duplicateParty(partyId: string) {
  const supabase = await createClient();
  const { data: source, error: sourceError } = await supabase.from("parties").select("*").eq("id", partyId).maybeSingle();
  if (sourceError || !source) return { error: sourceError?.message ?? "Party not found." };
  const { id: _id, created_at: _created, updated_at: _updated, share_token: _share, ...copy } = source as any;
  const { data: created, error } = await supabase.from("parties").insert({ ...copy, name: `${source.name} copy`, status: "planning", share_token: null }).select("id").single();
  if (error || !created) return { error: error?.message ?? "Could not duplicate party." };
  revalidatePath("/app/parties");
  redirect(`/app/parties/${created.id}/settings`);
}

export async function archiveParty(partyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("parties").update({ status: "cancelled" }).eq("id", partyId);
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}`, "layout");
  revalidatePath("/app/parties");
  return { error: null };
}


export async function addCustomGroceryItem(partyId: string, name: string) {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Enter an item name." };
  const { data: last } = await supabase.from("grocery_items").select("sort_order").eq("party_id", partyId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("grocery_items").insert({ party_id: partyId, ingredient_name: trimmed, quantity: 1, category: "Other", sort_order: (last?.sort_order ?? -1) + 1 });
  if (error) return { error: error.message };
  revalidatePath(`/app/parties/${partyId}/shopping`);
  return { error: null };
}
