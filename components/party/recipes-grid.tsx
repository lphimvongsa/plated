"use client";

import { ImportRecipeModal } from "@/components/recipe/import-recipe-modal";
import { formatMinutes } from "@/lib/rsvp";
import {
  AlertTriangle,
  Clock3,
  PencilLine,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
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

export function RecipesGrid({ recipes, partyId }: { recipes: PartyRecipeCard[]; partyId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("All courses");

  const newRecipeHref = `/app/recipes/new?partyId=${partyId}`;

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
          <h2 className="font-editorial text-5xl font-semibold">Course Recipes</h2>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen(true)}
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
            <Link href={`/app/parties/${partyId}/recipes/${recipe.id}`} className="group block">
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
                <h3 className="font-editorial text-3xl font-semibold leading-tight transition-colors duration-200 group-hover:text-tomato">
                  {recipe.title}
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="chip">
                    <Clock3 size={13} /> {formatMinutes(recipe.prep_minutes)} prep
                  </span>
                  <span className="chip">{formatMinutes(recipe.cook_minutes)} cook</span>
                  <span className="chip">{recipe.servings} servings</span>
                </div>
              </div>
            </Link>
            <div className="border-t border-ink/8 px-5 pb-5">
              <Link href={`/app/parties/${partyId}/recipes/${recipe.id}`} className="btn-secondary mt-4 flex w-full">
                <PencilLine size={15} /> Edit
              </Link>
            </div>
          </article>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[390px] flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-ink/15 p-8 text-ink/45 transition hover:border-tomato hover:bg-tomato/5 hover:text-tomato"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-current/10">
            <Plus size={23} />
          </span>
          <p className="mt-6 font-editorial text-2xl font-semibold">Add another recipe</p>
          <p className="mt-2 text-sm">URL, text, PDF, or manual entry</p>
        </button>
      </section>

      <ImportRecipeModal open={open} onClose={() => setOpen(false)} newRecipeHref={newRecipeHref} />
    </div>
  );
}
