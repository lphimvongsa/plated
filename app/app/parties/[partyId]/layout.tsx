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

  const { data: party } = await supabase.from("parties").select("*").eq("id", partyId).maybeSingle();
  if (!party) notFound();

  const { data: members } = await supabase
    .from("party_members")
    .select("user_id, role")
    .eq("party_id", partyId);

  const userIds = (members ?? []).map((member) => member.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, name").in("id", userIds)
      : { data: [] as { id: string; name: string | null }[] };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const collaborators = (members ?? []).map((member) =>
    initialsFromName(profileById.get(member.user_id)?.name),
  );

  const { data: invite } = await supabase
    .from("invites")
    .select("token")
    .eq("party_id", partyId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

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
