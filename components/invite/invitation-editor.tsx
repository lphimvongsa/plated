"use client";

import { CropEditor } from "@/components/media/crop-editor";
import { CroppedImage } from "@/components/media/cropped-image";
import { updateInvitationDraft, uploadInvitationPhoto } from "@/lib/actions/parties";
import { googleCalendarUrl } from "@/lib/calendar";
import { compressImageForUpload } from "@/lib/media/compress";
import { cropArrayFromJson, normalizeCrop, type CropRect } from "@/lib/media/crop";
import { durationMinutesBetween, partyEndsAt } from "@/lib/party/duration";
import { inviteCalendarEvent } from "@/lib/outbound/invite";
import { PARTY_THEMES, partyThemeByKey, partyThemeCssVars } from "@/lib/party/themes";
import { ArrowDown, ArrowUp, CalendarPlus, Crop, ImagePlus, MapPin, Save, Send, Sparkles, Wine, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

export type InvitationMenuItem = {
  id: string;
  course: string | null;
  title: string;
  description: string | null;
  baseTitle: string;
  baseDescription: string | null;
};

type PartyDraft = {
  id: string;
  name: string;
  date: string;
  time: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: string | null;
  color_scheme: string;
  hero_image: string | null;
  cover_crop: unknown;
  dress_code: string | null;
  guest_contribution_notes: string | null;
  invitation_headline: string | null;
  invitation_message: string | null;
  invitation_signoff: string | null;
  invitation_rsvp_label: string | null;
  invitation_photo_urls: string[];
  invitation_photo_positions: string[];
  invitation_photo_crops: unknown;
};

export function InvitationEditor({ party, menu }: { party: PartyDraft; menu: InvitationMenuItem[] }) {
  const [scheme, setScheme] = useState(party.color_scheme || PARTY_THEMES[0].key);
  const theme = useMemo(() => partyThemeByKey(scheme), [scheme]);
  const [headline, setHeadline] = useState(party.invitation_headline || party.name);
  const [message, setMessage] = useState(party.invitation_message || "Dinner, drinks, and a table worth lingering around.");
  const [signoff, setSignoff] = useState(party.invitation_signoff || "Come hungry. Stay late.");
  const [rsvpLabel, setRsvpLabel] = useState(party.invitation_rsvp_label || "RSVP to dinner");
  const [dressCode, setDressCode] = useState(party.dress_code || "Come as you are");
  const [bring, setBring] = useState(party.guest_contribution_notes || "Just yourself");
  const [date, setDate] = useState(party.date);
  const [time, setTime] = useState(party.time);
  const [location, setLocation] = useState(party.location || "");
  const initialPhotos = party.invitation_photo_urls.length
    ? party.invitation_photo_urls.slice(0, 5)
    : [party.hero_image || "/photos/party-01.webp"];
  const [photos, setPhotos] = useState(initialPhotos);
  const [positions, setPositions] = useState(initialPhotos.map((_, i) => party.invitation_photo_positions[i] || "50% 50%"));
  const [crops, setCrops] = useState<CropRect[]>(cropArrayFromJson(party.invitation_photo_crops, initialPhotos.length));
  const photoSlotLabels = ["Overview · primary", "Overview · detail", "Menu · photo 1", "Menu · photo 2", "RSVP · photo"] as const;
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [cropOpen, setCropOpen] = useState(false);
  const [menuDraft, setMenuDraft] = useState(menu);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();

  function movePhoto(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const nextPos = [...positions];
    const nextCrops = [...crops];
    [next[index], next[target]] = [next[target], next[index]];
    [nextPos[index], nextPos[target]] = [nextPos[target], nextPos[index]];
    [nextCrops[index], nextCrops[target]] = [nextCrops[target], nextCrops[index]];
    setPhotos(next);
    setPositions(nextPos);
    setCrops(nextCrops);
    setSelectedPhoto(target);
  }

  function removePhoto(index: number) {
    if (photos.length <= 1) return;
    setPhotos((current) => current.filter((_, i) => i !== index));
    setPositions((current) => current.filter((_, i) => i !== index));
    setCrops((current) => current.filter((_, i) => i !== index));
    setSelectedPhoto(0);
  }

  function save() {
    const data = new FormData();
    data.set("invitation_headline", headline);
    data.set("invitation_message", message);
    data.set("invitation_signoff", signoff);
    data.set("invitation_rsvp_label", rsvpLabel);
    data.set("dress_code", dressCode);
    data.set("guest_contribution_notes", bring);
    data.set("color_scheme", scheme);
    data.set("date", date);
    data.set("time", time);
    data.set("location", location);
    photos.forEach((photo) => data.append("invitation_photo_urls", photo));
    positions.forEach((position) => data.append("invitation_photo_positions", position));
    data.set("invitation_photo_crops", JSON.stringify(crops));
    data.set(
      "invitation_menu_overrides",
      JSON.stringify(
        Object.fromEntries(menuDraft.map((item) => [item.id, { title: item.title, description: item.description ?? "" }])),
      ),
    );
    setStatus(null);
    setError(null);
    startTransition(async () => {
      const result = await updateInvitationDraft(party.id, data);
      if (result?.error) return setError(result.error);
      setStatus("Draft saved.");
    });
  }

  const mainPhoto = photos[0] || party.hero_image || "/photos/party-01.webp";
  const secondPhoto = photos[1] || photos[0] || "/photos/party-03.webp";
  const previewCalendar = useMemo(() => {
    const parsedStart = date && time ? new Date(`${date}T${time}:00`) : new Date(party.starts_at);
    const startsAt = Number.isNaN(parsedStart.getTime()) ? party.starts_at : parsedStart.toISOString();
    const durationMinutes = durationMinutesBetween(party.starts_at, party.ends_at);
    const endsAt = partyEndsAt(new Date(startsAt), durationMinutes).toISOString();
    return googleCalendarUrl(
      inviteCalendarEvent(
        {
          name: party.name,
          startsAt,
          endsAt,
          timezone: party.timezone,
          location,
          description: message,
          invitationMessage: message,
          invitationHeadline: headline,
        },
        `/invite/preview`,
      ),
    );
  }, [date, time, party.starts_at, party.ends_at, party.timezone, party.name, location, message, headline]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-editorial text-5xl font-semibold">Invitation</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" disabled={pending} onClick={save}>
            <Save size={15} />
            {pending ? "Saving…" : "Save draft"}
          </button>
          <Link href={`/app/parties/${party.id}/guests`} className="btn-secondary">
            <Send size={15} /> Send invitations
          </Link>
        </div>
      </section>
      {status ? <p className="border border-olive/25 bg-olive/10 px-3 py-2 text-xs font-semibold text-olive">{status}</p> : null}
      {error ? <p className="border border-tomato/25 bg-tomato/10 px-3 py-2 text-xs font-semibold text-tomato">{error}</p> : null}

      <div className="grid min-h-[calc(100dvh-250px)] gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="card space-y-4 p-5">
            <p className="eyebrow">Front</p>
            <label><span className="mb-1.5 block text-xs font-semibold">Headline</span><input className="field" value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold">Intro message</span><textarea className="field min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="mb-1.5 block text-xs font-semibold">Date</span><input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label><span className="mb-1.5 block text-xs font-semibold">Time</span><input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            </div>
            <label><span className="mb-1.5 block text-xs font-semibold">Location</span><input className="field" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold">RSVP wording</span><input className="field" value={rsvpLabel} onChange={(e) => setRsvpLabel(e.target.value)} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold">Host / signoff</span><input className="field" value={signoff} onChange={(e) => setSignoff(e.target.value)} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold">Dress code</span><input className="field" value={dressCode} onChange={(e) => setDressCode(e.target.value)} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold">Items to bring</span><input className="field" value={bring} onChange={(e) => setBring(e.target.value)} /></label>
          </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="eyebrow">Menu copy</p><p className="mt-1 text-xs text-ink/45">Automatically populated from the party menu. These edits only change what guests see.</p></div>
          </div>
          <div className="mt-4 space-y-4">
            {menuDraft.length ? menuDraft.map((item, index) => (
              <div key={item.id} className="border-t border-ink/10 pt-3 first:border-t-0 first:pt-0">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-tomato">{item.course || `Dish ${index + 1}`}</p>
                <input
                  className="field !py-2 text-xs font-semibold"
                  value={item.title}
                  onChange={(event) => setMenuDraft((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, title: event.target.value } : candidate))}
                />
                <textarea
                  className="field mt-2 min-h-16 !py-2 text-xs"
                  value={item.description ?? ""}
                  placeholder="Menu description"
                  onChange={(event) => setMenuDraft((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, description: event.target.value } : candidate))}
                />
                <button type="button" className="mt-1 text-[9px] font-bold uppercase tracking-widest text-ink/35 hover:text-tomato" onClick={() => setMenuDraft((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, title: candidate.baseTitle, description: candidate.baseDescription } : candidate))}>Reset to party menu</button>
              </div>
            )) : <p className="text-xs text-ink/45">Add dishes to the party menu and they will appear here automatically.</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Color scheme</p><p className="mt-1 text-xs text-ink/45">The same scheme drives the active party UI and invitation.</p></div><span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">{theme.name}</span></div>
          <div className="mt-3 grid grid-cols-5 gap-2">{PARTY_THEMES.map((item) => <button key={item.key} type="button" onClick={() => setScheme(item.key)} className={`group border p-1.5 transition hover:-translate-y-0.5 hover:shadow-sm ${scheme === item.key ? "border-ink" : "border-ink/10"}`} title={item.name} style={{ background: item.paper }}><div className="flex h-6 overflow-hidden">{[item.primary, item.secondary, item.olive].map((color) => <span key={color} className="flex-1" style={{ background: color }} />)}</div></button>)}</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Photos</p><p className="mt-1 text-xs text-ink/45">Choose 1–5 photos, reorder them, and crop each one directly.</p></div><span className="text-xs font-bold">{photos.length}/5</span></div>
          <div className="mt-3 space-y-2">
            {photos.map((photo, index) => (
              <div key={`${photo}-${index}`} className={`grid grid-cols-[64px_1fr_auto] items-center gap-3 border p-2 ${selectedPhoto === index ? "border-tomato" : "border-ink/12"}`} onClick={() => setSelectedPhoto(index)}>
                <CroppedImage src={photo} alt="" crop={crops[index]} className="h-14 w-16" />
                <span className="truncate text-xs font-semibold">{photoSlotLabels[index] || `Photo ${index + 1}`}</span>
                <div className="flex">
                  <button type="button" className="btn-icon !h-7 !w-7" onClick={(e) => { e.stopPropagation(); movePhoto(index, -1); }}><ArrowUp size={12} /></button>
                  <button type="button" className="btn-icon !h-7 !w-7" onClick={(e) => { e.stopPropagation(); movePhoto(index, 1); }}><ArrowDown size={12} /></button>
                  {photos.length > 1 ? <button type="button" className="btn-icon !h-7 !w-7" onClick={(e) => { e.stopPropagation(); removePhoto(index); }}><X size={12} /></button> : null}
                </div>
              </div>
            ))}
          </div>
          {photos.length < 5 ? (
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-ink/20 p-3 text-[10px] font-bold uppercase tracking-widest hover:border-tomato hover:text-tomato">
              <ImagePlus size={14} />{uploading ? "Uploading…" : "Add photo"}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                startUpload(async () => {
                  setError(null);
                  try {
                    const photo = await compressImageForUpload(file);
                    const fd = new FormData();
                    fd.set("photo", photo);
                    const result = await uploadInvitationPhoto(party.id, fd);
                    if (result?.error) return setError(result.error);
                    if (result.url) {
                      setPhotos((current) => [...current, result.url!].slice(0, 5));
                      setPositions((current) => [...current, "50% 50%"].slice(0, 5));
                      setCrops((current) => [...current, normalizeCrop(null)].slice(0, 5));
                      setSelectedPhoto(photos.length);
                    }
                  } catch (uploadError) {
                    setError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.");
                  } finally {
                    input.value = "";
                  }
                });
              }} />
            </label>
          ) : null}
          {photos[selectedPhoto] ? <button type="button" className="btn-secondary mt-3 w-full !min-h-9 text-[10px]" onClick={() => setCropOpen(true)}><Crop size={14}/> Crop selected photo</button> : null}
        </div>
        </aside>

        <section className="min-h-0 overflow-hidden border border-ink/12 bg-[#e7e1d7] p-3 md:p-6">
          <div className="mx-auto h-[calc(100dvh-230px)] min-h-[640px] max-w-[1000px] overflow-y-auto bg-paper shadow-[0_24px_70px_rgba(41,35,31,.15)]" style={partyThemeCssVars(scheme)}>
          <div className="paper-noise min-h-full bg-paper text-ink">
            <section className="grid items-center gap-6 px-7 py-10 lg:grid-cols-[1.05fr_.95fr]">
              <div className="relative min-h-[500px]">
                <div className="absolute left-0 top-3 h-[72%] w-[79%] -rotate-[2deg] bg-[#fffaf1] p-2 pb-9 shadow-paper">
                  <CroppedImage src={mainPhoto} alt="Invitation photo" crop={crops[0]} className="h-full w-full" />
                  <p className="absolute bottom-2 left-4 font-handwritten text-xs">{party.name.toLowerCase()}</p>
                </div>
                {photos[1] ? (
                  <div className="absolute bottom-0 right-0 h-[44%] w-[47%] rotate-[4deg] bg-[#fffaf1] p-2 pb-8 shadow-paper">
                    <CroppedImage src={secondPhoto} alt="Dinner detail" crop={crops[1]} className="h-full w-full" />
                    <p className="absolute bottom-2 left-3 font-handwritten text-[10px]">come hungry</p>
                  </div>
                ) : null}
              </div>
              <div>
                <p className="font-handwritten text-lg text-tomato">You’re invited to</p>
                <h1 className="mt-3 font-editorial text-6xl font-semibold leading-[.84] tracking-[-.055em]">{headline}</h1>
                <div className="mt-7 border-t border-ink/20 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.18em]">{date} · {time}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-ink/55"><MapPin size={13}/> {location || "Location to come"}</p>
                </div>
                <p className="mt-5 font-editorial text-xl leading-relaxed">{message}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button type="button" className="btn-primary">{rsvpLabel}</button>
                  <a href={previewCalendar} target="_blank" rel="noreferrer" className="btn-secondary">
                    <CalendarPlus size={14} /> Add to Google Calendar
                  </a>
                </div>
              </div>
            </section>

            <section className="bg-ink px-8 py-12 text-paper">
              <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
                <div><p className="eyebrow !text-paper/45">On the table</p><h2 className="mt-2 font-editorial text-5xl font-semibold">The menu</h2><p className="mt-4 font-handwritten text-base text-orange">{signoff}</p></div>
                <div className="divide-y divide-paper/15 border-y border-paper/15">
                  {menuDraft.length ? menuDraft.map((dish) => <article key={dish.id} className="grid gap-2 py-5 sm:grid-cols-[120px_1fr]"><p className="text-[10px] font-bold uppercase tracking-widest text-orange">{dish.course || "Course"}</p><div><h3 className="font-editorial text-2xl font-semibold">{dish.title}</h3><p className="mt-1 text-xs text-paper/45">{dish.description || ""}</p></div></article>) : <p className="py-8 text-sm text-paper/45">Menu items will appear here automatically.</p>}
                </div>
              </div>
              <div className="mt-10 grid gap-3 md:grid-cols-2">
                <article className="rounded-[1.5rem] bg-white/[0.06] p-5"><Sparkles className="text-orange" size={18}/><p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-paper/45">Dress</p><p className="mt-2 font-editorial text-2xl font-semibold">{dressCode}</p></article>
                <article className="rounded-[1.5rem] bg-white/[0.06] p-5"><Wine className="text-orange" size={18}/><p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-paper/45">Bring</p><p className="mt-2 font-editorial text-2xl font-semibold">{bring}</p></article>
              </div>
              {photos[2] || photos[3] ? <div className={`mt-3 grid gap-3 ${photos[2] && photos[3] ? "md:grid-cols-2" : "grid-cols-1"}`}>
                {photos[2] ? <CroppedImage src={photos[2]} alt="Menu photo one" crop={crops[2]} className="h-64 w-full rounded-[1.5rem]" /> : null}
                {photos[3] ? <CroppedImage src={photos[3]} alt="Menu photo two" crop={crops[3]} className="h-64 w-full rounded-[1.5rem]" /> : null}
              </div> : null}
            </section>

            <section className="grid gap-8 px-8 py-12 lg:grid-cols-[.8fr_1.2fr]">
              <div><p className="font-handwritten text-lg text-tomato">Save your seat</p><h2 className="mt-2 font-editorial text-5xl font-semibold leading-[.9]">Will you join us?</h2><p className="mt-4 text-xs leading-relaxed text-ink/55">Allergies are selected from ingredients in the set menu so the kitchen can match them reliably.</p>{photos[4] ? <CroppedImage src={photos[4]} alt="RSVP photo" crop={crops[4]} className="mt-6 h-56 w-full rounded-[1.25rem]" /> : null}</div>
              <div className="card p-6">
                <div className="field text-ink/35">Your name</div>
                <div className="mt-4 grid grid-cols-3 gap-2">{["Attending", "Maybe", "Can’t make it"].map((label, i) => <div key={label} className={`rounded-2xl border px-2 py-3 text-center text-[10px] font-bold ${i === 0 ? "border-ink bg-ink text-paper" : "border-ink/15"}`}>{label}</div>)}</div>
                <div className="mt-4 flex items-center gap-3 border border-ink/15 px-4 py-3">
                  <span className="grid h-4 w-4 place-items-center border border-ink/30" />
                  <span className="text-xs text-ink/45">I'm bringing a plus one</span>
                </div>
                <div className="mt-4 border border-dashed border-ink/15 px-3 py-3 text-xs text-ink/35">Add allergy</div>
                <div className="field mt-3 min-h-20 text-ink/35">Note for the hosts</div>
              </div>
            </section>
          </div>
        </div>
      </section>
      </div>

      <CropEditor
        open={cropOpen && Boolean(photos[selectedPhoto])}
        src={photos[selectedPhoto] || ""}
        value={crops[selectedPhoto]}
        title={`Crop invitation photo ${selectedPhoto + 1}`}
        onCancel={() => setCropOpen(false)}
        onSave={(crop) => {
          setCrops((current) => current.map((value, index) => index === selectedPhoto ? normalizeCrop(crop) : value));
          setCropOpen(false);
        }}
      />
    </div>
  );
}
