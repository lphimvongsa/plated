import { formatPartyWhen } from "@/lib/calendar";
import { formatPartyRole } from "@/lib/party/roles";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { Bell, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AcceptCollaboratorButton } from "@/components/collaborate/accept-button";

export default async function InboxPage() {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  const email = profile?.email?.trim().toLowerCase() || "";

  const { data: inviteRows } = email
    ? await supabase
        .from("party_collaborator_invites")
        .select("id, token, role, created_at, party_id")
        .ilike("email", email)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; token: string; role: string; created_at: string; party_id: string }[] };

  const partyIds = [...new Set((inviteRows ?? []).map((row) => row.party_id))];
  const { data: partyRows } =
    partyIds.length > 0
      ? await supabase.from("parties").select("id, name, starts_at, timezone, location").in("id", partyIds)
      : { data: [] as { id: string; name: string; starts_at: string; timezone: string; location: string | null }[] };
  const partyById = new Map((partyRows ?? []).map((party) => [party.id, party]));

  const invites = (inviteRows ?? []).map((row) => {
    const party = partyById.get(row.party_id);
    return {
      id: row.id,
      token: row.token,
      role: row.role,
      partyName: party?.name ?? "A party",
      startsAt: party?.starts_at ?? null,
      timezone: party?.timezone ?? "America/New_York",
      location: party?.location ?? null,
    };
  });

  return (
    <div className="p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Inbox</p>
        <h1 className="mt-2 font-editorial text-5xl font-semibold md:text-6xl">The party, in motion.</h1>
        <p className="mt-4 text-sm text-ink/55">
          Collaborator invites land here. Open one to join the kitchen crew.
        </p>
        <div className="mt-10 overflow-hidden rounded-[1.75rem] border border-ink/10 bg-[#f8f2e8] shadow-card">
          <div className="flex items-center justify-between border-b border-ink/10 p-5">
            <div className="flex items-center gap-2">
              <Bell size={18} />
              <span className="text-sm font-bold">Collaborator invites</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/42">
              {invites.length} pending
            </span>
          </div>
          {invites.length === 0 ? (
            <p className="p-6 text-sm text-ink/50">No pending collaborator invites right now.</p>
          ) : (
            <div className="divide-y divide-ink/8">
              {invites.map((invite) => {
                const when = invite.startsAt ? formatPartyWhen(invite.startsAt, invite.timezone) : null;
                return (
                  <article key={invite.id} className="flex flex-col gap-4 bg-orange/4 p-5 md:flex-row md:items-center md:p-6">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tomato text-paper">
                      <UserPlus size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold">You were invited to {invite.partyName}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-ink/52">
                        Role: {formatPartyRole(invite.role)}
                        {when ? ` · ${when.date} at ${when.time}` : ""}
                        {invite.location ? ` · ${invite.location}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/collaborate/${invite.token}`} className="btn-secondary !px-3 !py-2">
                        View invite
                      </Link>
                      <AcceptCollaboratorButton token={invite.token} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
