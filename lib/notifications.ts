import type { SupabaseClient } from "@supabase/supabase-js";

type NotificationType = "rsvp" | "collaborator_invite" | "collaborator_accept";

export async function notifyUsers(
  supabase: SupabaseClient<any>,
  users: string[],
  type: NotificationType,
  title: string,
  body: string,
  href: string,
  partyId?: string | null,
) {
  const unique = [...new Set(users.filter(Boolean))];
  if (!unique.length) return;
  const rows = unique.map((user_id) => ({
    user_id,
    party_id: partyId ?? null,
    type,
    title,
    body,
    href,
  }));
  await (supabase as any).from("notifications").insert(rows);
}
