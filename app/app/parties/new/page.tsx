"use client";

import { ArrowLeft, ArrowRight, Check, ChefHat, MapPin, Plus, Sparkles, Users, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const steps = ["Basics", "Direction", "Pantry", "People"];
const structures = ["Family style", "Buffet", "Plated courses", "Cocktail party", "Potluck", "Tasting menu"];
const pantry = ["Garlic", "Olive oil", "Butter", "Eggs", "Flour", "Lemons", "Fresh herbs", "Rice", "Pasta", "Canned tomatoes", "Soy sauce", "Wine"];

export default function NewPartyPage() {
  const [step, setStep] = useState(0);
  const [structure, setStructure] = useState("Family style");
  const [selectedPantry, setSelectedPantry] = useState<string[]>(["Garlic", "Olive oil", "Flour"]);
  const toggle = (item: string) => setSelectedPantry((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);

  return (
    <div className="paper-noise min-h-screen bg-paper p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/app" className="editorial-link text-ink/45 hover:text-tomato"><ArrowLeft size={13} /> Dashboard</Link>

        <div className="mt-6 grid border border-ink/15 bg-[#faf7ef] lg:grid-cols-[300px_1fr]">
          <aside className="border-b border-ink/15 bg-[#ebe4d8] p-7 lg:min-h-[720px] lg:border-b-0 lg:border-r lg:p-9">
            <p className="font-handwritten text-2xl text-tomato">A new table begins here.</p>
            <h1 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em]">Create a dinner party.</h1>

            <div className="mt-10 border-t border-ink/20">
              {steps.map((name, index) => (
                <button
                  key={name}
                  onClick={() => setStep(index)}
                  className={`grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-ink/20 py-4 text-left ${step === index ? "text-tomato" : index < step ? "text-ink" : "text-ink/38"}`}
                >
                  <span className="font-editorial text-2xl">0{index + 1}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.13em]">{name}</span>
                  {index < step ? <Check size={13} /> : null}
                </button>
              ))}
            </div>

            <div className="mt-10 hidden h-64 overflow-hidden lg:block">
              <img src="/photos/party-02.webp" alt="Candlelit dinner table" className="h-full w-full object-cover" />
            </div>
            <p className="mt-4 hidden font-handwritten text-xl text-ink/55 lg:block">The menu can change. The date just needs a place to start.</p>
          </aside>

          <section className="flex min-h-[720px] flex-col p-6 md:p-10 lg:p-12">
            {step === 0 ? (
              <div>
                <p className="eyebrow">Step one</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato">When and where are we eating?</h2>
                <div className="mt-9 grid gap-5 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Party name</span>
                    <input className="field" defaultValue="The Last Light Supper" />
                  </label>
                  <label>
                    <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Date</span>
                    <input className="field" type="date" defaultValue="2026-08-22" />
                  </label>
                  <label>
                    <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Start time</span>
                    <input className="field" type="time" defaultValue="18:30" />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Location</span>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30" />
                      <input className="field pl-11" defaultValue="Lukas' backyard · Providence, RI" />
                    </div>
                  </label>
                  <label>
                    <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Planning guest count</span>
                    <input className="field" type="number" defaultValue={12} />
                  </label>
                  <label>
                    <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Planning starts</span>
                    <select className="field"><option>2 weeks before</option><option>1 week before</option><option>3 days before</option><option>Today</option></select>
                  </label>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <p className="eyebrow">Step two</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato">Give the night a direction.</h2>
                <div className="mt-9 grid gap-5 sm:grid-cols-2">
                  <label><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Theme or vibe</span><input className="field" defaultValue="Late-summer garden party" /></label>
                  <label><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Cuisine</span><input className="field" defaultValue="Mediterranean-inspired" /></label>
                  <label><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Courses</span><input className="field" type="number" defaultValue={4} /></label>
                  <label><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Known restrictions</span><input className="field" placeholder="Gluten, sesame, vegetarian..." /></label>
                </div>

                <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.15em] text-ink/45">Menu structure</p>
                <div className="mt-3 grid border-l border-t border-ink/15 sm:grid-cols-2 xl:grid-cols-3">
                  {structures.map((item, index) => (
                    <button
                      key={item}
                      onClick={() => setStructure(item)}
                      className={`border-b border-r border-ink/15 p-5 text-left ${structure === item ? "bg-ink text-paper" : "bg-[#f8f4ec] hover:bg-paper-2/55"}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-[0.12em]">0{index + 1}</span>
                        {index === 0 ? <UtensilsCrossed size={16} /> : index === 4 ? <Users size={16} /> : <ChefHat size={16} />}
                      </div>
                      <p className="mt-8 font-editorial text-2xl font-semibold leading-none">{item}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <p className="eyebrow">Step three</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato">What do you already have?</h2>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/55">Select likely ingredients now. After the menu is built, plated. will ask whether you have enough for the scaled recipes.</p>

                <div className="mt-9 grid border-l border-t border-ink/15 sm:grid-cols-2 md:grid-cols-3">
                  {pantry.map((item) => (
                    <button
                      key={item}
                      onClick={() => toggle(item)}
                      className={`flex items-center justify-between gap-3 border-b border-r border-ink/15 px-4 py-4 text-left text-xs font-semibold ${selectedPantry.includes(item) ? "bg-ink text-paper" : "bg-[#f8f4ec] hover:bg-paper-2/55"}`}
                    >
                      <span>{item}</span>
                      <span>{selectedPantry.includes(item) ? "✓" : "+"}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-8 border border-tomato/30 bg-[#f8f0e7] p-6">
                  <Sparkles size={17} className="text-tomato" />
                  <p className="mt-5 font-editorial text-3xl font-semibold leading-none">Pantry substitutions stay optional.</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink/55">The app never rewrites a recipe automatically. You request a substitution on a specific ingredient when you need one.</p>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <p className="eyebrow">Step four</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato">Who is helping make it happen?</h2>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/55">Add collaborators now or invite them later. Editors help plan; helpers receive kitchen tasks.</p>

                <div className="mt-9 border-t border-ink/20">
                  {[["Lukas Phimvongsa", "Owner", "Advanced · grilling, timing"], ["Maya Johnson", "Manager", "Intermediate · baking, prep"]].map(([name, role, skill], index) => (
                    <div key={name} className="grid gap-4 border-b border-ink/20 py-5 sm:grid-cols-[42px_1fr_auto] sm:items-center">
                      <div className={`grid h-10 w-10 place-items-center rounded-full text-[9px] font-bold ${index === 0 ? "bg-tomato text-paper" : "bg-olive text-paper"}`}>{name.split(" ").map((part) => part[0]).join("")}</div>
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="mt-1 text-xs text-ink/45">{skill}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">{role}</span>
                    </div>
                  ))}
                  <button className="flex w-full items-center justify-between border-b border-dashed border-ink/25 py-5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45 hover:text-tomato">
                    Add collaborator or helper <Plus size={15} />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-auto flex items-center justify-between border-t border-ink/15 pt-6">
              <button className="btn-secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}><ArrowLeft size={15} /> Back</button>
              <button className="btn-primary" onClick={() => step < 3 ? setStep(step + 1) : window.location.assign("/app/parties/summer-table")}>
                {step === 3 ? "Create party" : "Continue"} <ArrowRight size={15} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
