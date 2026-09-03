import { PartyListItem } from "@/components/party/party-list-item";
import { formatPartyWhen } from "@/lib/calendar";
import type { Database } from "@/lib/database.types";
import { canManagePartyRole } from "@/lib/party/roles";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type Party = Database["public"]["Tables"]["parties"]["Row"];

const DAY_MS = 1000 * 60 * 60 * 24;

export default async function PartiesPage() {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();

  if (!userId) redirect("/auth/login");

  const { data: memberships } = await supabase
    .from("party_members")
    .select("role, party_id")
    .eq("user_id", userId);

  const roleByParty = new Map((memberships ?? []).map((row) => [row.party_id, row.role]));
  const partyIds = [...roleByParty.keys()];

  const { data: partyRows } =
    partyIds.length > 0
      ? await supabase.from("parties").select("*").in("id", partyIds)
      : { data: [] as Party[] };

  const [{ data: guests }, { data: recipes }] =
    partyIds.length > 0
      ? await Promise.all([
          supabase.from("guests").select("party_id, rsvp_status").in("party_id", partyIds),
          supabase.from("recipes").select("party_id").in("party_id", partyIds),
        ])
      : [{ data: [] }, { data: [] }];

  const now = Date.now();
  const parties = (partyRows ?? []).slice();
  const upcoming = parties
    .filter((party) => new Date(party.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = parties
    .filter((party) => new Date(party.starts_at).getTime() < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  function renderParty(party: Party, tense: "upcoming" | "past") {
    const when = formatPartyWhen(party.starts_at, party.timezone);
    const attending = (guests ?? []).filter(
      (guest) => guest.party_id === party.id && guest.rsvp_status === "attending",
    ).length;
    const dishes = (recipes ?? []).filter((recipe) => recipe.party_id === party.id).length;
    const days = Math.abs(Math.ceil((new Date(party.starts_at).getTime() - now) / DAY_MS));
    const countdown =
      tense === "upcoming" ? `${days} day${days === 1 ? "" : "s"} away` : `${days} day${days === 1 ? "" : "s"} ago`;
    const role = roleByParty.get(party.id) ?? null;

    return (
      <PartyListItem
        key={party.id}
        party={{
          id: party.id,
          name: party.name,
          location: party.location,
          hero_image: party.hero_image,
          cover_crop: party.cover_crop,
        }}
        whenLabel={`${when.date} · ${when.time}`}
        attending={attending}
        dishes={dishes}
        countdown={countdown}
        role={role}
        canDelete={canManagePartyRole(role)}
        tense={tense}
      />
    );
  }

  return (
    <div className="paper-noise px-4 py-7 md:px-8 md:py-10 xl:px-12 xl:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-6 border-b border-ink/20 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">Every table you have set</p>
            <h1 className="mt-3 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] text-tomato md:text-7xl">
              Parties
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/55">
              {parties.length === 0
                ? "Nothing on the calendar yet."
                : `${upcoming.length} upcoming · ${past.length} in the archive. Open one to see the full plan.`}
            </p>
          </div>
          <Link href="/app/parties/new" className="btn-primary self-start md:self-auto">
            Create party <Plus size={15} />
          </Link>
        </header>

        {parties.length === 0 ? (
          <div className="mt-8 border border-ink/15 bg-[#f8f4ec] p-8 md:p-12">
            <h2 className="font-editorial text-4xl font-semibold leading-[0.9]">Start with one dinner.</h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/55">
              Create a party to build the menu, invite the table, and plan the kitchen.
            </p>
            <Link href="/app/parties/new" className="btn-primary mt-8">
              Create party <Plus size={15} />
            </Link>
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
              <h2 className="font-editorial text-4xl font-semibold leading-none">Upcoming</h2>
              <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">
                {upcoming.length} planned
              </span>
            </div>
            <div>{upcoming.map((party) => renderParty(party, "upcoming"))}</div>
          </section>
        ) : null}

        {past.length > 0 ? (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
              <h2 className="font-editorial text-4xl font-semibold leading-none text-ink/70">Past</h2>
              <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">
                {past.length} hosted
              </span>
            </div>
            <div>{past.map((party) => renderParty(party, "past"))}</div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
