"use client";

import { CropEditor } from "@/components/media/crop-editor";
import { CroppedImage } from "@/components/media/cropped-image";
import { createParty } from "@/lib/actions/parties";
import { DEFAULT_CROP, normalizeCrop, type CropRect } from "@/lib/media/crop";
import { DEFAULT_PARTY_DURATION_MINUTES, formatPartyEndClock, PARTY_DURATION_OPTIONS } from "@/lib/party/duration";
import { PARTY_THEMES } from "@/lib/party/themes";
import { ArrowLeft, ArrowRight, Check, Crop, ImageIcon, MapPin, Users, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

const steps = ["Basics", "Cover", "Theme", "Finish"];
const structures = ["Family style", "Buffet", "Plated courses", "Cocktail party", "Potluck", "Tasting menu"];
const STOCK_PHOTOS = Array.from({ length: 10 }, (_, i) => `/photos/party-${String(i + 1).padStart(2, "0")}.webp`);

export default function NewPartyPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("The Last Light Supper");
  const [date, setDate] = useState("2026-08-22");
  const [time, setTime] = useState("18:30");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_PARTY_DURATION_MINUTES);
  const [location, setLocation] = useState("Providence, RI");
  const [guestCount, setGuestCount] = useState(12);
  const [prepLeadDays, setPrepLeadDays] = useState(14);
  const [theme, setTheme] = useState("Late-summer garden party");
  const [cuisine, setCuisine] = useState("Mediterranean-inspired");
  const [structure, setStructure] = useState("Family style");
  const [dressCode, setDressCode] = useState("");
  const [bring, setBring] = useState("");
  const [heroImage, setHeroImage] = useState(STOCK_PHOTOS[0]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverPosition] = useState("50% 50%");
  const [coverCrop, setCoverCrop] = useState<CropRect>({ ...DEFAULT_CROP });
  const [cropOpen, setCropOpen] = useState(false);
  const [scheme, setScheme] = useState(PARTY_THEMES[0].key);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selectedTheme = useMemo(() => PARTY_THEMES.find((item) => item.key === scheme) ?? PARTY_THEMES[0], [scheme]);
  const displayedCover = coverPreview || heroImage;
  const endsAround = useMemo(() => formatPartyEndClock(date, time, durationMinutes), [date, time, durationMinutes]);

  const submit = () => {
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("date", date);
    formData.set("time", time);
    formData.set("duration_minutes", String(durationMinutes));
    formData.set("location", location);
    formData.set("theme", theme);
    formData.set("cuisine", cuisine);
    formData.set("service_style", structure);
    formData.set("dress_code", dressCode);
    formData.set("guest_contribution_notes", bring);
    formData.set("guest_count", String(guestCount));
    formData.set("prep_lead_days", String(prepLeadDays));
    formData.set("hero_image", heroImage);
    formData.set("cover_position", coverPosition);
    formData.set("cover_crop", JSON.stringify(coverCrop));
    formData.set("color_scheme", scheme);
    if (coverFile) formData.set("cover_photo", coverFile);
    startTransition(async () => {
      const result = await createParty(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="paper-noise flex h-[calc(100dvh-62px-76px)] flex-col overflow-hidden bg-paper p-3 md:p-5 lg:h-dvh lg:p-6 xl:p-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
        <Link href="/app" className="editorial-link shrink-0 text-ink/45 hover:text-tomato"><ArrowLeft size={13} /> Dashboard</Link>
        <div className="mt-3 grid min-h-0 flex-1 overflow-hidden border border-ink/15 bg-[#faf7ef] lg:grid-cols-[250px_1fr]">
          <aside className="hidden min-h-0 flex-col border-r border-ink/15 bg-[#ebe4d8] lg:flex">
            <div className="p-6"><p className="font-handwritten text-xl text-tomato">A new table begins here.</p><h1 className="mt-2 font-editorial text-4xl font-semibold leading-[0.9]">Create a dinner party.</h1></div>
            <div className="mx-6 border-t border-ink/20">{steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={`grid w-full grid-cols-[30px_1fr_auto] items-center gap-2 border-b border-ink/20 py-3 text-left ${step === index ? "text-tomato" : index < step ? "text-ink" : "text-ink/38"}`}><span className="font-editorial text-2xl">0{index + 1}</span><span className="text-[10px] font-bold uppercase tracking-[0.13em]">{label}</span>{index < step ? <Check size={13} /> : null}</button>)}</div>
            <div className="m-6 mt-auto overflow-hidden"><CroppedImage src={displayedCover} alt="" crop={coverCrop} className="h-40 w-full" /></div>
          </aside>

          <section className="flex min-h-0 flex-col p-5 md:p-7 xl:p-8">
            {error ? <div className="mb-3 rounded-[2px] border border-tomato/25 bg-tomato/5 px-3 py-2 text-sm font-semibold text-tomato">{error}</div> : null}
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {step === 0 ? <div><p className="eyebrow">Step one</p><h2 className="mt-2 font-editorial text-4xl font-semibold text-tomato">Set the table.</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Party name</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Date</span><input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
                <label><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Dinner time</span><input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
                <label><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Duration</span><select className="field" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>{PARTY_DURATION_OPTIONS.map((option) => <option key={option.minutes} value={option.minutes}>{option.label}</option>)}</select></label>
                <div><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Ends around</span><div className="field flex items-center text-ink/70">{endsAround}</div></div>
                <label className="sm:col-span-2"><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Location</span><div className="relative"><MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" /><input className="field pl-10" value={location} onChange={(e) => setLocation(e.target.value)} /></div></label>
                <label><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Guest count</span><input className="field" type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} /></label>
                <label><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Prep starts</span><select className="field" value={prepLeadDays} onChange={(e) => setPrepLeadDays(Number(e.target.value))}><option value={21}>3 weeks before</option><option value={14}>2 weeks before</option><option value={7}>1 week before</option><option value={3}>3 days before</option><option value={0}>Day of</option></select></label>
              </div></div> : null}

              {step === 1 ? <div><p className="eyebrow">Step two</p><h2 className="mt-2 font-editorial text-4xl font-semibold text-tomato">Choose the cover.</h2><p className="mt-3 text-sm text-ink/50">This image becomes the party cover and the default first invitation photo.</p>
                <div className="mt-5 overflow-hidden border border-ink/15"><div className="relative h-[min(40vh,360px)]"><CroppedImage src={displayedCover} alt="Cover preview" crop={coverCrop} className="h-full w-full" /><div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" /><p className="absolute bottom-5 left-5 font-editorial text-4xl font-semibold text-white drop-shadow">{name}</p></div></div>
                <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-ink/25 px-4 py-4 text-xs font-bold uppercase tracking-widest hover:border-tomato hover:text-tomato"><ImageIcon size={16}/> Upload from device<input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file=e.target.files?.[0] ?? null; setCoverFile(file); if (coverPreview) URL.revokeObjectURL(coverPreview); setCoverPreview(file ? URL.createObjectURL(file) : null); setCoverCrop({ ...DEFAULT_CROP }); }} /></label>
                <div className="mt-4 grid grid-cols-5 gap-2">{STOCK_PHOTOS.map((photo) => <button type="button" key={photo} onClick={() => { setHeroImage(photo); setCoverFile(null); if (coverPreview) URL.revokeObjectURL(coverPreview); setCoverPreview(null); setCoverCrop({ ...DEFAULT_CROP }); }} className={`overflow-hidden border-2 ${!coverPreview && heroImage === photo ? "border-tomato" : "border-transparent"}`}><img src={photo} alt="" className="aspect-square w-full object-cover" /></button>)}</div>
                <button type="button" onClick={() => setCropOpen(true)} className="btn-secondary mt-4 w-full"><Crop size={15}/> Crop cover photo</button>
              </div> : null}

              {step === 2 ? <div><p className="eyebrow">Step three</p><h2 className="mt-2 font-editorial text-4xl font-semibold text-tomato">Give the night its palette.</h2><p className="mt-3 max-w-xl text-sm text-ink/50">The palette transitions across the entire Plated app shell while this party is active, and returns smoothly to the default theme when you leave it.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{PARTY_THEMES.map((item) => <button key={item.key} type="button" onClick={() => setScheme(item.key)} className={`border p-3 text-left transition hover:-translate-y-1 hover:shadow-card ${scheme === item.key ? "border-ink" : "border-ink/12"}`} style={{ background: item.paper }}><div className="flex gap-1">{[item.primary,item.secondary,item.olive,item.blush,item.gold].map((c)=><span key={c} className="h-6 flex-1" style={{background:c}} />)}</div><p className="mt-2 text-xs font-bold" style={{color:item.ink}}>{item.name}</p></button>)}</div>
                <div className="mt-6 border p-5" style={{background:selectedTheme.paper,color:selectedTheme.ink,borderColor:selectedTheme.primary}}><p className="text-[9px] font-bold uppercase tracking-widest" style={{color:selectedTheme.primary}}>Preview</p><h3 className="mt-1 font-editorial text-3xl font-semibold">{name}</h3><button type="button" className="mt-4 border px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{background:selectedTheme.primary,color:selectedTheme.paper,borderColor:selectedTheme.primary}}>RSVP</button></div>
              </div> : null}

              {step === 3 ? (
                <div>
                  <p className="eyebrow">Step four</p>
                  <h2 className="mt-2 font-editorial text-4xl font-semibold text-tomato">Finish the direction.</h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest">Theme / vibe</span><input className="field" value={theme} onChange={(e) => setTheme(e.target.value)} /></label>
                    <label><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest">Cuisine</span><input className="field" value={cuisine} onChange={(e) => setCuisine(e.target.value)} /></label>
                  </div>
                  <p className="mt-5 text-[9px] font-bold uppercase tracking-widest text-ink/45">Service style</p>
                  <div className="mt-2 grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-3">
                    {structures.map((item, index) => (
                      <button key={item} type="button" onClick={() => setStructure(item)} className={`border-b border-r border-ink/15 p-3 text-left ${structure === item ? "bg-ink text-paper" : "bg-[#f8f4ec] hover:bg-paper-2/55"}`}>
                        <div className="flex items-center justify-between"><span className="text-[8px] font-bold uppercase">0{index + 1}</span>{index === 0 ? <UtensilsCrossed size={13} /> : <Users size={13} />}</div>
                        <p className="mt-2 font-editorial text-lg font-semibold">{item}</p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-6 text-[9px] font-bold uppercase tracking-widest text-ink/45">For the guests</p>
                  <p className="mt-1 text-sm text-ink/50">These notes appear on the invitation.</p>
                  <div className="mt-4 grid gap-4">
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest">Dress code</span>
                      <input className="field" value={dressCode} onChange={(e) => setDressCode(e.target.value)} placeholder="Come as you are" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest">What to bring</span>
                      <textarea className="field min-h-24" value={bring} onChange={(e) => setBring(e.target.value)} placeholder="A bottle, a side, or just yourself" />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex shrink-0 items-center justify-between border-t border-ink/15 pt-4"><button type="button" className="btn-secondary" disabled={step===0||pending} onClick={()=>setStep(step-1)}><ArrowLeft size={13}/> Back</button><button type="button" className="btn-primary" disabled={pending} onClick={()=> step<steps.length-1 ? setStep(step+1) : submit()}>{step===steps.length-1 ? (pending?"Creating…":"Create party") : "Continue"}<ArrowRight size={13}/></button></div>
          </section>
        </div>
      </div>
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
