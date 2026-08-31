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

  const [{ data: party }, { data: members }] = await Promise.all([
    supabase
      .from("parties")
      .select("id, name, starts_at, timezone, status, color_scheme, share_token")
      .eq("id", partyId)
      .maybeSingle(),
    supabase
      .from("party_members")
      .select("user_id, role")
      .eq("party_id", partyId),
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
        color_scheme: party.color_scheme,
      }}
      collaborators={collaborators}
      previewToken={party.share_token}
    >
      {children}
    </PartyShell>
  );
}
