"use client";

import { formatIngredientLine, type BookPage } from "@/lib/recipes/paginate-book";
import { Maximize2 } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export const BookPageShell = forwardRef<HTMLDivElement, PageShellProps>(function BookPageShell(
  { children, className = "" },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`book-page relative h-full w-full overflow-hidden bg-[#f7f2e8] text-ink shadow-[inset_0_0_0_1px_rgba(41,35,31,0.09)] ${className}`}
    >
      {children}
    </div>
  );
});

function PageNumber({ n }: { n: number }) {
  return (
    <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 font-editorial text-[9px] text-ink/35">
      {n}
    </span>
  );
}

function WholeButton({ recipeId, onOpenWhole }: { recipeId: string; onOpenWhole?: (recipeId: string) => void }) {
  if (!onOpenWhole) return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenWhole(recipeId);
      }}
      className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-current/25 bg-paper/80 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-ink/65 backdrop-blur transition hover:-translate-y-0.5 hover:bg-paper hover:text-ink"
    >
      <Maximize2 size={10} /> Whole recipe
    </button>
  );
}

export const RecipeCoverPage = forwardRef<
  HTMLDivElement,
  {
    page: Extract<BookPage, { kind: "recipe-cover" }>;
    pageNumber: number;
    onOpenWhole?: (recipeId: string) => void;
  }
>(function RecipeCoverPage({ page, pageNumber, onOpenWhole }, ref) {
  const { recipe } = page;
  const textColor = recipe.cover_text_color || "#ffffff";
  return (
    <BookPageShell ref={ref} className="bg-ink">
      <img
        src={recipe.image_url || "/photos/party-04.webp"}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/15" />
      <div className="absolute inset-x-[8%] bottom-[9%]" style={{ color: textColor }}>
        {recipe.course ? (
          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.2em] opacity-80">{recipe.course}</p>
        ) : null}
        <h2 className="max-w-[90%] font-editorial text-[clamp(2rem,4.1vw,4.2rem)] font-semibold leading-[0.9] drop-shadow-sm">
          {recipe.title}
        </h2>
      </div>
      <span className="absolute bottom-2.5 left-4 text-[9px] font-semibold text-white/65">{pageNumber}</span>
      <WholeButton recipeId={recipe.id} onOpenWhole={onOpenWhole} />
    </BookPageShell>
  );
});

export const RecipeEditorialPage = forwardRef<
  HTMLDivElement,
  {
    page: Extract<BookPage, { kind: "recipe-main" }>;
    pageNumber: number;
    onOpenWhole?: (recipeId: string) => void;
  }
