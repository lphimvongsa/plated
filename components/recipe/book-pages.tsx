"use client";

import {
  formatIngredientLine,
  STEPS_PER_PAGE,
  type BookPage,
} from "@/lib/recipes/paginate-book";
import { formatMinutes } from "@/lib/rsvp";
import Link from "next/link";
import { forwardRef, type ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  density?: "hard" | "soft";
  className?: string;
};

export const BookPageShell = forwardRef<HTMLDivElement, PageShellProps>(function BookPageShell(
  { children, density = "soft", className = "" },
  ref,
) {
  return (
    <div
      ref={ref}
      data-density={density}
      className={`book-page relative h-full w-full overflow-hidden bg-[#f7f2e8] text-ink shadow-[inset_0_0_0_1px_rgba(41,35,31,0.08)] ${className}`}
    >
      {children}
    </div>
  );
});

function PageNumber({ n }: { n: number }) {
  return (
    <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-editorial text-[11px] text-ink/35">
      {n}
    </span>
  );
}

export const CoverPage = forwardRef<HTMLDivElement, { recipeCount: number; pageNumber: number }>(
  function CoverPage({ recipeCount, pageNumber }, ref) {
    return (
      <BookPageShell ref={ref} density="hard" className="bg-[#2b241f] text-paper">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(200,68,50,0.35),transparent_55%),linear-gradient(160deg,#3a2f28,#1f1a16)]" />
        <div className="relative flex h-full flex-col justify-between p-7 md:p-9">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-paper/55">Plated</p>
            <h2 className="mt-4 font-editorial text-4xl font-semibold leading-[0.95] md:text-5xl">
              Your
              <br />
              cookbook
            </h2>
          </div>
          <div>
            <p className="font-handwritten text-2xl text-blush">Recipes worth inviting people over for.</p>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-paper/45">
              {recipeCount === 0
                ? "No recipes yet"
                : `${recipeCount} recipe${recipeCount === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <PageNumber n={pageNumber} />
      </BookPageShell>
    );
  },
);

export const TocPage = forwardRef<
  HTMLDivElement,
  {
    entries: { title: string; pageIndex: number; course: string | null }[];
    part: number;
    parts: number;
    pageNumber: number;
    onJump?: (pageIndex: number) => void;
  }
>(function TocPage({ entries, part, parts, pageNumber, onJump }, ref) {
  return (
    <BookPageShell ref={ref}>
      <div className="flex h-full flex-col p-6 md:p-8">
        <p className="eyebrow">Contents</p>
        <h2 className="mt-2 font-editorial text-3xl font-semibold">
          Table of recipes
          {parts > 1 ? (
            <span className="ml-2 text-base font-normal text-ink/40">
              {part}/{parts}
            </span>
          ) : null}
        </h2>
        {entries.length === 0 ? (
          <div className="mt-8 flex flex-1 flex-col justify-center">
            <p className="font-editorial text-2xl font-semibold">This book is waiting for its first recipe.</p>
            <p className="mt-3 text-sm text-ink/50">Import or write one, then flip through it here.</p>
            <Link href="/app/recipes/new" className="btn-primary mt-6 w-fit">
              Add recipe
            </Link>
          </div>
        ) : (
          <ol className="mt-6 flex-1 space-y-2.5 overflow-hidden">
            {entries.map((entry) => (
              <li key={`${entry.title}-${entry.pageIndex}`}>
                <button
                  type="button"
                  className="flex w-full items-baseline gap-2 text-left text-sm transition hover:text-tomato"
                  onClick={() => onJump?.(entry.pageIndex)}
                >
                  <span className="min-w-0 flex-1 truncate font-editorial text-lg font-semibold leading-tight">
                    {entry.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
                    {entry.course || "Recipe"}
                  </span>
                  <span className="shrink-0 font-editorial text-ink/40">{entry.pageIndex + 1}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <PageNumber n={pageNumber} />
    </BookPageShell>
  );
});

export const RecipeHeroPage = forwardRef<
  HTMLDivElement,
  { page: Extract<BookPage, { kind: "recipe-hero" }>; pageNumber: number }
>(function RecipeHeroPage({ page, pageNumber }, ref) {
  const { recipe } = page;
  return (
    <BookPageShell ref={ref}>
      <div className="flex h-full flex-col">
        <div className="relative h-[46%] min-h-[140px] overflow-hidden bg-ink">
          <img
            src={recipe.image_url || "/photos/party-04.webp"}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
          {recipe.import_status === "incomplete" ? (
            <span className="absolute left-3 top-3 chip border-orange/30 bg-orange/90 text-paper">Draft</span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-5 md:p-7">
          <p className="eyebrow">{recipe.course || "Recipe"}</p>
          <h2 className="mt-2 font-editorial text-3xl font-semibold leading-[1.05] md:text-4xl">
            {recipe.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/45">
            {recipe.cuisine ? <span>{recipe.cuisine}</span> : null}
            <span>
              {formatMinutes(recipe.prep_minutes)} prep · {formatMinutes(recipe.cook_minutes)} cook
            </span>
            {recipe.servings != null ? <span>Serves {recipe.servings}</span> : null}
            {recipe.difficulty ? <span>{recipe.difficulty}</span> : null}
          </div>
          {recipe.description ? (
            <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-ink/65">{recipe.description}</p>
          ) : (
            <p className="mt-4 font-handwritten text-xl text-ink/45">Turn the page for the recipe.</p>
          )}
          <div className="mt-auto pt-4">
            <Link href={`/app/recipes/${recipe.id}`} className="editorial-link text-tomato">
              Edit recipe
            </Link>
          </div>
        </div>
      </div>
      <PageNumber n={pageNumber} />
    </BookPageShell>
  );
});

export const RecipeBodyPage = forwardRef<
  HTMLDivElement,
  { page: Extract<BookPage, { kind: "recipe-body" }>; pageNumber: number }
>(function RecipeBodyPage({ page, pageNumber }, ref) {
  const { recipe, ingredients, stepLines, part, parts } = page;
  return (
    <BookPageShell ref={ref}>
      <div className="flex h-full flex-col p-5 md:p-7">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow truncate">{recipe.title}</p>
            <h2 className="mt-1 font-editorial text-2xl font-semibold">
              {ingredients.length > 0 && stepLines.length === 0
                ? "Ingredients"
                : ingredients.length === 0 && stepLines.length > 0
                  ? "Method"
                  : "Recipe"}
            </h2>
          </div>
          {parts > 1 ? (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">
              {part}/{parts}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid flex-1 gap-5 overflow-hidden">
          {ingredients.length > 0 ? (
            <div>
              {stepLines.length > 0 ? (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">
                  Ingredients
                </p>
              ) : null}
              <ul className="space-y-1.5 text-[13px] leading-snug text-ink/80">
                {ingredients.map((ingredient, index) => (
                  <li key={`${ingredient.name}-${index}`} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tomato/70" />
                    <span>{formatIngredientLine(ingredient)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {stepLines.length > 0 ? (
            <div>
              {ingredients.length > 0 ? (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">
                  Method
                </p>
              ) : null}
              <ol className="space-y-2 text-[13px] leading-snug text-ink/80">
                {stepLines.map((line, index) => (
                  <li key={`${index}-${line.slice(0, 24)}`} className="flex gap-2.5">
                    <span className="font-editorial text-base font-semibold text-tomato/80">
                      {(part - 1) * STEPS_PER_PAGE + index + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {ingredients.length === 0 && stepLines.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center">
              <p className="font-editorial text-2xl font-semibold">No ingredients or steps yet.</p>
              <Link href={`/app/recipes/${recipe.id}`} className="editorial-link mt-4 w-fit text-tomato">
                Finish this recipe
              </Link>
            </div>
          ) : null}
        </div>

        {recipe.notes && part === parts ? (
          <p className="mt-3 line-clamp-3 border-t border-ink/10 pt-3 text-xs italic text-ink/50">
            {recipe.notes}
          </p>
        ) : null}
      </div>
      <PageNumber n={pageNumber} />
    </BookPageShell>
  );
});

export const BlankPage = forwardRef<HTMLDivElement, { pageNumber: number }>(function BlankPage(
  { pageNumber },
  ref,
) {
  return (
    <BookPageShell ref={ref} density="hard">
      <div className="flex h-full items-center justify-center p-8">
        <p className="font-handwritten text-2xl text-ink/25">The end — for now.</p>
      </div>
      <PageNumber n={pageNumber} />
    </BookPageShell>
  );
});
