"use client";

import { deleteRecipe } from "@/lib/actions/recipes";
import { formatMinutes } from "@/lib/rsvp";
import { AlertTriangle, Clock3, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type CookbookRecipeCard = {
  id: string;
  title: string;
  course: string | null;
  image_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  cuisine: string | null;
  import_status?: string | null;
};

export function CookbookRecipesSection({ recipes }: { recipes: CookbookRecipeCard[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All recipes");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startDelete] = useTransition();

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      const haystack = [recipe.title, recipe.course, recipe.cuisine].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesFilter =
        filter === "All recipes" ||
        (filter === "Incomplete" && recipe.import_status === "incomplete") ||
        (filter === "Recently added" && true);
      return matchesQuery && matchesFilter;
    });
  }, [recipes, query, filter]);

  function handleDelete(recipe: CookbookRecipeCard) {
    if (!window.confirm(`Delete “${recipe.title}”? This cannot be undone.`)) return;
    setError(null);
    setDeletingId(recipe.id);
    startDelete(async () => {
      const result = await deleteRecipe(recipe.id);
      setDeletingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section>
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-ink/10 bg-white/35 p-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            className="field pl-11"
            placeholder="Search recipes, cuisines, ingredients"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select className="field sm:w-44" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option>All recipes</option>
          <option>Recently added</option>
          <option>Incomplete</option>
        </select>
      </div>

      {error ? (
        <p className="mt-4 rounded-[2px] border border-tomato/25 bg-tomato/5 px-4 py-3 text-sm font-semibold text-tomato">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <article className="card mt-5 p-8 text-center">
          <p className="font-editorial text-3xl font-semibold">No recipes yet.</p>
          <p className="mt-3 text-sm text-ink/50">Add your first recipe to start building your cookbook.</p>
          <Link href="/app/recipes/new" className="btn-primary mt-6 inline-flex">
            Add recipe
          </Link>
        </article>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <article key={recipe.id} className="card relative overflow-hidden transition hover:border-tomato/40">
              <Link href={`/app/recipes/${recipe.id}`} className="block">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={recipe.image_url || "/photos/party-04.webp"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {recipe.import_status === "incomplete" ? (
                    <span className="absolute left-3 top-3 chip border-orange/30 bg-orange/90 text-paper">
                      <AlertTriangle size={12} /> Draft
                    </span>
                  ) : null}
                </div>
                <div className="p-5 pr-14">
                  <p className="eyebrow">{recipe.course || "Recipe"}</p>
                  <h3 className="mt-2 font-editorial text-2xl font-semibold leading-tight">{recipe.title}</h3>
                  <div className="mt-4 flex items-center gap-2 text-xs text-ink/45">
                    <Clock3 size={13} /> {formatMinutes(recipe.prep_minutes)} + {formatMinutes(recipe.cook_minutes)}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                disabled={deletingId === recipe.id}
                className="btn-icon absolute bottom-4 right-4 text-ink/35 hover:border-tomato hover:text-tomato"
                aria-label={`Delete ${recipe.title}`}
                title="Delete recipe"
                onClick={() => handleDelete(recipe)}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
