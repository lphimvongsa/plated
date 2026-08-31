"use client";

import { Brand } from "@/components/brand";
import { CroppedImage } from "@/components/media/cropped-image";
import { PartyThemeBridge } from "@/components/party-theme-bridge";
import { cropArrayFromJson } from "@/lib/media/crop";
import { submitRsvp } from "@/lib/actions/invite";
import { formatPartyWhen, googleCalendarUrl } from "@/lib/calendar";
import { DEFAULT_PARTY_DURATION_MINUTES, partyEndsAt } from "@/lib/party/duration";
import { inviteCalendarEvent } from "@/lib/outbound/invite";
import type { InvitePayload } from "@/lib/database.types";
import { partyThemeCssVars } from "@/lib/party/themes";
import { parseAllergyList, serializeAllergyList } from "@/lib/rsvp";
import { MAJOR_ALLERGENS, allergenDisplayName } from "@/lib/allergens";
import { CalendarPlus, Check, ChevronDown, Download, MapPin, PartyPopper, Plus, Sparkles, Wine, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

const rsvpLabels = {
  attending: "Attending",
  maybe: "Maybe",
  not_attending: "Can’t make it",
} as const;

type Props = {
  token: string;
  initial: InvitePayload;
  origin: string;
};

export function InviteExperience({ token, initial, origin }: Props) {
  const [invite, setInvite] = useState(initial);
  const [submitted, setSubmitted] = useState(
    Boolean(initial.guest && initial.guest.rsvp_status !== "no_response"),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const party = invite.party!;
  const guest = invite.guest!;
  const softExpired = invite.status === "soft_expired";
  const { date, time } = formatPartyWhen(party.starts_at, party.timezone);
  const photos = party.invitation_photo_urls?.length ? party.invitation_photo_urls : [party.hero_image || "/photos/party-01.webp"];
  const photoCrops = cropArrayFromJson(party.invitation_photo_crops, photos.length);
  const headline = party.invitation_headline || party.name;
  const introMessage = party.invitation_message || party.description || "Dinner, drinks, and a table worth lingering around.";
  const signoff = party.invitation_signoff || "Come hungry. Stay late.";
  const rsvpLabel = party.invitation_rsvp_label || "RSVP to dinner";

  const [name, setName] = useState(guest.name ?? "");
  const [rsvp, setRsvp] = useState<"attending" | "maybe" | "not_attending">(
    guest.rsvp_status === "maybe" || guest.rsvp_status === "not_attending" || guest.rsvp_status === "attending"
      ? guest.rsvp_status
      : "attending",
  );
  const [plusOne, setPlusOne] = useState((guest.plus_one_count ?? 0) > 0);
  const [allergies, setAllergies] = useState<string[]>(parseAllergyList(guest.allergies));
  const [allergyQuery, setAllergyQuery] = useState("");
  const [notes, setNotes] = useState(guest.notes ?? "");

  const calendarEvent = useMemo(
    () =>
      inviteCalendarEvent(
        {
          name: party.name,
          startsAt: party.starts_at,
          endsAt: party.ends_at || partyEndsAt(new Date(party.starts_at), DEFAULT_PARTY_DURATION_MINUTES).toISOString(),
          timezone: party.timezone,
          location: party.location,
          description: party.description,
          invitationMessage: party.invitation_message,
          invitationHeadline: party.invitation_headline,
        },
        `${origin.replace(/\/$/, "")}/invite/${token}`,
      ),
    [party, token, origin],
  );

  const gcal = googleCalendarUrl(calendarEvent);
  const icsHref = `/invite/${token}/calendar`;
  const allergyOptions = useMemo(() => {
    const fromMenu = initial.allergy_options ?? [];
    const canonical = MAJOR_ALLERGENS.map((tag) => ({ kind: "allergen" as const, value: tag, label: allergenDisplayName(tag), allergens: [tag] }));
    const seen = new Set<string>();
    return [...canonical, ...fromMenu].filter((option) => {
      const key = `${option.kind}:${option.value}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [initial.allergy_options]);
  const allergySuggestions = useMemo(() => {
    const query = allergyQuery.trim().toLowerCase();
    if (!query) return [];
    return allergyOptions
      .filter((option) => !allergies.some((selected) => selected.toLowerCase() === option.label.toLowerCase()))
      .filter((option) => `${option.label} ${option.value} ${option.allergens.join(" ")}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [allergyOptions, allergyQuery, allergies]);

  function addAllergyOption(option: (typeof allergyOptions)[number]) {
    const additions = option.kind === "ingredient"
      ? [option.label, ...option.allergens.map(allergenDisplayName)]
      : [option.label];
    setAllergies((current) => Array.from(new Set([...current, ...additions].filter(Boolean))));
    setAllergyQuery("");
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (softExpired) return;
    setError(null);
    startTransition(async () => {
      const result = await submitRsvp({
        token,
        name,
        rsvpStatus: rsvp,
        allergies: serializeAllergyList(allergies),
        plusOneCount: plusOne ? 1 : 0,
        notes,
      });
      if (!result.ok) {
        setError(result.error === "soft_expired" ? "This dinner has passed — RSVPs are closed." : "Could not save your RSVP.");
        if (result.status === "soft_expired") setInvite(result);
        return;
      }
      setInvite(result);
      setSubmitted(true);
    });
  };

  return (
    <main className="party-theme paper-noise min-h-screen overflow-hidden bg-paper text-ink" style={partyThemeCssVars(party.color_scheme)}>
      <PartyThemeBridge scheme={party.color_scheme} />
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <Brand compact />
        <Link href="/auth/login" className="text-xs font-bold uppercase tracking-widest">
          Made with plated.
        </Link>
      </header>

      {softExpired ? (
        <div className="mx-auto max-w-7xl px-5 md:px-10">
          <p className="border border-ink/15 bg-[#f8f2e8] px-4 py-3 text-sm text-ink/70">
            This dinner has passed. You can still review the details and your last RSVP, but edits are closed.
          </p>
        </div>
      ) : null}

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-4 md:px-10 lg:grid-cols-[1.05fr_.95fr] lg:pt-10">
        <div className="relative min-h-[610px] md:min-h-[760px]">
          <div className="absolute left-0 top-3 h-[72%] w-[79%] -rotate-[2deg] bg-[#fffaf1] p-2 pb-10 shadow-paper">
            <div className="relative h-full overflow-hidden">
              <CroppedImage
                src={photos[0] || party.hero_image || "/photos/party-01.webp"}
                alt="Outdoor garden dinner party"
                crop={photoCrops[0]}
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/25 to-transparent" />
            </div>
            <p className="absolute bottom-3 left-4 font-handwritten text-sm">{party.name.toLowerCase()}</p>
          </div>
          {photos[1] ? (
            <div className="absolute bottom-0 right-0 h-[45%] w-[47%] rotate-[4deg] bg-[#fffaf1] p-2 pb-9 shadow-paper">
              <div className="h-full overflow-hidden">
                <CroppedImage src={photos[1]} alt="Dinner party detail" crop={photoCrops[1]} className="h-full w-full" />
              </div>
              <p className="absolute bottom-2 left-3 font-handwritten text-xs">come hungry</p>
            </div>
          ) : null}
        </div>
        <div className="lg:pl-4">
          <p className="font-handwritten text-xl text-tomato">You’re invited to</p>
          <h1 className="mt-3 font-editorial text-[3.55rem] font-semibold leading-[.84] tracking-[-.05em] min-[390px]:text-[4rem] sm:text-[6.3rem]">
            {headline}
          </h1>
          <div className="mt-8 editorial-rule pt-5">
            <p className="text-sm font-bold uppercase tracking-[.18em]">
              {date} · {time}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-ink/55">
              <MapPin size={15} /> {party.location}
            </p>
            <a href={gcal} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-tomato hover:underline">
              <CalendarPlus size={15} /> Add to Google Calendar
            </a>
          </div>
          <p className="mt-6 max-w-xl font-editorial text-2xl leading-relaxed">
            {introMessage}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {party.cuisine ? <span className="chip bg-white/45">{party.cuisine}</span> : null}
            {party.theme ? <span className="chip bg-white/45">{party.theme}</span> : null}
            {party.service_style ? <span className="chip bg-white/45">{party.service_style}</span> : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {!softExpired ? (
              <a href="#rsvp" className="btn-primary px-8">
                {rsvpLabel} <ChevronDown size={16} />
              </a>
            ) : null}
            <a href={gcal} target="_blank" rel="noreferrer" className="btn-secondary">
              <CalendarPlus size={16} /> {softExpired ? "View in Google Calendar" : "Add to Google Calendar"}
            </a>
            <a href={icsHref} className="btn-secondary">
              <Download size={16} /> Apple / Outlook
            </a>
          </div>
        </div>
      </section>

      <section className="bg-ink px-5 py-20 text-paper md:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="eyebrow !text-paper/45">On the table</p>
              <h2 className="mt-3 font-editorial text-6xl font-semibold leading-[.9]">The menu</h2>
              <p className="mt-5 font-handwritten text-lg text-orange">{signoff}</p>
            </div>
            <div className="divide-y divide-paper/15 border-y border-paper/15">
              {(invite.menu ?? []).map((dish) => (
                <article key={`${dish.course}-${dish.title}`} className="grid gap-2 py-6 sm:grid-cols-[150px_1fr]">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange">{dish.course}</p>
                  <div>
                    <h3 className="font-editorial text-3xl font-semibold">{dish.title}</h3>
                    <p className="mt-1 text-sm text-paper/45">{dish.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.5rem] bg-paper/10 p-5">
              <Sparkles className="text-orange" size={19} />
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-paper/45">Dress</p>
              <p className="mt-2 font-editorial text-2xl font-semibold">{party.dress_code || "Come as you are"}</p>
            </article>
            <article className="rounded-[1.5rem] bg-paper/10 p-5">
              <Wine className="text-orange" size={19} />
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-paper/45">Bring</p>
              <p className="mt-2 font-editorial text-2xl font-semibold">{party.guest_contribution_notes || "Just yourself"}</p>
            </article>
          </div>
          {photos[2] || photos[3] ? (
            <div className={`mt-4 grid gap-4 ${photos[2] && photos[3] ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {photos[2] ? <article className="overflow-hidden rounded-[1.5rem]"><CroppedImage src={photos[2]} alt="Menu detail" crop={photoCrops[2]} className="h-72 w-full" /></article> : null}
              {photos[3] ? <article className="overflow-hidden rounded-[1.5rem]"><CroppedImage src={photos[3]} alt="Table detail" crop={photoCrops[3]} className="h-72 w-full" /></article> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section id="rsvp" className="px-5 py-20 md:px-10 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="font-handwritten text-xl text-tomato">Save your seat</p>
            <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[.9] sm:text-6xl">Will you join us?</h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/55">Your response helps the kitchen scale the recipes. Choose allergies from the menu-aware list so the kitchen can match them reliably.</p>
            {photos[4] ? <div className="mt-8 overflow-hidden rounded-[1.5rem] bg-paper-2 p-2 shadow-paper"><CroppedImage src={photos[4]} alt="RSVP dinner detail" crop={photoCrops[4]} className="h-72 w-full" /></div> : null}
          </div>
          <div className="card p-6 md:p-8">
            {softExpired ? (
              <div className="flex min-h-[320px] flex-col justify-center">
                <p className="eyebrow">Your last RSVP</p>
                <h3 className="mt-3 font-editorial text-4xl font-semibold">
                  {rsvpLabels[guest.rsvp_status as keyof typeof rsvpLabels] ?? "No response"}
                </h3>
                <p className="mt-4 text-sm text-ink/55">{guest.name}</p>
                {parseAllergyList(guest.allergies).length ? (
                  <p className="mt-2 text-sm text-ink/55">Allergies: {parseAllergyList(guest.allergies).join(", ")}</p>
                ) : null}
              </div>
            ) : !submitted ? (
              <form onSubmit={onSubmit}>
                <label>
                  <span className="mb-2 block text-xs font-semibold">Your name</span>
                  <input className="field" required value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <fieldset className="mt-6">
                  <legend className="text-xs font-semibold">RSVP</legend>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(Object.keys(rsvpLabels) as Array<keyof typeof rsvpLabels>).map((key) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setRsvp(key)}
                        className={`rounded-2xl border px-3 py-4 text-xs font-bold ${
                          rsvp === key ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white/35"
                        }`}
                      >
                        {rsvpLabels[key]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={plusOne}
                  onClick={() => setPlusOne((current) => !current)}
                  className={`mt-6 flex w-full items-center gap-4 border px-4 py-4 text-left transition ${
                    plusOne ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white/35"
                  }`}
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center border ${plusOne ? "border-paper bg-paper text-ink" : "border-ink/35"}`}>
                    {plusOne ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">I'm bringing a plus one</span>
                    <span className={`mt-1 block text-xs ${plusOne ? "text-paper/60" : "text-ink/45"}`}>We'll set another place at the table.</span>
                  </span>
                </button>
                <div className="mt-6">
                  <span className="text-xs font-semibold">Allergies & ingredient sensitivities</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink/45">Start typing an ingredient or major allergen. Suggestions come from the actual set menu.</p>
                  {allergies.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {allergies.map((allergy) => (
                        <button key={allergy} type="button" onClick={() => setAllergies((current) => current.filter((item) => item !== allergy))} className="chip bg-tomato/8 text-tomato hover:border-tomato" title="Remove">
                          {allergy} <X size={11}/>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="relative mt-3">
                    <input
                      className="field"
                      value={allergyQuery}
                      placeholder="Try soy, tofu, sesame, peanut…"
                      autoComplete="off"
                      onChange={(event) => setAllergyQuery(event.target.value)}
                    />
                    {allergySuggestions.length ? (
                      <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-64 overflow-y-auto border border-ink/20 bg-paper shadow-card">
                        {allergySuggestions.map((option) => (
                          <button key={`${option.kind}:${option.value}`} type="button" onClick={() => addAllergyOption(option)} className="flex w-full items-start justify-between gap-3 border-b border-ink/10 px-3 py-3 text-left last:border-b-0 hover:bg-paper-2">
                            <span><span className="block text-sm font-semibold">{option.label}</span>{option.kind === "ingredient" && option.allergens.length ? <span className="mt-0.5 block text-[10px] text-ink/45">Contains {option.allergens.map(allergenDisplayName).join(", ")}</span> : <span className="mt-0.5 block text-[10px] uppercase tracking-widest text-ink/35">Major allergen</span>}</span>
                            <Plus size={14} className="mt-1 shrink-0 text-tomato"/>
                          </button>
                        ))}
                      </div>
                    ) : allergyQuery.trim() ? (
                      <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 border border-ink/15 bg-paper px-3 py-3 text-xs text-ink/45 shadow-card">No menu ingredient matches. Add anything unusual in the host note below.</div>
                    ) : null}
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-semibold">Note for the hosts</span>
                  <textarea className="field min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else we should know?" />
                </label>
                {error ? <p className="mt-4 text-sm text-tomato">{error}</p> : null}
                <button type="submit" className="btn-primary mt-6 w-full" disabled={pending}>
                  {pending ? "Sending…" : "Send RSVP"} <PartyPopper size={16} />
                </button>
              </form>
            ) : (
              <div className="flex min-h-[470px] flex-col items-center justify-center text-center">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-olive text-paper">
                  <Check size={32} />
                </div>
                <p className="mt-7 font-handwritten text-xl text-tomato">You’re on the list.</p>
                <h3 className="mt-2 font-editorial text-5xl font-semibold">See you at sunset.</h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/55">
                  Your RSVP is saved. Reopen this same link anytime to check the dinner details or update your response.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <a href={gcal} target="_blank" rel="noreferrer" className="btn-secondary">
                    <CalendarPlus size={16} /> Add to Google Calendar
                  </a>
                  <a href={icsHref} className="btn-secondary">
                    <Download size={16} /> Apple / Outlook
                  </a>
                  <button className="btn-secondary" onClick={() => setSubmitted(false)}>
                    Edit response
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10 px-5 py-10 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Brand compact />
          <p className="text-xs text-ink/45">A dinner invitation made with plated.</p>
        </div>
      </footer>
    </main>
  );
}
