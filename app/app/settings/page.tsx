"use client";

import {
  DEFAULT_COOKBOOK_VIEW,
  getCookbookViewMode,
  setCookbookViewMode,
  type CookbookViewMode,
} from "@/lib/recipes/cookbook-view-preference";
import { signOut } from "@/lib/actions/auth";
import { Bell, BookOpen, ChefHat, LayoutGrid, LogOut, Ruler, Save, Shield, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const navItems = [
  [UserRound, "Profile"],
  [BookOpen, "Cookbook"],
  [Ruler, "Measurements"],
  [ChefHat, "Kitchen & pantry"],
  [Bell, "Notifications"],
  [Shield, "Privacy"],
] as const;

type Section = (typeof navItems)[number][1];

function isSection(value: string | null): value is Section {
  return navItems.some(([, label]) => label === value);
}

function AccountSettingsInner() {
  const searchParams = useSearchParams();
  const initialSection = searchParams.get("section");
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState<Section>(isSection(initialSection) ? initialSection : "Profile");
  const [cookbookView, setCookbookView] = useState<CookbookViewMode>(DEFAULT_COOKBOOK_VIEW);

  useEffect(() => {
    setCookbookView(getCookbookViewMode());
  }, []);

  useEffect(() => {
    const next = searchParams.get("section");
    if (isSection(next)) setSection(next);
  }, [searchParams]);

  function saveCookbookView(mode: CookbookViewMode) {
    setCookbookView(mode);
    setCookbookViewMode(mode);
    setSaved(true);
  }

  return (
    <div className="p-4 md:p-8 xl:p-12">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Account settings</p>
        <h1 className="mt-2 font-editorial text-5xl font-semibold md:text-6xl">Your kitchen defaults.</h1>
        <p className="mt-4 text-sm text-ink/55">
          Update your profile, cookbook layout, measurement system, pantry staples, and notifications.
        </p>

        {saved ? (
          <div className="mt-6 rounded-2xl border border-olive/25 bg-olive/8 p-4 text-sm font-semibold text-olive">
            Settings saved.
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="space-y-2">
            {navItems.map(([Icon, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setSection(label)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                  section === label ? "bg-ink text-paper" : "text-ink/55 hover:bg-white/40"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>

          <div className="space-y-6">
            {section === "Profile" ? (
              <article className="card p-6">
                <p className="eyebrow">Profile</p>
                <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-tomato font-editorial text-2xl font-semibold text-paper">
                    LP
                  </div>
                  <div>
                    <button type="button" className="btn-secondary">
                      Change photo
                    </button>
                    <p className="mt-2 text-xs text-ink/40">JPG, PNG, or WEBP.</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Name</span>
                    <input className="field" defaultValue="Lukas Phimvongsa" />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Email</span>
                    <input className="field" defaultValue="lukas@example.com" />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Skill level</span>
                    <select className="field" defaultValue="Intermediate">
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Default units</span>
                    <select className="field" defaultValue="US customary">
                      <option>US customary</option>
                      <option>Metric</option>
                    </select>
                  </label>
                </div>
                <button type="button" className="btn-primary mt-6" onClick={() => setSaved(true)}>
                  <Save size={16} /> Save settings
                </button>
              </article>
            ) : null}

            {section === "Cookbook" ? (
              <article className="card p-6">
                <p className="eyebrow">Cookbook</p>
                <h2 className="mt-2 font-editorial text-3xl font-semibold">How recipes appear</h2>
                <p className="mt-3 max-w-xl text-sm text-ink/55">
                  The flipbook is the default. Switch to the card grid anytime — your choice is saved on this
                  device.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => saveCookbookView("book")}
                    className={`rounded-[3px] border p-5 text-left transition ${
                      cookbookView === "book"
                        ? "border-tomato bg-tomato/5 shadow-[inset_0_0_0_1px_rgba(200,68,50,0.35)]"
                        : "border-ink/15 hover:border-tomato/40"
                    }`}
                  >
                    <BookOpen size={18} className={cookbookView === "book" ? "text-tomato" : "text-ink/45"} />
                    <p className="mt-3 font-editorial text-2xl font-semibold">Flipbook</p>
                    <p className="mt-2 text-sm text-ink/50">
                      Open-book spreads with page-turn animation. Default.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveCookbookView("grid")}
                    className={`rounded-[3px] border p-5 text-left transition ${
                      cookbookView === "grid"
                        ? "border-tomato bg-tomato/5 shadow-[inset_0_0_0_1px_rgba(200,68,50,0.35)]"
                        : "border-ink/15 hover:border-tomato/40"
                    }`}
                  >
                    <LayoutGrid size={18} className={cookbookView === "grid" ? "text-tomato" : "text-ink/45"} />
                    <p className="mt-3 font-editorial text-2xl font-semibold">Card grid</p>
                    <p className="mt-2 text-sm text-ink/50">
                      Searchable recipe cards — the classic cookbook browse layout.
                    </p>
                  </button>
                </div>
              </article>
            ) : null}

            {section !== "Profile" && section !== "Cookbook" ? (
              <article className="card p-6">
                <p className="eyebrow">{section}</p>
                <h2 className="mt-2 font-editorial text-3xl font-semibold">Coming soon</h2>
                <p className="mt-3 text-sm text-ink/55">
                  These preferences will plug into your account once the settings backend is wired up.
                </p>
              </article>
            ) : null}

            <article className="rounded-[1.75rem] border border-tomato/20 bg-tomato/5 p-6">
              <h2 className="font-editorial text-2xl font-semibold text-tomato">Account actions</h2>
              <form action={signOut}>
                <button type="submit" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-tomato">
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-8 xl:p-12">
          <p className="text-sm text-ink/45">Loading settings…</p>
        </div>
      }
    >
      <AccountSettingsInner />
    </Suspense>
  );
}
