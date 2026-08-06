"use client";

import { Modal } from "@/components/modal";
import { formatMinutes } from "@/lib/rsvp";
import { AlertTriangle, Clock3, FileImage, FileText, Link2, PencilLine, Plus, Search, Upload } from "lucide-react";
import { useMemo, useState } from "react";

export type PartyRecipeCard = {
  id: string;
  title: string;
  course: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  allergy_notes: string | null;
  servings: number;
};

export function RecipesGrid({ recipes }: { recipes: PartyRecipeCard[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("URL");
  const [imported, setImported] = useState(false);
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("All courses");

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesQuery = recipe.title.toLowerCase().includes(query.toLowerCase());
      const matchesCourse = course === "All courses" || recipe.course === course;
      return matchesQuery && matchesCourse;
    });
  }, [recipes, query, course]);

  const courses = Array.from(new Set(recipes.map((recipe) => recipe.course).filter(Boolean))) as string[];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Party recipes</p>
          <h2 className="mt-2 font-editorial text-5xl font-semibold">The working cookbook.</h2>
          <p className="mt-4 max-w-2xl text-sm text-ink/55">
            Edit the versions used for this party without changing your original saved recipes.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setImported(false);
            setOpen(true);
          }}
        >
          <Plus size={16} /> Import recipe
        </button>
      </section>
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-ink/10 bg-white/35 p-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            className="field pl-11"
            placeholder="Search party recipes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select className="field sm:w-44" value={course} onChange={(event) => setCourse(event.target.value)}>
          <option>All courses</option>
          {courses.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((recipe) => (
          <article key={recipe.id} className="card overflow-hidden">
            <div className="relative h-56 overflow-hidden bg-ink">
              <img src={recipe.image_url || "/photos/party-04.webp"} alt="" className="h-full w-full object-cover" />
              <div className="absolute left-4 top-4 flex gap-2">
                <span className="chip border-paper/20 bg-paper/90">{recipe.course || "Recipe"}</span>
                {recipe.allergy_notes ? (
                  <span className="chip border-tomato/20 bg-tomato text-paper">
                    <AlertTriangle size={12} /> allergy
                  </span>
                ) : null}
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-editorial text-3xl font-semibold leading-tight">{recipe.title}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip">
                  <Clock3 size={13} /> {formatMinutes(recipe.prep_minutes)} prep
                </span>
                <span className="chip">{formatMinutes(recipe.cook_minutes)} cook</span>
                <span className="chip">{recipe.servings} servings</span>
              </div>
              <div className="mt-5 flex gap-2">
                <button className="btn-secondary flex-1">
                  <PencilLine size={15} /> Edit
                </button>
                <button className="btn-secondary px-4">•••</button>
              </div>
            </div>
          </article>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="min-h-[390px] rounded-[1.75rem] border-2 border-dashed border-ink/15 p-8 text-ink/45 transition hover:border-tomato hover:bg-tomato/5 hover:text-tomato"
        >
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-current/10">
            <Plus size={23} />
          </span>
          <p className="mt-6 font-editorial text-2xl font-semibold">Add another recipe</p>
          <p className="mt-2 text-sm">URL, text, PDF, image, or manual entry</p>
        </button>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Import a recipe">
        {!imported ? (
          <>
            <div className="flex overflow-x-auto rounded-full border border-ink/15 bg-white/40 p-1">
              {["URL", "Text", "PDF / image", "Manual"].map((name) => (
                <button
                  key={name}
                  onClick={() => setTab(name)}
                  className={`min-w-max flex-1 rounded-full px-4 py-2 text-xs font-bold ${tab === name ? "bg-ink text-paper" : "text-ink/50"}`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="mt-6">
              {tab === "URL" ? (
                <div>
                  <div className="rounded-2xl bg-orange/8 p-4 text-sm text-ink/60">
                    <Link2 size={18} className="mb-3 text-orange" />
                    Paste a public recipe URL. plated. will extract ingredients, measurements, times, instructions, and
                    the original source.
                  </div>
                  <label className="mt-5 block">
                    <span className="mb-2 block text-xs font-semibold">Recipe URL</span>
                    <input className="field" placeholder="https://example.com/recipe" />
                  </label>
                </div>
              ) : null}
              {tab === "Text" ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold">Recipe text</span>
                  <textarea className="field min-h-52" placeholder="Paste the title, ingredients, and instructions here..." />
                </label>
              ) : null}
              {tab === "PDF / image" ? (
                <button className="flex min-h-64 w-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-ink/20 bg-white/30 p-6 text-center">
                  <Upload size={26} />
                  <p className="mt-4 font-editorial text-2xl font-semibold">Drop a PDF or photo here</p>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink/45">
                    The source file will be used for extraction and not retained in the production design.
                  </p>
                </button>
              ) : null}
              {tab === "Manual" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Recipe name</span>
                    <input className="field" placeholder="Dish name" />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-semibold">Servings</span>
                    <input className="field" type="number" defaultValue={4} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-semibold">Ingredients</span>
                    <textarea className="field min-h-32" placeholder="One ingredient per line" />
                  </label>
                </div>
              ) : null}
            </div>
            <button className="btn-primary mt-6 w-full" onClick={() => setImported(true)}>
              {tab === "URL" ? (
                <Link2 size={16} />
              ) : tab === "Text" ? (
                <FileText size={16} />
              ) : tab === "PDF / image" ? (
                <FileImage size={16} />
              ) : (
                <PencilLine size={16} />
              )}{" "}
              Extract recipe
            </button>
          </>
        ) : (
          <div>
            <div className="rounded-[1.5rem] bg-olive/10 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-olive">Mock extraction complete</p>
              <h3 className="mt-2 font-editorial text-3xl font-semibold">Imported recipe</h3>
              <p className="mt-2 text-sm text-ink/55">Review and save to the party cookbook.</p>
            </div>
            <button className="btn-primary mt-6 w-full" onClick={() => setOpen(false)}>
              Save to party cookbook
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
