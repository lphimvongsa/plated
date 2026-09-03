import { GuestActions } from "@/components/party/guest-actions";
import { CopyShareLinkButton, ShareInviteCard } from "@/components/party/share-invite-link";
import { formatAllergyList, formatRsvpStatus, hasAllergyList, initialsFromName } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Check, Users, X } from "lucide-react";
import { notFound } from "next/navigation";

const GUEST_COLS =
  "min-w-[42rem] grid-cols-[minmax(0,1.8fr)_9.5rem_minmax(0,1fr)_3rem_2.5rem] items-center gap-x-3 px-5";

export default async function GuestsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const [{ data: party }, { data: guestRows }] = await Promise.all([
    supabase.from("parties").select("id, name, share_token").eq("id", partyId).maybeSingle(),
    supabase
      .from("guests")
      .select("id, name, rsvp_status, allergies, plus_one_count, source")
      .eq("party_id", partyId)
      .order("created_at", { ascending: true }),
  ]);
  if (!party) notFound();

  const guests = guestRows ?? [];
  const attending = guests.filter((guest) => guest.rsvp_status === "attending").length;
  const maybe = guests.filter((guest) => guest.rsvp_status === "maybe").length;
  const pending = guests.filter((guest) => guest.rsvp_status === "no_response").length;
  const allergies = guests.filter((guest) => hasAllergyList(guest.allergies)).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-5xl font-semibold">Guests</h2>
          <p className="mt-2 text-sm text-ink/45">Share one party link in the group chat. Guests add themselves when they RSVP.</p>
        </div>
        <CopyShareLinkButton token={party.share_token} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5"><p className="eyebrow">Attending</p><p className="mt-3 font-editorial text-4xl font-semibold">{attending}</p></article>
        <article className="card p-5"><p className="eyebrow">Maybe</p><p className="mt-3 font-editorial text-4xl font-semibold">{maybe}</p></article>
        <article className="card p-5"><p className="eyebrow">Awaiting reply</p><p className="mt-3 font-editorial text-4xl font-semibold">{pending}</p></article>
        <article className="rounded-[1.75rem] bg-tomato p-5 text-paper"><p className="eyebrow !text-paper/55">Allergy profiles</p><p className="mt-3 font-editorial text-4xl font-semibold">{allergies}</p></article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="space-y-3 md:hidden">
            {guests.length === 0 ? <p className="card p-5 text-sm text-ink/45">No RSVPs yet. Copy the party link and drop it into your group chat.</p> : guests.map((guest, index) => {
              const status = formatRsvpStatus(guest.rsvp_status);
              const allergyLabel = formatAllergyList(guest.allergies) || "None";
              return (
                <article key={guest.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-bold ${index % 4 === 0 ? "bg-blush" : index % 4 === 1 ? "bg-gold" : index % 4 === 2 ? "bg-olive text-paper" : "bg-orange text-paper"}`}>{initialsFromName(guest.name)}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{guest.name}</p><p className="mt-0.5 text-xs text-ink/43">{guest.source === "share" ? "Joined from party link" : "Guest"}</p></div>
                    <GuestActions guestId={guest.id} guestName={guest.name} partyId={partyId} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[2px] border border-ink/10 bg-paper px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-widest text-ink/35">Status</span><span className="mt-1 block font-semibold">{status}</span></div>
                    <div className="rounded-[2px] border border-ink/10 bg-paper px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-widest text-ink/35">Plus one</span><span className="mt-1 block font-semibold">{guest.plus_one_count > 0 ? "Yes" : "No"}</span></div>
                    <div className="col-span-2 rounded-[2px] border border-ink/10 bg-paper px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-widest text-ink/35">Allergies</span><span className={`mt-1 flex items-center gap-1 font-semibold ${hasAllergyList(guest.allergies) ? "text-tomato" : "text-ink/45"}`}>{hasAllergyList(guest.allergies) ? <AlertTriangle size={12}/> : null}{allergyLabel}</span></div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-[1.75rem] border border-ink/10 bg-paper-2 shadow-card md:block">
            <div className={`grid ${GUEST_COLS} border-b border-ink/10 py-3 text-[10px] font-bold uppercase tracking-widest text-ink/40`}>
              <span>Guest</span><span>Status</span><span>Allergies</span><span className="text-center">Plus</span><span className="sr-only">Actions</span>
            </div>
            <div className="divide-y divide-ink/8">
              {guests.length === 0 ? <p className="p-6 text-sm text-ink/45">No RSVPs yet. Copy the party link and drop it into your group chat.</p> : guests.map((guest, index) => {
                const status = formatRsvpStatus(guest.rsvp_status);
                const allergyLabel = formatAllergyList(guest.allergies) || "None";
                const hasAllergy = hasAllergyList(guest.allergies);
                const hasPlusOne = guest.plus_one_count > 0;
                return (
                  <div key={guest.id} className={`grid ${GUEST_COLS} py-3.5`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold ${index % 4 === 0 ? "bg-blush" : index % 4 === 1 ? "bg-gold" : index % 4 === 2 ? "bg-olive text-paper" : "bg-orange text-paper"}`}>{initialsFromName(guest.name)}</div>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{guest.name}</p><p className="truncate text-xs text-ink/43">{guest.source === "share" ? "Joined from party link" : "Guest"}</p></div>
                    </div>
                    <div className="min-w-0"><span className={`chip h-7 w-full max-w-full justify-center overflow-hidden ${status === "Attending" ? "border-olive/30 bg-olive/10 text-olive" : status === "Maybe" ? "border-gold/40 bg-gold/10" : status === "Not attending" ? "bg-ink/5 text-ink/40" : "border-tomato/20 bg-tomato/5 text-tomato"}`} title={status}><span className="min-w-0 truncate">{status}</span></span></div>
                    <div className="min-w-0">{hasAllergy ? <span className="flex min-w-0 items-center gap-1 text-xs font-bold text-tomato" title={allergyLabel}><AlertTriangle size={13} className="shrink-0"/><span className="min-w-0 truncate">{allergyLabel}</span></span> : <span className="block truncate text-xs text-ink/40">None</span>}</div>
                    <div className="flex justify-center" aria-label={hasPlusOne ? "Plus one" : "No plus one"}>{hasPlusOne ? <Check size={16} className="text-olive" strokeWidth={2.25}/> : <X size={16} className="text-ink/30" strokeWidth={2.25}/>}</div>
                    <div className="flex justify-end"><GuestActions guestId={guest.id} guestName={guest.name} partyId={partyId}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <ShareInviteCard partyId={partyId} token={party.share_token} />
          <article className="card overflow-hidden">
            <div className="h-48"><img src="/photos/party-07.webp" alt="Outdoor dinner invitation image" className="h-full w-full object-cover"/></div>
            <div className="p-5"><p className="font-handwritten text-sm text-tomato">Invitation preview</p><h3 className="mt-2 font-editorial text-3xl font-semibold">{party.name}</h3><p className="mt-3 text-xs leading-relaxed text-ink/50">Everyone opens the same invitation link, RSVPs, and can add the dinner to Google Calendar.</p><a href={`/invite/${party.share_token}`} target="_blank" className="btn-secondary mt-5 w-full">Open preview</a></div>
          </article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper"><Users size={21} className="text-orange"/><h3 className="mt-5 font-editorial text-3xl font-semibold">Collaborators are different from guests.</h3><p className="mt-3 text-sm leading-relaxed text-paper/60">Managers and editors can change the party. Helpers can receive and complete assigned tasks.</p></article>
        </aside>
      </section>
    </div>
  );
}
