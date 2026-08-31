import { AddGuestForm, GuestActions } from "@/components/party/guest-actions";
import { CopyShareLinkButton, ShareInviteCard } from "@/components/party/share-invite-link";
import { SendAllInvitesButton, SendInviteButton, type SendableGuest } from "@/components/party/send-invite";
import { emailOutboundConfigured } from "@/lib/outbound/email";
import { smsOutboundConfigured } from "@/lib/outbound/sms";
import { formatAllergyList, formatRsvpStatus, hasAllergyList, initialsFromName } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Check, Users, X } from "lucide-react";
import { notFound } from "next/navigation";

const GUEST_COLS =
  "min-w-[52rem] grid-cols-[minmax(0,1.7fr)_9.5rem_minmax(0,1fr)_3rem_5.75rem_2.5rem] items-center gap-x-3 px-5";

export default async function GuestsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase.from("parties").select("id, name, share_token").eq("id", partyId).maybeSingle();
  if (!party) notFound();

  const guestsQuery = supabase
    .from("guests")
      .select("id, name, email, phone, rsvp_status, allergies, plus_one_count, source")
    .eq("party_id", partyId)
    .order("created_at", { ascending: true });
  const invitesWithSend = await supabase
    .from("invites")
    .select("id, guest_id, token, revoked_at, last_sent_at, last_sent_channel")
    .eq("party_id", partyId);
  const inviteRows = invitesWithSend.error
    ? (
        await supabase.from("invites").select("id, guest_id, token, revoked_at").eq("party_id", partyId)
      ).data?.map((invite) => ({ ...invite, last_sent_at: null, last_sent_channel: null }))
    : invitesWithSend.data;
  const { data: guestRows } = await guestsQuery;

  const invitesByGuest = new Map<
    string,
    Array<{
      id: string;
      token: string;
      revoked_at: string | null;
      last_sent_at: string | null;
      last_sent_channel: string | null;
    }>
  >();
  for (const invite of inviteRows ?? []) {
    const list = invitesByGuest.get(invite.guest_id) ?? [];
    list.push(invite);
    invitesByGuest.set(invite.guest_id, list);
  }

  const guests = (guestRows ?? []).map((guest) => ({
    ...guest,
    invites: invitesByGuest.get(guest.id) ?? [],
  }));

  const attending = guests.filter((g) => g.rsvp_status === "attending").length;
  const maybe = guests.filter((g) => g.rsvp_status === "maybe").length;
  const pending = guests.filter((g) => g.rsvp_status === "no_response").length;
  const allergies = guests.filter((g) => hasAllergyList(g.allergies)).length;
  const outbound = { email: emailOutboundConfigured(), sms: smsOutboundConfigured() };

  const sendableGuests: SendableGuest[] = guests.map((guest) => {
    const invite = guest.invites.find((row) => !row.revoked_at) ?? guest.invites[0] ?? null;
    return {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      invite,
      lastSentAt: invite?.last_sent_at ?? null,
      lastSentChannel: invite?.last_sent_channel ?? null,
    };
  });

  const firstActiveToken = party.share_token;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-5xl font-semibold">Guests</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyShareLinkButton token={party.share_token} />
          <SendAllInvitesButton partyId={partyId} guests={sendableGuests} outbound={outbound} shareToken={party.share_token} />
          <AddGuestForm partyId={partyId} outbound={outbound} />
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <p className="eyebrow">Attending</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{attending}</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Maybe</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{maybe}</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Awaiting reply</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{pending}</p>
        </article>
        <article className="rounded-[1.75rem] bg-tomato p-5 text-paper">
          <p className="eyebrow !text-paper/55">Allergy profiles</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">{allergies}</p>
        </article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="space-y-3 md:hidden">
            {guests.length === 0 ? <p className="card p-5 text-sm text-ink/45">No named guests yet. Copy the party link for a group chat, or add someone to email or text them privately.</p> : guests.map((guest, i) => {
              const status = formatRsvpStatus(guest.rsvp_status);
              const allergyLabel = formatAllergyList(guest.allergies) || "None";
              const sendable = sendableGuests[i];
              return (
                <article key={guest.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[10px] font-bold ${i % 4 === 0 ? "bg-blush" : i % 4 === 1 ? "bg-gold" : i % 4 === 2 ? "bg-olive text-paper" : "bg-orange text-paper"}`}>{initialsFromName(guest.name)}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{guest.name}</p><p className="mt-0.5 break-words text-xs text-ink/43">{[guest.email, guest.phone].filter(Boolean).join(" · ") || (guest.source === "share" ? "Joined from party link" : "No email or phone")}</p></div>
                    <GuestActions guestId={guest.id} guestName={guest.name} partyId={partyId} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[2px] border border-ink/10 bg-paper px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-widest text-ink/35">Status</span><span className="mt-1 block font-semibold">{status}</span></div>
                    <div className="rounded-[2px] border border-ink/10 bg-paper px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-widest text-ink/35">Plus one</span><span className="mt-1 block font-semibold">{guest.plus_one_count > 0 ? "Yes" : "No"}</span></div>
                    <div className="col-span-2 rounded-[2px] border border-ink/10 bg-paper px-3 py-2"><span className="block text-[9px] font-bold uppercase tracking-widest text-ink/35">Allergies</span><span className={`mt-1 flex items-center gap-1 font-semibold ${hasAllergyList(guest.allergies) ? "text-tomato" : "text-ink/45"}`}>{hasAllergyList(guest.allergies) ? <AlertTriangle size={12}/> : null}{allergyLabel}</span></div>
                  </div>
                  {sendable ? <div className="mt-3"><SendInviteButton partyId={partyId} guest={sendable} outbound={outbound} /></div> : null}
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-[1.75rem] border border-ink/10 bg-paper-2 shadow-card md:block">
            <div className={`grid ${GUEST_COLS} border-b border-ink/10 py-3 text-[10px] font-bold uppercase tracking-widest text-ink/40`}>
              <span>Guest</span>
              <span>Status</span>
              <span>Allergies</span>
              <span className="text-center">Plus</span>
              <span className="text-right">Send</span>
              <span className="sr-only">Actions</span>
            </div>
            <div className="divide-y divide-ink/8">
              {guests.length === 0 ? (
                <p className="p-6 text-sm text-ink/45">No named guests yet. Copy the party link for a group chat, or add someone to email or text them privately.</p>
              ) : (
                guests.map((guest, i) => {
                  const status = formatRsvpStatus(guest.rsvp_status);
                  const allergyLabel = formatAllergyList(guest.allergies) || "None";
                  const hasAllergy = hasAllergyList(guest.allergies);
                  const hasPlusOne = guest.plus_one_count > 0;
                  const sendable = sendableGuests[i];
                  return (
                    <div
                      key={guest.id}
                      className={`grid ${GUEST_COLS} py-3.5`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold ${i % 4 === 0 ? "bg-blush" : i % 4 === 1 ? "bg-gold" : i % 4 === 2 ? "bg-olive text-paper" : "bg-orange text-paper"}`}
                        >
                          {initialsFromName(guest.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{guest.name}</p>
                          <p className="truncate text-xs text-ink/43">
                            {[guest.email, guest.phone].filter(Boolean).join(" · ") || (guest.source === "share" ? "Joined from party link" : "No email or phone")}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`chip h-7 w-full max-w-full justify-center overflow-hidden ${status === "Attending" ? "border-olive/30 bg-olive/10 text-olive" : status === "Maybe" ? "border-gold/40 bg-gold/10" : status === "Not attending" ? "bg-ink/5 text-ink/40" : "border-tomato/20 bg-tomato/5 text-tomato"}`}
                          title={status}
                        >
                          <span className="min-w-0 truncate">{status}</span>
                        </span>
                      </div>
                      <div className="min-w-0">
                        {hasAllergy ? (
                          <span className="flex min-w-0 items-center gap-1 text-xs font-bold text-tomato" title={allergyLabel}>
                            <AlertTriangle size={13} className="shrink-0" />
                            <span className="min-w-0 truncate">{allergyLabel}</span>
                          </span>
                        ) : (
                          <span className="block truncate text-xs text-ink/40">None</span>
                        )}
                      </div>
                      <div className="flex justify-center" aria-label={hasPlusOne ? "Plus one" : "No plus one"}>
                        {hasPlusOne ? (
                          <Check size={16} className="text-olive" strokeWidth={2.25} />
                        ) : (
                          <X size={16} className="text-ink/30" strokeWidth={2.25} />
                        )}
                      </div>
                      <div className="min-w-0">
                        {sendable ? <SendInviteButton partyId={partyId} guest={sendable} outbound={outbound} /> : null}
                      </div>
                      <div className="flex justify-end">
                        <GuestActions guestId={guest.id} guestName={guest.name} partyId={partyId} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <ShareInviteCard partyId={partyId} token={party.share_token} />
          <article className="card overflow-hidden">
            <div className="h-48">
              <img src="/photos/party-07.webp" alt="Outdoor dinner invitation image" className="h-full w-full object-cover" />
            </div>
            <div className="p-5">
              <p className="font-handwritten text-sm text-tomato">Invitation preview</p>
              <h3 className="mt-2 font-editorial text-3xl font-semibold">{party.name}</h3>
              <p className="mt-3 text-xs leading-relaxed text-ink/50">
                Guests get the full invitation, RSVP, and a one-tap Add to Google Calendar action.
              </p>
              <a href={`/invite/${firstActiveToken}`} target="_blank" className="btn-secondary mt-5 w-full">
                Open preview
              </a>
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
