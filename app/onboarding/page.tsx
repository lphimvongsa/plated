"use client";

import { Brand } from "@/components/brand";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { pantryStaples } from "@/lib/mock-data";
import { AMERICAN_TIMEZONES, DEFAULT_TIMEZONE } from "@/lib/timezone";
import { ArrowLeft, ArrowRight, Check, ChefHat, Gauge, Ruler } from "lucide-react";
import { useState, useTransition } from "react";

const steps = ["Basics", "Kitchen", "Pantry"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [measurement, setMeasurement] = useState("US");
  const [skill, setSkill] = useState("Intermediate");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [selected, setSelected] = useState<string[]>(["Kosher salt", "Black pepper", "Olive oil", "Garlic"]);
  const [customStaple, setCustomStaple] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (item: string) =>
    setSelected((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        measurement,
        skill,
        timezone,
        pantry: selected,
      });
      if (result?.error) setError(result.error);
    });
  };

  return (
    <main className="paper-noise min-h-screen bg-paper px-4 py-5 md:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-ink/15 pb-4">
        <Brand compact />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink/42">Account setup</span>
      </header>

      <section className="mx-auto mt-8 max-w-6xl border border-ink/15 bg-[#faf7ef] md:mt-12">
        <div className="grid lg:grid-cols-[310px_1fr]">
          <aside className="border-b border-ink/15 bg-[#ebe4d8] p-7 lg:min-h-[680px] lg:border-b-0 lg:border-r lg:p-9">
            <p className="font-handwritten text-2xl text-tomato">Make plated. yours</p>
            <h1 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em]">A few details before the first party.</h1>

            <div className="mt-10 border-t border-ink/20">
              {steps.map((name, index) => (
                <button
                  key={name}
                  onClick={() => setStep(index)}
                  className={`grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-ink/20 py-4 text-left ${index === step ? "text-tomato" : index < step ? "text-ink" : "text-ink/38"}`}
                >
                  <span className="font-editorial text-2xl">0{index + 1}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.13em]">{name}</span>
                  {index < step ? <Check size={13} /> : null}
                </button>
              ))}
            </div>

            <div className="mt-10 hidden h-56 overflow-hidden lg:block">
              <img src="/photos/party-04.webp" alt="A table filled with food and candles" className="h-full w-full object-cover" />
            </div>
            <p className="mt-4 hidden font-handwritten text-xl text-ink/55 lg:block">You can change all of this later.</p>
          </aside>

          <div className="flex min-h-[620px] flex-col p-6 md:p-10 lg:p-12">
            {step === 0 ? (
              <div>
                <p className="eyebrow">Step one</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato">How should your kitchen think?</h2>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink/55">Choose the defaults used when recipes are imported and scaled.</p>

                <div className="mt-9 grid gap-4 sm:grid-cols-2">
                  {[
                    { id: "US", title: "US customary", copy: "cups, ounces, pounds, °F" },
                    { id: "Metric", title: "Metric", copy: "grams, milliliters, kilograms, °C" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMeasurement(item.id)}
                      className={`border p-6 text-left transition ${measurement === item.id ? "border-tomato bg-tomato/5" : "border-ink/18 bg-[#f8f4ec] hover:border-ink/40"}`}
                    >
                      <div className="flex items-start justify-between">
                        <Ruler className={measurement === item.id ? "text-tomato" : "text-ink/35"} size={19} />
                        <span className={`text-[8px] font-bold uppercase tracking-[0.12em] ${measurement === item.id ? "text-tomato" : "text-ink/30"}`}>
                          {measurement === item.id ? "Selected" : "Choose"}
                        </span>
                      </div>
                      <h3 className="mt-8 font-editorial text-3xl font-semibold leading-none">{item.title}</h3>
                      <p className="mt-3 text-xs text-ink/48">{item.copy}</p>
                    </button>
                  ))}
                </div>

                <label className="mt-7 block">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em]">Timezone</span>
                  <select className="field" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {AMERICAN_TIMEZONES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : step === 1 ? (
              <div>
                <p className="eyebrow">Step two</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato">How comfortable are you cooking?</h2>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink/55">This helps plated. suggest realistic assignments and timelines.</p>

                <div className="mt-9 border-t border-ink/20">
                  {["Beginner", "Intermediate", "Advanced"].map((level, index) => (
                    <button
                      key={level}
                      onClick={() => setSkill(level)}
                      className={`grid w-full gap-4 border-b border-ink/20 py-5 text-left sm:grid-cols-[44px_180px_1fr_auto] sm:items-center ${skill === level ? "text-tomato" : "text-ink"}`}
                    >
                      <span className="grid h-10 w-10 place-items-center border border-current">
                        {index === 0 ? <ChefHat size={18} /> : index === 1 ? <Gauge size={18} /> : <span className="font-editorial text-xl">++</span>}
                      </span>
                      <strong className="font-editorial text-2xl leading-none">{level}</strong>
                      <span className="text-xs leading-relaxed text-ink/48">
                        {index === 0
                          ? "I’m learning fundamentals and like clear steps."
                          : index === 1
                            ? "I’m comfortable with recipes and coordinating a few dishes."
                            : "I improvise, manage multiple techniques, and lead the kitchen."}
                      </span>
                      {skill === level ? <Check size={15} /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="eyebrow">Step three</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato">What’s usually in your pantry?</h2>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink/55">Pick stable staples. For each party, we’ll separately check volatile items like butter and produce.</p>

                <div className="mt-9 grid border-l border-t border-ink/15 sm:grid-cols-2 md:grid-cols-3">
                  {pantryStaples.map((item) => (
                    <button
                      key={item}
                      onClick={() => toggle(item)}
                      className={`flex items-center justify-between gap-3 border-b border-r border-ink/15 px-4 py-4 text-left text-xs font-semibold transition ${selected.includes(item) ? "bg-ink text-paper" : "bg-[#f8f4ec] hover:bg-paper-2/55"}`}
                    >
                      <span>{item}</span>
                      <span className="text-sm">{selected.includes(item) ? "✓" : "+"}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-7 flex gap-2">
                  <input
                    className="field"
                    placeholder="Add another staple"
                    value={customStaple}
                    onChange={(e) => setCustomStaple(e.target.value)}
                  />
                  <button
                    className="btn-secondary shrink-0"
                    type="button"
                    onClick={() => {
                      const value = customStaple.trim();
                      if (!value) return;
                      setSelected((current) => (current.includes(value) ? current : [...current, value]));
                      setCustomStaple("");
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {error ? <p className="mt-4 text-sm text-tomato">{error}</p> : null}

            <div className="mt-auto flex items-center justify-between border-t border-ink/15 pt-6">
              <button className="btn-secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || pending}>
                <ArrowLeft size={15} /> Back
              </button>
              <button
                className="btn-primary"
                disabled={pending}
                onClick={() => (step < 2 ? setStep(step + 1) : finish())}
              >
                {pending ? "Saving…" : step === 2 ? "Enter plated." : "Continue"} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
