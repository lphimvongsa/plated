"use client";

import { CropEditor } from "@/components/media/crop-editor";
import { CroppedImage } from "@/components/media/cropped-image";
import { archiveParty, deleteParty, duplicateParty, updatePartySettings } from "@/lib/actions/parties";
import {
  DEFAULT_INVITATION_SLOTS,
  INVITATION_PHOTO_SLOTS,
  normalizeInvitationPhotoSlot,
  type InvitationPhotoSlot,
} from "@/lib/invitation-photo-slots";
import { compressImageForUpload } from "@/lib/media/compress";
import { cropArrayFromJson, cropArrayWithCaptions, cropFromJson, normalizeCrop, photoCaptionArrayFromJson, type CropRect } from "@/lib/media/crop";
import { formatPartyEndClock, partyDurationOptions } from "@/lib/party/duration";
import { TimezoneSelect } from "@/components/party/timezone-select";
import { DEFAULT_TIMEZONE, normalizeTimezone } from "@/lib/timezone";
import { PARTY_THEMES } from "@/lib/party/themes";
import { Archive, Copy, Crop, ExternalLink, ImageIcon, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

type SettingsParty = {
  id: string;
  name: string;
  location: string | null;
  theme: string | null;
  cuisine: string | null;
  service_style: string | null;
  dress_code: string | null;
  guest_contribution_notes: string | null;
  planning_guest_count: number;
  date: string;
  time: string;
  timezone: string;
  duration_minutes: number;
  prep_date: string;
  hero_image: string | null;
  cover_position: string;
  cover_crop: unknown;
  color_scheme: string;
  invitation_photo_urls: string[];
  invitation_photo_positions: string[];
  invitation_photo_crops: unknown;
};

const STOCK_PHOTOS = Array.from({ length: 10 }, (_, i) => `/photos/party-${String(i + 1).padStart(2, "0")}.webp`);


export function PartySettingsForm({ party }: { party: SettingsParty }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [heroImage, setHeroImage] = useState(party.hero_image || STOCK_PHOTOS[0]);
  const [coverPosition] = useState(party.cover_position || "50% 50%");
  const [coverCrop, setCoverCrop] = useState<CropRect>(() => cropFromJson(party.cover_crop));
  const [coverUploadPreview, setCoverUploadPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [scheme, setScheme] = useState(party.color_scheme || PARTY_THEMES[0].key);
  const [invitePositions,setInvitePositions]=useState<InvitationPhotoSlot[]>(() => {
    const used = new Set<InvitationPhotoSlot>();
    return party.invitation_photo_urls.map((_, i) => {
      const preferred = normalizeInvitationPhotoSlot(party.invitation_photo_positions[i] || "", i);
      const slot = used.has(preferred)
        ? DEFAULT_INVITATION_SLOTS.find((candidate) => !used.has(candidate)) ?? preferred
        : preferred;
      used.add(slot);
      return slot;
    });
  });
  const [inviteCrops] = useState<CropRect[]>(() => cropArrayFromJson(party.invitation_photo_crops, party.invitation_photo_urls.length));
  const [inviteCaptions, setInviteCaptions] = useState<string[]>(() => photoCaptionArrayFromJson(party.invitation_photo_crops, party.invitation_photo_urls.length));
  const [date, setDate] = useState(party.date);
  const [time, setTime] = useState(party.time);
  const [timezone, setTimezone] = useState(normalizeTimezone(party.timezone || DEFAULT_TIMEZONE));
  const [durationMinutes, setDurationMinutes] = useState(party.duration_minutes);
  const displayedCover = coverUploadPreview || heroImage;
  const selectedTheme = useMemo(() => PARTY_THEMES.find((item) => item.key === scheme) ?? PARTY_THEMES[0], [scheme]);
  const durationChoices = useMemo(() => partyDurationOptions(durationMinutes), [durationMinutes]);
  const endsAround = useMemo(() => formatPartyEndClock(date, time, durationMinutes, timezone), [date, time, durationMinutes, timezone]);
  const existingPartyPhotos = useMemo(
    () => Array.from(new Set([party.hero_image, ...party.invitation_photo_urls].filter((value): value is string => Boolean(value)))),
    [party.hero_image, party.invitation_photo_urls],
  );

  const setInvitePosition = (index: number, slot: InvitationPhotoSlot) => {
    setInvitePositions((current) => {
      const next = [...current];
      const previous = next[index];
      const occupiedIndex = next.findIndex((value, candidateIndex) => candidateIndex !== index && value === slot);
      next[index] = slot;
      if (occupiedIndex >= 0 && previous) next[occupiedIndex] = previous;
      return next;
    });
  };

  return (
    <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pb-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Party controls</p>
          <h2 className="mt-2 font-editorial text-5xl font-semibold">Party Settings</h2>
        </div>
        <Link href={`/app/parties/${party.id}/invitation`} className="btn-secondary">
          <ExternalLink size={15} /> Invitation editor
        </Link>
      </section>

      {message ? <div className="rounded-[2px] border border-olive/25 bg-olive/8 p-4 text-sm font-semibold text-olive">{message}</div> : null}
      {error ? <div className="rounded-[2px] border border-tomato/25 bg-tomato/5 p-4 text-sm font-semibold text-tomato">{error}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            formData.set("hero_image", heroImage);
            formData.set("cover_position", coverPosition);
            formData.set("cover_crop", JSON.stringify(coverCrop));
            formData.set("color_scheme", scheme);
            formData.set("duration_minutes", String(durationMinutes));
            formData.delete("invitation_photo_positions");
            invitePositions.forEach(value=>formData.append("invitation_photo_positions",value));
            formData.set("invitation_photo_crops", JSON.stringify(cropArrayWithCaptions(inviteCrops, inviteCaptions)));
            setMessage(null);
            setError(null);
            startTransition(async () => {
              try {
                const cover = formData.get("cover_photo");
                if (cover instanceof File && cover.size > 0) {
                  formData.set("cover_photo", await compressImageForUpload(cover));
                }
                const result = await updatePartySettings(party.id, formData);
                if (result?.error) return setError(result.error);
                setMessage("Changes saved.");
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Could not save changes.");
              }
            });
          }}
        >
          <article className="card p-6">
            <p className="eyebrow">Event details</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Party name</span><input className="field" name="name" defaultValue={party.name} required /></label>
              <label><span className="mb-2 block text-xs font-semibold">Date</span><input className="field" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label><span className="mb-2 block text-xs font-semibold">Start time</span><input className="field" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
              <TimezoneSelect name="timezone" value={timezone} onChange={setTimezone} />
              <label>
                <span className="mb-2 block text-xs font-semibold">Duration</span>
                <select className="field" name="duration_minutes" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>
                  {durationChoices.map((option) => <option key={option.minutes} value={option.minutes}>{option.label}</option>)}
                </select>
              </label>
              <div><span className="mb-2 block text-xs font-semibold">Ends around</span><div className="field flex items-center text-ink/70">{endsAround}</div></div>
              <label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Location</span><input className="field" name="location" defaultValue={party.location ?? ""} /></label>
              <label><span className="mb-2 block text-xs font-semibold">Prep starts</span><input className="field" name="prep_date" type="date" defaultValue={party.prep_date} /></label>
              <label><span className="mb-2 block text-xs font-semibold">Party servings</span><input className="field" name="planning_guest_count" type="number" min={1} defaultValue={party.planning_guest_count} required /></label>
            </div>
          </article>

          <article className="card overflow-hidden">
            <div className="relative h-72 bg-ink/10">
              <CroppedImage src={displayedCover} alt="Party cover preview" crop={coverCrop} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
              <p className="absolute bottom-5 left-5 font-editorial text-4xl font-semibold text-white drop-shadow">{party.name}</p>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <p className="eyebrow">Cover photo</p>
                <p className="mt-1 text-xs text-ink/45">Upload a new image, choose an existing Plated image, and crop it directly.</p>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-ink/25 px-4 py-4 text-xs font-bold uppercase tracking-[0.1em] transition hover:border-tomato hover:text-tomato">
                <ImageIcon size={16} /> Upload cover photo
                <input type="file" name="cover_photo" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (coverUploadPreview) URL.revokeObjectURL(coverUploadPreview); setCoverUploadPreview(file ? URL.createObjectURL(file) : null); if (file) setCoverCrop(normalizeCrop(null)); }} />
              </label>
              {existingPartyPhotos.length ? (
                <div>
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ink/45">Party photos</p>
                  <div className="grid grid-cols-5 gap-2">
                    {existingPartyPhotos.map((photo) => <button key={photo} type="button" onClick={() => { setHeroImage(photo); if (coverUploadPreview) URL.revokeObjectURL(coverUploadPreview); setCoverUploadPreview(null); setCoverCrop(normalizeCrop(null)); }} className={`overflow-hidden border-2 ${heroImage === photo ? "border-tomato" : "border-transparent"}`}><img src={photo} alt="" className="aspect-square w-full object-cover" /></button>)}
                  </div>
                </div>
              ) : null}
              <details>
                <summary className="cursor-pointer text-[9px] font-bold uppercase tracking-widest text-ink/45 hover:text-tomato">Plated photo library</summary>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {STOCK_PHOTOS.map((photo) => <button key={photo} type="button" onClick={() => { setHeroImage(photo); if (coverUploadPreview) URL.revokeObjectURL(coverUploadPreview); setCoverUploadPreview(null); setCoverCrop(normalizeCrop(null)); }} className={`overflow-hidden border-2 ${heroImage === photo ? "border-tomato" : "border-transparent"}`}><img src={photo} alt="" className="aspect-square w-full object-cover" /></button>)}
                </div>
              </details>
<button type="button" className="btn-secondary w-full" onClick={() => setCropOpen(true)}><Crop size={15}/> Crop cover photo</button>
            </div>
          </article>

          <article className="card p-6">
            <p className="eyebrow">Color scheme</p>
            <p className="mt-2 text-sm text-ink/50">The selected palette transitions across the entire Plated app shell while this party is active, plus the invitation.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {PARTY_THEMES.map((theme) => (
                <button key={theme.key} type="button" onClick={() => setScheme(theme.key)} className={`group border p-3 text-left transition hover:-translate-y-1 hover:shadow-card ${scheme === theme.key ? "border-ink" : "border-ink/12"}`} style={{ background: theme.paper }}>
                  <div className="flex gap-1">{[theme.primary, theme.secondary, theme.olive, theme.blush, theme.gold].map((color) => <span key={color} className="h-5 flex-1" style={{ background: color }} />)}</div>
                  <p className="mt-2 text-xs font-bold" style={{ color: theme.ink }}>{theme.name}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-[2px] border p-4" style={{ background: selectedTheme.paper, color: selectedTheme.ink, borderColor: selectedTheme.primary }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: selectedTheme.primary }}>Live palette</span>
              <p className="mt-1 font-editorial text-2xl font-semibold">{party.name}</p>
            </div>
          </article>


          {party.invitation_photo_urls.length ? <article className="card p-6"><p className="eyebrow">Invitation photo placement</p><h3 className="mt-2 font-editorial text-3xl font-semibold">Place each photo exactly where you want it.</h3><p className="mt-2 text-sm text-ink/50">A single Overview photo stays full-size. Add Overview · right for a stacked Polaroid collage. Menu keeps left/right positions, and RSVP has one bottom slot.</p><div className="mt-5 space-y-3">{party.invitation_photo_urls.map((photo,index)=><div key={`${photo}-${index}`} className="grid grid-cols-[64px_1fr] gap-3 border border-ink/10 p-2"><img src={photo} alt="" className="h-16 w-16 object-cover"/><div className="space-y-2"><select className="field !py-2 text-xs" value={invitePositions[index]} onChange={e=>setInvitePosition(index, e.target.value as InvitationPhotoSlot)}>{INVITATION_PHOTO_SLOTS.map((slot)=><option key={slot.value} value={slot.value}>{slot.label}</option>)}</select><input className="field !py-2 font-handwritten text-xs" value={inviteCaptions[index] || ""} maxLength={120} placeholder="Polaroid caption" onChange={e=>setInviteCaptions(cur=>cur.map((v,i)=>i===index?e.target.value:v))}/></div></div>)}</div></article> : null}

          <article className="card p-6">
            <p className="eyebrow">Theme and invite details</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label><span className="mb-2 block text-xs font-semibold">Theme / vibe</span><input className="field" name="theme" defaultValue={party.theme ?? ""} /></label>
              <label><span className="mb-2 block text-xs font-semibold">Cuisine</span><input className="field" name="cuisine" defaultValue={party.cuisine ?? ""} /></label>
              <label><span className="mb-2 block text-xs font-semibold">Service style</span><input className="field" name="service_style" defaultValue={party.service_style ?? ""} /></label>
              <label><span className="mb-2 block text-xs font-semibold">Dress code</span><input className="field" name="dress_code" defaultValue={party.dress_code ?? ""} placeholder="Come as you are" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">What to bring</span><textarea className="field min-h-24" name="guest_contribution_notes" defaultValue={party.guest_contribution_notes ?? ""} placeholder="A bottle, a side, or just yourself" /></label>
            </div>
          </article>
          <button type="submit" className="btn-primary" disabled={pending}><Save size={16} /> {pending ? "Saving…" : "Save changes"}</button>
        </form>

        <aside className="space-y-4">
          <article className="card p-5"><p className="eyebrow">Party actions</p><div className="mt-5 space-y-2"><button type="button" className="btn-secondary w-full justify-start" disabled={pending} onClick={() => startTransition(async () => { const result = await duplicateParty(party.id); if (result?.error) setError(result.error); })}><Copy size={16} /> Duplicate party</button><button type="button" className="btn-secondary w-full justify-start" disabled={pending} onClick={() => { if (!window.confirm("Archive this party? It will remain in your account but be marked cancelled.")) return; startTransition(async () => { const result = await archiveParty(party.id); if (result?.error) setError(result.error); else window.location.reload(); }); }}><Archive size={16} /> Archive party</button></div></article>
          <article className="rounded-[2px] border border-tomato/25 bg-tomato/5 p-5"><p className="font-editorial text-2xl font-semibold text-tomato">Danger zone</p><p className="mt-2 text-xs leading-relaxed text-ink/50">Deleting a party will remove guests, assignments, receipts, and party-specific recipe edits.</p><button type="button" disabled={deleting} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-tomato" onClick={() => { if (!window.confirm("Delete this party permanently?")) return; startDelete(async () => { const result = await deleteParty(party.id); if (result?.error) setError(result.error); }); }}><Trash2 size={15} /> {deleting ? "Deleting…" : "Delete party"}</button></article>
        </aside>
      </section>
      <CropEditor
        open={cropOpen}
        src={displayedCover}
        value={coverCrop}
        title="Crop party cover"
        onCancel={() => setCropOpen(false)}
        onSave={(crop) => { setCoverCrop(normalizeCrop(crop)); setCropOpen(false); }}
      />
    </div>
  );
}