>(function RecipeEditorialPage({ page, pageNumber, onOpenWhole }, ref) {
  const { recipe } = page;
  const ingredients = [...recipe.ingredients].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  return (
    <BookPageShell ref={ref}>
      <div className="flex h-full flex-col px-[7%] pb-[7%] pt-[6%]">
        <div className="border-b border-ink/15 pb-[3%] text-center">
          <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-ink/45">{recipe.cuisine || recipe.course || "Plated recipe"}</p>
          <h2 className="mx-auto mt-1 max-w-[85%] font-editorial text-[clamp(1.3rem,2.2vw,2.35rem)] font-semibold leading-[1.02]">{recipe.title}</h2>
        </div>

        <div className="mt-[4%] grid min-h-0 flex-1 grid-cols-[0.78fr_1.48fr] gap-[6%] overflow-hidden">
          <aside className="min-h-0 border-r border-ink/10 pr-[8%] text-[clamp(6px,0.65vw,10px)] leading-[1.35]">
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 border-b border-ink/10 pb-3">
              <div>
                <p className="text-[0.72em] font-bold uppercase tracking-[0.14em] text-ink/45">Serves</p>
                <p className="mt-0.5 font-editorial text-[1.12em]">{recipe.servings ?? "—"}</p>
              </div>
              <div>
                <p className="text-[0.72em] font-bold uppercase tracking-[0.14em] text-ink/45">Time</p>
                <p className="mt-0.5 font-editorial text-[1.12em]">{totalTime ? `${totalTime} min` : "—"}</p>
              </div>
            </div>
            <p className="mt-3 text-[0.75em] font-bold uppercase tracking-[0.14em]">Ingredients</p>
            <ul className="mt-1.5 space-y-[0.28em] font-editorial">
              {ingredients.length ? ingredients.map((ingredient, index) => (
                <li key={`${ingredient.name}-${index}`}>{formatIngredientLine(ingredient)}</li>
              )) : <li className="text-ink/40">No ingredients yet.</li>}
            </ul>
          </aside>

          <main className="min-h-0 overflow-hidden text-[clamp(6px,0.67vw,10.5px)] leading-[1.48]">
            {recipe.description?.trim() ? (
              <p className="font-editorial text-[1.05em] leading-[1.5] text-ink/75">{recipe.description}</p>
            ) : null}
            <p className="mt-3 text-[0.76em] font-bold uppercase tracking-[0.16em]">Method</p>
            {page.stepLines.length ? (
              <ol className="mt-1.5 space-y-[0.7em] font-editorial">
                {page.stepLines.map((line, index) => (
                  <li key={`${page.stepOffset + index}-${line.slice(0, 18)}`}>
                    <span className="mr-1.5 font-sans text-[0.72em] font-bold text-ink/45">{page.stepOffset + index + 1}.</span>
                    {line}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 font-editorial text-ink/45">No method has been added yet.</p>
            )}
            {page.continuationCount ? (
              <p className="mt-3 border-t border-ink/10 pt-2 text-[0.72em] font-bold uppercase tracking-[0.12em] text-ink/35">
                Method continues →
              </p>
            ) : null}
          </main>
        </div>
      </div>
      <PageNumber n={pageNumber} />
      <WholeButton recipeId={recipe.id} onOpenWhole={onOpenWhole} />
    </BookPageShell>
  );
});

export const RecipeContinuationPage = forwardRef<
  HTMLDivElement,
  {
    page: Extract<BookPage, { kind: "recipe-continuation" }>;
    pageNumber: number;
    onOpenWhole?: (recipeId: string) => void;
  }
>(function RecipeContinuationPage({ page, pageNumber, onOpenWhole }, ref) {
  return (
    <BookPageShell ref={ref}>
      <div className="flex h-full flex-col px-[10%] pb-[8%] pt-[8%]">
        <div className="border-b border-ink/15 pb-3">
          <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-ink/45">Method · continued</p>
          <h2 className="mt-1 font-editorial text-[clamp(1.15rem,1.8vw,1.9rem)] font-semibold">{page.recipe.title}</h2>
        </div>
        <ol className="mt-[6%] space-y-[1.15em] overflow-hidden font-editorial text-[clamp(7px,0.78vw,12px)] leading-[1.55]">
          {page.stepLines.map((line, index) => (
            <li key={`${page.stepOffset + index}-${line.slice(0, 18)}`} className="grid grid-cols-[1.6em_1fr] gap-2">
              <span className="font-sans text-[0.72em] font-bold text-ink/40">{page.stepOffset + index + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="mt-auto pt-4 text-[7px] font-bold uppercase tracking-[0.16em] text-ink/35">
          {page.part} / {page.parts} continuation
        </p>
      </div>
      <PageNumber n={pageNumber} />
      <WholeButton recipeId={page.recipe.id} onOpenWhole={onOpenWhole} />
    </BookPageShell>
  );
});

export const BlankPage = forwardRef<HTMLDivElement, { pageNumber?: number }>(function BlankPage({ pageNumber }, ref) {
  return (
    <BookPageShell ref={ref} className="bg-[#f5efe4]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.65),transparent_45%)]" />
      {pageNumber ? <PageNumber n={pageNumber} /> : null}
    </BookPageShell>
  );
});
