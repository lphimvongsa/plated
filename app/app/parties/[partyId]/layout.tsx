import { PartyShell } from "@/components/party-shell";
import { initialsFromName } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PartyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  const supabase = await createClient();

  const [{ data: party }, { data: members }, { data: invite }] = await Promise.all([
    supabase
      .from("parties")
      .select("id, name, starts_at, timezone, status")
      .eq("id", partyId)
      .maybeSingle(),
    supabase
      .from("party_members")
      .select("user_id, role")
      .eq("party_id", partyId),
    supabase
      .from("invites")
      .select("token")
      .eq("party_id", partyId)
      .is("revoked_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!party) notFound();

  const userIds = (members ?? []).map((member) => member.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, name").in("id", userIds)
      : { data: [] as { id: string; name: string | null }[] };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const collaborators = (members ?? []).map((member) =>
    initialsFromName(profileById.get(member.user_id)?.name),
  );

  return (
    <PartyShell
      party={{
        id: party.id,
        name: party.name,
        starts_at: party.starts_at,
        timezone: party.timezone,
        status: party.status,
      }}
      collaborators={collaborators}
      previewToken={invite?.token ?? null}
    >
      {children}
    </PartyShell>
  );
}
