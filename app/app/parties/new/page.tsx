"use client";

import { createParty } from "@/lib/actions/parties";
import { ArrowLeft, ArrowRight, Check, ChefHat, MapPin, Plus, Users, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

const steps = ["Basics", "Direction", "Pantry", "People"];
const structures = ["Family style", "Buffet", "Plated courses", "Cocktail party", "Potluck", "Tasting menu"];
const pantry = [
  "Garlic",
  "Olive oil",
  "Butter",
  "Eggs",
  "Flour",
  "Lemons",
  "Fresh herbs",
  "Rice",
  "Pasta",
  "Canned tomatoes",
  "Soy sauce",
  "Wine",
];

export default function NewPartyPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("The Last Light Supper");
  const [date, setDate] = useState("2026-08-22");
  const [time, setTime] = useState("18:30");
  const [location, setLocation] = useState("Lukas' backyard · Providence, RI");
  const [guestCount, setGuestCount] = useState(12);
  const [prepLeadDays, setPrepLeadDays] = useState(14);
  const [theme, setTheme] = useState("Late-summer garden party");
  const [cuisine, setCuisine] = useState("Mediterranean-inspired");
  const [structure, setStructure] = useState("Family style");
  const [selectedPantry, setSelectedPantry] = useState<string[]>(["Garlic", "Olive oil", "Flour"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (item: string) =>
    setSelectedPantry((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );

  const submit = () => {
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("date", date);
    formData.set("time", time);
    formData.set("location", location);
    formData.set("theme", theme);
    formData.set("cuisine", cuisine);
    formData.set("service_style", structure);
    formData.set("guest_count", String(guestCount));
    formData.set("prep_lead_days", String(prepLeadDays));

    startTransition(async () => {
      const result = await createParty(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="paper-noise flex h-[calc(100dvh-62px-76px)] flex-col overflow-hidden bg-paper p-3 md:p-5 lg:h-dvh lg:p-6 xl:p-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col">
        <Link href="/app" className="editorial-link shrink-0 text-ink/45 hover:text-tomato">
          <ArrowLeft size={13} /> Dashboard
        </Link>

        <div className="mt-3 grid min-h-0 flex-1 overflow-hidden border border-ink/15 bg-[#faf7ef] lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr]">
          <aside className="hidden min-h-0 flex-col border-ink/15 bg-[#ebe4d8] lg:flex lg:h-full lg:border-r">
            <div className="p-5 xl:p-6">
              <p className="font-handwritten text-lg text-tomato xl:text-xl">A new table begins here.</p>
              <h1 className="mt-1.5 font-editorial text-3xl font-semibold leading-[0.9] tracking-[-0.04em] xl:text-4xl">
                Create a dinner party.
              </h1>
            </div>

            <div className="mx-5 border-t border-ink/20 xl:mx-6">
              {steps.map((stepName, index) => (
                <button
                  key={stepName}
                  onClick={() => setStep(index)}
                  className={`grid w-full grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-ink/20 py-2.5 text-left xl:py-3 ${step === index ? "text-tomato" : index < step ? "text-ink" : "text-ink/38"}`}
                >
                  <span className="font-editorial text-xl xl:text-2xl">0{index + 1}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.13em]">{stepName}</span>
                  {index < step ? <Check size={13} /> : null}
                </button>
              ))}
            </div>

            <div className="mt-auto flex min-h-0 flex-1 flex-col px-5 pb-5 pt-5 xl:px-6">
              <div className="min-h-0 flex-1 overflow-hidden">
                <img
                  src="/photos/party-02.webp"
                  alt="Candlelit dinner table"
                  className="h-full max-h-36 w-full object-cover xl:max-h-44"
                />
              </div>
              <p className="mt-3 shrink-0 font-handwritten text-base leading-tight text-ink/55 xl:text-lg">
                The menu can change. The date just needs a place to start.
              </p>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col p-4 md:p-6 lg:p-7 xl:p-8">
            {error ? (
              <div className="mb-3 shrink-0 rounded-[2px] border border-tomato/25 bg-tomato/5 px-3 py-2 text-sm font-semibold text-tomato">
                {error}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {step === 0 ? (
                <div>
                  <p className="eyebrow">Step one</p>
                  <h2 className="mt-2 font-editorial text-3xl font-semibold leading-[0.92] tracking-[-0.04em] text-tomato md:text-4xl">
                    When and where are we eating?
                  </h2>
                  <div className="mt-5 grid grid-cols-2 gap-3 xl:mt-6 xl:gap-4">
                    <label className="col-span-2">
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Party name</span>
                      <input className="field !py-2.5" name="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Date</span>
                      <input
                        className="field !py-2.5"
                        type="date"
                        name="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Start time</span>
                      <input
                        className="field !py-2.5"
                        type="time"
                        name="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </label>
                    <label className="col-span-2">
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Location</span>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
                        <input
                          className="field !py-2.5 pl-10"
                          name="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Guest count</span>
                      <input
                        className="field !py-2.5"
                        type="number"
                        name="guest_count"
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Prep starts</span>
                      <select
                        className="field !py-2.5"
                        name="prep_lead_days"
                        value={prepLeadDays}
                        onChange={(e) => setPrepLeadDays(Number(e.target.value))}
                      >
                        <option value={21}>3 weeks before</option>
                        <option value={14}>2 weeks before</option>
                        <option value={7}>1 week before</option>
                        <option value={3}>3 days before</option>
                        <option value={0}>Day of</option>
                      </select>
                      <span className="mt-1 block text-[10px] text-ink/45">
                        Where the party timeline begins.
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div>
                  <p className="eyebrow">Step two</p>
                  <h2 className="mt-2 font-editorial text-3xl font-semibold leading-[0.92] tracking-[-0.04em] text-tomato md:text-4xl">
                    Give the night a direction.
                  </h2>
                  <div className="mt-5 grid grid-cols-2 gap-3 xl:gap-4">
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Theme or vibe</span>
                      <input className="field !py-2.5" name="theme" value={theme} onChange={(e) => setTheme(e.target.value)} />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Cuisine</span>
                      <input
                        className="field !py-2.5"
                        name="cuisine"
                        value={cuisine}
                        onChange={(e) => setCuisine(e.target.value)}
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Courses</span>
                      <input className="field !py-2.5" type="number" defaultValue={4} />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em]">Restrictions</span>
                      <input className="field !py-2.5" placeholder="Gluten, sesame…" />
                    </label>
                  </div>

                  <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink/45">Menu structure</p>
                  <div className="mt-2 grid grid-cols-2 border-l border-t border-ink/15 xl:grid-cols-3">
                    {structures.map((item, index) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setStructure(item)}
                        className={`border-b border-r border-ink/15 p-2.5 text-left xl:p-3 ${structure === item ? "bg-ink text-paper" : "bg-[#f8f4ec] hover:bg-paper-2/55"}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em]">0{index + 1}</span>
                          {index === 0 ? (
                            <UtensilsCrossed size={13} />
                          ) : index === 4 ? (
                            <Users size={13} />
                          ) : (
                            <ChefHat size={13} />
                          )}
                        </div>
                        <p className="mt-1.5 font-editorial text-base font-semibold leading-none xl:text-lg">{item}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <p className="eyebrow">Step three</p>
                  <h2 className="mt-2 font-editorial text-3xl font-semibold leading-[0.92] tracking-[-0.04em] text-tomato md:text-4xl">
                    What do you already have?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/55">
                    Select likely ingredients now. After the menu is built, plated. will ask whether you have enough for
                    the scaled recipes.
                  </p>

                  <div className="mt-5 grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-3">
                    {pantry.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggle(item)}
                        className={`flex items-center justify-between gap-3 border-b border-r border-ink/15 px-3 py-2.5 text-left text-xs font-semibold ${selectedPantry.includes(item) ? "bg-ink text-paper" : "bg-[#f8f4ec] hover:bg-paper-2/55"}`}
                      >
                        <span>{item}</span>
                        <span>{selectedPantry.includes(item) ? "✓" : "+"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <p className="eyebrow">Step four</p>
                  <h2 className="mt-2 font-editorial text-3xl font-semibold leading-[0.92] tracking-[-0.04em] text-tomato md:text-4xl">
                    Who is helping make it happen?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/55">
                    Add collaborators now or invite them later. Editors help plan; helpers receive kitchen tasks.
                  </p>

                  <div className="mt-5 grid grid-cols-2 border-l border-t border-ink/15">
                    {[
                      ["You", "Owner", "You’ll be added as the party owner"],
                      ["Invite later", "Manager / Helper", "Collaborators can join after the party exists"],
                    ].map(([personName, role, skill], index) => (
                      <div
                        key={personName}
                        className="flex flex-col gap-2 border-b border-r border-ink/15 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4"
                      >
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[9px] font-bold ${index === 0 ? "bg-tomato text-paper" : "bg-olive text-paper"}`}
                        >
                          {personName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{personName}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-ink/45 sm:text-xs">{skill}</p>
                          <span className="mt-1.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">
                            {role}
                          </span>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="col-span-2 flex items-center justify-between border-b border-r border-dashed border-ink/25 px-3 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45 hover:text-tomato"
                    >
                      Add collaborator or helper <Plus size={15} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-between border-t border-ink/15 pt-2.5 lg:mt-4 lg:pt-4">
              <button
                type="button"
                className="btn-secondary !min-h-0 gap-1.5 !px-3 !py-1.5 text-[10px] tracking-[0.1em] lg:!min-h-11 lg:gap-2 lg:!px-5 lg:!py-2.5 lg:text-[12px]"
                disabled={step === 0 || pending}
                onClick={() => setStep(Math.max(0, step - 1))}
              >
                <ArrowLeft size={13} /> Back
              </button>
              <button
                type="button"
                className="btn-primary !min-h-0 gap-1.5 !px-3 !py-1.5 text-[10px] tracking-[0.1em] lg:!min-h-11 lg:gap-2 lg:!px-5 lg:!py-2.5 lg:text-[12px]"
                disabled={pending}
                onClick={() => (step < 3 ? setStep(step + 1) : submit())}
              >
                {step === 3 ? (pending ? "Creating…" : "Create party") : "Continue"} <ArrowRight size={13} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
