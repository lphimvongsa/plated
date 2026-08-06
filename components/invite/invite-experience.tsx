"use client";

import { Brand } from "@/components/brand";
import { submitRsvp } from "@/lib/actions/invite";
import { formatPartyWhen, googleCalendarUrl, icsDataUri } from "@/lib/calendar";
import type { InvitePayload } from "@/lib/database.types";
import { CalendarPlus, Check, ChevronDown, Download, MapPin, PartyPopper, Sparkles, Wine } from "lucide-react";
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
};

export function InviteExperience({ token, initial }: Props) {
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

  const [name, setName] = useState(guest.name ?? "");
  const [email, setEmail] = useState(guest.email ?? "");
  const [rsvp, setRsvp] = useState<"attending" | "maybe" | "not_attending">(
    guest.rsvp_status === "maybe" || guest.rsvp_status === "not_attending" || guest.rsvp_status === "attending"
      ? guest.rsvp_status
      : "attending",
  );
  const [plusOne, setPlusOne] = useState(String(guest.plus_one_count ?? 0));
  const [dietary, setDietary] = useState(guest.dietary_preference ?? "None");
  const [allergies, setAllergies] = useState(guest.allergies ?? "");
  const [notes, setNotes] = useState(guest.notes ?? "");

  const calendarEvent = useMemo(
    () => ({
      title: party.name,
      startsAt: party.starts_at,
      endsAt: party.ends_at,
      location: party.location,
      description: party.description ?? `Dinner invitation for ${party.name}`,
    }),
    [party],
  );

  const gcal = googleCalendarUrl(calendarEvent);
  const ics = icsDataUri(calendarEvent);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (softExpired) return;
    setError(null);
    startTransition(async () => {
      const result = await submitRsvp({
        token,
        name,
        email,
        rsvpStatus: rsvp,
        allergies,
        dietaryPreference: dietary === "None" ? undefined : dietary,
        plusOneCount: Number(plusOne) || 0,
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
    <main className="paper-noise min-h-screen overflow-hidden bg-[#eee4d4] text-ink">
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
              <img
                src={party.hero_image || "/photos/party-01.webp"}
                alt="Outdoor garden dinner party"
                className="h-full w-full object-cover object-[50%_58%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/25 to-transparent" />
            </div>
            <p className="absolute bottom-3 left-4 font-handwritten text-sm">{party.name.toLowerCase()}</p>
          </div>
          <div className="absolute bottom-0 right-0 h-[45%] w-[47%] rotate-[4deg] bg-[#fffaf1] p-2 pb-9 shadow-paper">
            <div className="h-full overflow-hidden">
              <img src="/photos/party-03.webp" alt="Guests making a toast" className="h-full w-full object-cover" />
            </div>
            <p className="absolute bottom-2 left-3 font-handwritten text-xs">come hungry</p>
          </div>
        </div>
        <div className="lg:pl-4">
          <p className="font-handwritten text-xl text-tomato">You’re invited to</p>
          <h1 className="mt-3 font-editorial text-[4.6rem] font-semibold leading-[.82] tracking-[-.055em] sm:text-[6.3rem]">
            {party.name}
          </h1>
          <div className="mt-8 editorial-rule pt-5">
            <p className="text-sm font-bold uppercase tracking-[.18em]">
              {date} · {time}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-ink/55">
              <MapPin size={15} /> {party.location}
            </p>
          </div>
          <p className="mt-6 max-w-xl font-editorial text-2xl leading-relaxed">
            {party.description}
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {party.cuisine ? <span className="chip bg-white/45">{party.cuisine}</span> : null}
            {party.theme ? <span className="chip bg-white/45">{party.theme}</span> : null}
            {party.service_style ? <span className="chip bg-white/45">{party.service_style}</span> : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {!softExpired ? (
              <a href="#rsvp" className="btn-primary px-8">
                RSVP to dinner <ChevronDown size={16} />
              </a>
            ) : null}
            <a href={gcal} target="_blank" rel="noreferrer" className="btn-secondary">
              <CalendarPlus size={16} /> {softExpired ? "View in Google Calendar" : "Add to Google Calendar"}
            </a>
            <a href={ics} download={`${party.name.replace(/\s+/g, "-").toLowerCase()}.ics`} className="btn-secondary">
              <Download size={16} /> .ics
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
              <p className="mt-5 font-handwritten text-lg text-orange">served in the middle, passed around, seconds encouraged</p>
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
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] bg-[#312720] p-5">
              <Sparkles className="text-orange" size={19} />
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-paper/45">Dress</p>
              <p className="mt-2 font-editorial text-2xl font-semibold">{party.dress_code || "Come as you are"}</p>
            </article>
            <article className="rounded-[1.5rem] bg-[#312720] p-5">
              <Wine className="text-orange" size={19} />
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-paper/45">Bring</p>
              <p className="mt-2 font-editorial text-2xl font-semibold">
                {party.guest_contribution_notes || "Just yourself"}
              </p>
            </article>
            <article className="overflow-hidden rounded-[1.5rem]">
              <img src="/photos/party-07.webp" alt="Wine poured at dinner" className="h-full min-h-52 w-full object-cover" />
            </article>
          </div>
        </div>
      </section>

      <section id="rsvp" className="px-5 py-20 md:px-10 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="font-handwritten text-xl text-tomato">Save your seat</p>
            <h2 className="mt-3 font-editorial text-6xl font-semibold leading-[.9]">Will you join us?</h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/55">
              Your response helps the kitchen scale the recipes. Allergies are shared privately with the hosts.
            </p>
          </div>
          <div className="card p-6 md:p-8">
            {softExpired ? (
              <div className="flex min-h-[320px] flex-col justify-center">
                <p className="eyebrow">Your last RSVP</p>
                <h3 className="mt-3 font-editorial text-4xl font-semibold">
                  {rsvpLabels[guest.rsvp_status as keyof typeof rsvpLabels] ?? "No response"}
                </h3>
                <p className="mt-4 text-sm text-ink/55">{guest.name} · {guest.email}</p>
                {guest.allergies ? <p className="mt-2 text-sm text-ink/55">Allergies: {guest.allergies}</p> : null}
              </div>
            ) : !submitted ? (
              <form onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Your name</span>
                    <input className="field" required value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Email</span>
                    <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                </div>
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
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Plus-one count</span>
                    <select className="field" value={plusOne} onChange={(e) => setPlusOne(e.target.value)}>
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Dietary preference</span>
                    <select className="field" value={dietary} onChange={(e) => setDietary(e.target.value)}>
                      <option>None</option>
                      <option>Vegetarian</option>
                      <option>Vegan</option>
                      <option>Pescatarian</option>
                      <option>Other</option>
                    </select>
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-semibold">Allergies</span>
                  <input className="field" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. gluten, sesame, shellfish" />
                </label>
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
