import { AddGuestForm, CopyInviteLink, InviteActions } from "@/components/party/guest-actions";
import { formatRsvpStatus, initialsFromName } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Check, Users } from "lucide-react";
import { notFound } from "next/navigation";

export default async function GuestsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase.from("parties").select("id, name").eq("id", partyId).maybeSingle();
  if (!party) notFound();

  const [{ data: guestRows }, { data: inviteRows }] = await Promise.all([
    supabase
      .from("guests")
      .select("id, name, email, rsvp_status, allergies, dietary_preference, plus_one_count")
      .eq("party_id", partyId)
      .order("created_at", { ascending: true }),
    supabase.from("invites").select("id, guest_id, token, revoked_at").eq("party_id", partyId),
  ]);

  const invitesByGuest = new Map<string, Array<{ id: string; token: string; revoked_at: string | null }>>();
  for (const invite of inviteRows ?? []) {
    const list = invitesByGuest.get(invite.guest_id) ?? [];
    list.push({ id: invite.id, token: invite.token, revoked_at: invite.revoked_at });
    invitesByGuest.set(invite.guest_id, list);
  }

  const guests = (guestRows ?? []).map((guest) => ({
    ...guest,
    invites: invitesByGuest.get(guest.id) ?? [],
  }));

  const attending = guests.filter((g) => g.rsvp_status === "attending").length;
  const maybe = guests.filter((g) => g.rsvp_status === "maybe").length;
  const pending = guests.filter((g) => g.rsvp_status === "no_response").length;
  const allergies = guests.filter((g) => g.allergies?.trim()).length;

  const firstActiveToken =
    guests.flatMap((guest) => guest.invites).find((invite) => !invite.revoked_at)?.token ?? null;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Guests and invitations</p>
          <h2 className="mt-2 font-editorial text-5xl font-semibold">Invite them into the menu.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">
            Guests see the dinner before they reply. New allergies or headcount changes feed back into recipes, shopping,
            cost, and timeline.
          </p>
        </div>
        <AddGuestForm partyId={partyId} />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <p className="eyebrow">Attending</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{attending}</p>
          <p className="mt-2 text-xs text-ink/45">confirmed guests</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Maybe</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{maybe}</p>
          <p className="mt-2 text-xs text-ink/45">including plus-ones</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Awaiting reply</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{pending}</p>
          <p className="mt-2 text-xs text-ink/45">no response yet</p>
        </article>
        <article className="rounded-[1.75rem] bg-tomato p-5 text-paper">
          <p className="eyebrow !text-paper/55">Allergy profiles</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{allergies}</p>
          <p className="mt-2 text-xs text-paper/65">need menu attention</p>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="overflow-hidden rounded-[1.75rem] border border-ink/10 bg-[#f8f2e8] shadow-card">
            <div className="hidden grid-cols-[1.1fr_.7fr_.7fr_.9fr_auto] gap-4 border-b border-ink/10 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ink/40 md:grid">
              <span>Guest</span>
              <span>Status</span>
              <span>Dietary</span>
              <span>Invite link</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-ink/8">
              {guests.length === 0 ? (
                <p className="p-6 text-sm text-ink/45">No guests yet. Add someone to generate an invite link.</p>
              ) : (
                guests.map((guest, i) => {
                  const status = formatRsvpStatus(guest.rsvp_status);
                  const invite = guest.invites.find((row) => !row.revoked_at) ?? guest.invites[0];
                  const dietary = guest.allergies?.trim() || guest.dietary_preference?.trim() || "None";
                  const hasAllergy = Boolean(guest.allergies?.trim());
                  return (
                    <div
                      key={guest.id}
                      className="grid gap-4 p-5 md:grid-cols-[1.1fr_.7fr_.7fr_.9fr_auto] md:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${i % 4 === 0 ? "bg-blush" : i % 4 === 1 ? "bg-gold" : i % 4 === 2 ? "bg-olive text-paper" : "bg-orange text-paper"}`}
                        >
                          {initialsFromName(guest.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{guest.name}</p>
                          <p className="truncate text-xs text-ink/43">{guest.email || "No email"}</p>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`chip ${status === "Attending" ? "border-olive/30 bg-olive/10 text-olive" : status === "Maybe" ? "border-gold/40 bg-gold/10" : status === "Not attending" ? "bg-ink/5 text-ink/40" : "border-tomato/20 bg-tomato/5 text-tomato"}`}
                        >
                          {status === "Attending" ? <Check size={12} /> : null}
                          {status}
                        </span>
                      </div>
                      <div>
                        {hasAllergy ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-tomato">
                            <AlertTriangle size={13} /> {dietary}
                          </span>
                        ) : (
                          <span className="text-xs text-ink/40">{dietary}</span>
                        )}
                        {guest.plus_one_count > 0 ? (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink/40">
                            +{guest.plus_one_count}
                          </p>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        {invite && !invite.revoked_at ? (
                          <div className="flex items-center gap-2">
                            <code className="truncate text-[10px] text-ink/55">/invite/{invite.token.slice(0, 8)}…</code>
                            <CopyInviteLink token={invite.token} />
                          </div>
                        ) : (
                          <span className="text-xs text-ink/40">{invite?.revoked_at ? "Revoked" : "No invite"}</span>
                        )}
                      </div>
                      <div className="md:justify-self-end">
                        {invite ? (
                          <InviteActions
                            inviteId={invite.id}
                            partyId={partyId}
                            revoked={Boolean(invite.revoked_at)}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <article className="card overflow-hidden">
            <div className="h-48">
              <img src="/photos/party-07.webp" alt="Outdoor dinner invitation image" className="h-full w-full object-cover" />
            </div>
            <div className="p-5">
              <p className="font-handwritten text-sm text-tomato">Invitation preview</p>
              <h3 className="mt-2 font-editorial text-3xl font-semibold">{party.name}</h3>
              <p className="mt-3 text-xs leading-relaxed text-ink/50">
                Menu, dress code, guest contributions, allergies, and RSVP in one custom page.
              </p>
              {firstActiveToken ? (
                <a href={`/invite/${firstActiveToken}`} target="_blank" className="btn-secondary mt-5 w-full">
                  Open preview
                </a>
              ) : (
                <p className="mt-5 text-xs text-ink/45">Add a guest to generate a preview link.</p>
              )}
            </div>
          </article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper">
            <Users size={21} className="text-orange" />
            <h3 className="mt-5 font-editorial text-3xl font-semibold">Collaborators are different from guests.</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              Managers and editors can change the party. Helpers can receive and complete assigned tasks.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
