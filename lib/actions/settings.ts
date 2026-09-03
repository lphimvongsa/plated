"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PROFILE_BUCKET = "profile-media";

function asBool(data: FormData, key: string, fallback = false) {
  const value = data.get(key);
  if (value == null) return fallback;
  return value === "true" || value === "on" || value === "1";
}

export async function updateProfileSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const cookingSkill = String(formData.get("cooking_skill_level") ?? "Intermediate");
  const preferredMeasurement = String(formData.get("preferred_measurement") ?? "US");
  let avatarUrl: string | null | undefined;

  const photo = formData.get("avatar");
  if (photo instanceof Blob && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "Choose an image file." };
    if (photo.size > 8 * 1024 * 1024) return { error: "Profile photos must be under 8 MB." };
    const ext = photo.type.includes("png") ? "png" : photo.type.includes("webp") ? "webp" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const bytes = Buffer.from(new Uint8Array(await photo.arrayBuffer()));
    const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, bytes, { contentType: photo.type, upsert: false });
    if (error) return { error: error.message };
    avatarUrl = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  if (email && email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { error: error.message };
  }

  const { error } = await supabase.from("profiles").update({
    name: name || null,
    email: email || user.email || null,
    cooking_skill_level: cookingSkill,
    preferred_measurement: preferredMeasurement === "Metric" ? "Metric" : "US",
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app", "layout");
  revalidatePath("/app/settings");
  return { error: null, avatarUrl: avatarUrl ?? null, emailChangePending: email !== (user.email ?? "") };
}

export async function updateMeasurementSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const preferredMeasurement = String(formData.get("preferred_measurement") ?? "US") === "Metric" ? "Metric" : "US";
  const preferredDimension = String(formData.get("preferred_dimension") ?? "volume");
  const { error } = await supabase.from("profiles").update({
    preferred_measurement: preferredMeasurement,
    preferred_dimension: preferredDimension,
  }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app/settings");
  return { error: null };
}

export async function replacePantryItems(items: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const clean = [...new Set(items.map((v) => v.trim()).filter(Boolean))].slice(0, 100);
  const { error: deleteError } = await supabase.from("user_pantry_items").delete().eq("user_id", user.id);
  if (deleteError) return { error: deleteError.message };
  if (clean.length) {
    const { error } = await supabase.from("user_pantry_items").insert(clean.map((name) => ({ user_id: user.id, name })));
    if (error) return { error: error.message };
  }
  revalidatePath("/app/settings");
  return { error: null };
}

export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("profiles").update({
    notification_master: asBool(formData, "notification_master"),
    notify_rsvps: asBool(formData, "notify_rsvps"),
    notify_collaborator_invites: asBool(formData, "notify_collaborator_invites"),
    notify_collaborator_accepts: asBool(formData, "notify_collaborator_accepts"),
  }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app/settings");
  return { error: null };
}


export async function setNotificationMasterEnabled(enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("profiles").update({ notification_master: enabled }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/app/settings");
  return { error: null };
}

export async function savePushSubscription(input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
  if (!input.endpoint.trim() || !input.p256dh.trim() || !input.auth.trim()) return { error: "The browser returned an incomplete push subscription." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.userAgent ?? null,
  }, { onConflict: "endpoint" });
  return { error: error?.message ?? null };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  return { error: error?.message ?? null };
}

export async function updatePrivacySettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const retain = asBool(formData, "retain_receipt_images");
  const discoverable = asBool(formData, "profile_discoverable");
  const { error } = await supabase.from("profiles").update({ retain_receipt_images: retain, profile_discoverable: discoverable }).eq("id", user.id);
  if (error) return { error: error.message };
  if (!retain) {
    const { data: receiptRows } = await supabase.from("receipts").select("id,image_path").eq("uploaded_by", user.id).not("image_path", "is", null);
    const paths = (receiptRows ?? []).map((row) => row.image_path).filter((path): path is string => Boolean(path));
    if (paths.length) await supabase.storage.from("party-media").remove(paths);
    await supabase.from("receipts").update({ image_path: null }).eq("uploaded_by", user.id);
  }
  revalidatePath("/app/settings");
  return { error: null };
}

export async function markNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/app", "layout");
  revalidatePath("/app/inbox");
}
