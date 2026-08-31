"use client";

import {
  BlankPage,
  RecipeContinuationPage,
  RecipeCoverPage,
  RecipeEditorialPage,
} from "@/components/recipe/book-pages";
import {
  paginateCookbook,
  recipePageIndicesMap,
  recipeStartPageMap,
  type BookPage,
  type BookRecipe,
} from "@/lib/recipes/paginate-book";
import { ChevronLeft, ChevronRight, Clock3, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";

const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

type FlipApi = {
  pageFlip: () => {
    flipNext: (corner?: "top" | "bottom") => void;
    flipPrev: (corner?: "top" | "bottom") => void;
    turnToPage: (page: number) => void;
    getCurrentPageIndex: () => number;
  };
};

type FlipBookComponentProps = {
  width: number;
  height: number;
  size?: "fixed" | "stretch";
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  drawShadow?: boolean;
  flippingTime?: number;
  usePortrait?: boolean;
  startZIndex?: number;
  autoSize?: boolean;
  maxShadowOpacity?: number;
  showCover?: boolean;
  mobileScrollSupport?: boolean;
  clickEventForward?: boolean;
  useMouseEvents?: boolean;
  swipeDistance?: number;
  showPageCorners?: boolean;
  disableFlipByClick?: boolean;
  startPage?: number;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
  onFlip?: (event: { data: number }) => void;
  onInit?: (event: { data: { page: number } }) => void;
};

const FlipBook = HTMLFlipBook as unknown as ForwardRefExoticComponent<
  FlipBookComponentProps & RefAttributes<FlipApi>
>;

const PAGE_STORAGE_KEY = "plated.cookbook.currentPage.v2";
const FLIP_MS = 300;

function renderPage(
  page: BookPage,
  index: number,
  onOpenWhole?: (recipeId: string) => void,
  keyPrefix = "book",
) {
  const key = `${keyPrefix}-${index}-${page.kind}`;
  if (page.kind === "recipe-cover") {
    return <RecipeCoverPage key={key} page={page} pageNumber={index + 1} onOpenWhole={onOpenWhole} />;
  }
  if (page.kind === "recipe-main") {
    return <RecipeEditorialPage key={key} page={page} pageNumber={index + 1} onOpenWhole={onOpenWhole} />;
  }
  if (page.kind === "recipe-continuation") {
    return <RecipeContinuationPage key={key} page={page} pageNumber={index + 1} onOpenWhole={onOpenWhole} />;
  }
  return <BlankPage key={key} pageNumber={index + 1} />;
}

export function CookbookBook({ recipes }: { recipes: BookRecipe[] }) {
  const pages = useMemo(() => paginateCookbook(recipes), [recipes]);
  const recipeStarts = useMemo(() => recipeStartPageMap(pages), [pages]);
  const recipePageIndices = useMemo(() => recipePageIndicesMap(pages), [pages]);
  const bookRef = useRef<FlipApi | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const journeyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journeyTargetRef = useRef<number | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [wholeRecipeId, setWholeRecipeId] = useState<string | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const availableWidth = Math.max(360, rect.width - 96);
      const availableHeight = Math.max(360, rect.height - 42);
      const byWidth = Math.floor(availableWidth / 2);
      const pageWidth = Math.max(170, Math.min(560, byWidth, Math.floor(availableHeight * 0.74)));
      const pageHeight = Math.max(300, Math.min(760, availableHeight, Math.floor(pageWidth / 0.74)));
      setSize((prev) => {
        if (prev && prev.width === pageWidth && prev.height === pageHeight) return prev;
        return { width: pageWidth, height: pageHeight };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (journeyTimerRef.current) clearTimeout(journeyTimerRef.current);
  }, []);

  const stopJourney = useCallback(() => {
    if (journeyTimerRef.current) clearTimeout(journeyTimerRef.current);
    journeyTimerRef.current = null;
    journeyTargetRef.current = null;
  }, []);

  const runJourneyStep = useCallback(function step() {
    const api = bookRef.current?.pageFlip?.();
    const target = journeyTargetRef.current;
    if (!api || target == null) return;
    const current = api.getCurrentPageIndex();
    if (current === target || Math.abs(current - target) <= 1) {
      api.turnToPage(target);
      setPageIndex(target);
      stopJourney();
      return;
    }
    if (target > current) api.flipNext("top");
    else api.flipPrev("top");
    journeyTimerRef.current = setTimeout(step, FLIP_MS + 55);
  }, [stopJourney]);

  const travelTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, pages.length - 1));
    stopJourney();
    journeyTargetRef.current = clamped % 2 === 0 ? clamped : clamped - 1;
    runJourneyStep();
  }, [pages.length, runJourneyStep, stopJourney]);

  const flipNext = useCallback(() => {
    stopJourney();
    bookRef.current?.pageFlip?.().flipNext("top");
  }, [stopJourney]);

  const flipPrev = useCallback(() => {
    stopJourney();
    bookRef.current?.pageFlip?.().flipPrev("top");
  }, [stopJourney]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
    searchInputRef.current?.blur();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (wholeRecipeId) {
          setWholeRecipeId(null);
          return;
        }
        if (searchOpen) {
          closeSearch();
          return;
        }
      }
      if (searchOpen || wholeRecipeId) return;
      if (event.key === "ArrowRight") flipNext();
      if (event.key === "ArrowLeft") flipPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSearch, flipNext, flipPrev, searchOpen, wholeRecipeId]);

  const filteredRecipes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((recipe) => !needle || recipe.title.toLowerCase().includes(needle));
  }, [query, recipes]);

  const fanPages = useMemo(() => {
    if (!wholeRecipeId) return [] as { page: BookPage; index: number }[];
    return (recipePageIndices.get(wholeRecipeId) ?? [])
      .map((index) => ({ page: pages[index], index }))
      .filter(({ page }) => page.kind !== "blank");
  }, [wholeRecipeId, recipePageIndices, pages]);

  function selectSearchRecipe(recipe: BookRecipe) {
    const target = recipeStarts.get(recipe.id);
    if (target == null) return;
    closeSearch();
    window.setTimeout(() => travelTo(target), 160);
  }

  return (
    <section ref={stageRef} className="relative h-full min-h-0 w-full overflow-hidden bg-[#ebe4d8]">
      <div className="absolute left-1/2 top-3 z-50 w-[min(520px,58vw)] -translate-x-1/2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            ref={searchInputRef}
            value={query}
            onFocus={() => {
              setWholeRecipeId(null);
              setSearchOpen(true);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setWholeRecipeId(null);
              setSearchOpen(true);
            }}
            placeholder="Search recipes"
            className="h-10 w-full rounded-full border border-ink/15 bg-paper/95 pl-10 pr-10 text-sm shadow-card outline-none backdrop-blur transition focus:border-ink/30"
          />
          {searchOpen ? (
            <button
              type="button"
              aria-label="Close recipe search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={closeSearch}
              className="absolute right-2 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-ink/40 hover:bg-ink/5 hover:text-ink"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={flipPrev}
        aria-label="Previous cookbook pages"
        className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-ink/15 bg-paper/90 shadow-card transition hover:-translate-y-[55%] hover:bg-paper"
      >
        <ChevronLeft size={21} />
      </button>
      <button
        type="button"
        onClick={flipNext}
        aria-label="Next cookbook pages"
        className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-ink/15 bg-paper/90 shadow-card transition hover:-translate-y-[55%] hover:bg-paper"
      >
        <ChevronRight size={21} />
      </button>

      <div className="absolute inset-0 flex items-center justify-center pt-7">
        {size ? (
          <div
            className={`relative transition-opacity duration-300 ${searchOpen || wholeRecipeId ? "opacity-20" : "opacity-100"}`}
            style={{ width: size.width * 2, height: size.height }}
          >
            <div className="pointer-events-none absolute -inset-x-3 bottom-[-12px] top-[16px] rounded-[8px] bg-[#5b3029] shadow-[0_28px_55px_rgba(41,35,31,.24)]" />
            <div className="pointer-events-none absolute left-1/2 top-0 z-[2] h-full w-[12px] -translate-x-1/2 bg-gradient-to-r from-black/10 via-white/25 to-black/10" />
            <FlipBook
              key={`${size.width}x${size.height}`}
              ref={bookRef}
              className="cookbook-flipbook"
              width={size.width}
              height={size.height}
              size="fixed"
              minWidth={size.width}
              maxWidth={size.width}
              minHeight={size.height}
              maxHeight={size.height}
              drawShadow
              flippingTime={FLIP_MS}
              usePortrait={false}
              autoSize={false}
              maxShadowOpacity={0.28}
              showCover={false}
              mobileScrollSupport={false}
              clickEventForward
              useMouseEvents
              swipeDistance={20}
              showPageCorners
              disableFlipByClick={false}
              startPage={pageIndex % 2 === 0 ? pageIndex : Math.max(0, pageIndex - 1)}
              onInit={(event) => {
                const initial = event.data.page ?? 0;
                setPageIndex(initial);
                if (restoredRef.current) return;
                restoredRef.current = true;
                const stored = Number(window.localStorage.getItem(PAGE_STORAGE_KEY));
                if (!Number.isFinite(stored)) return;
                const target = Math.max(0, Math.min(Math.round(stored), pages.length - 1));
                bookRef.current?.pageFlip?.().turnToPage(target % 2 === 0 ? target : target - 1);
              }}
              onFlip={(event) => {
                setPageIndex(event.data);
                window.localStorage.setItem(PAGE_STORAGE_KEY, String(event.data));
              }}
            >
              {pages.map((page, index) => renderPage(page, index, (recipeId) => setWholeRecipeId(recipeId)))}
            </FlipBook>
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-paper/80 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/40 backdrop-blur">
        {Math.floor(pageIndex / 2) + 1} / {Math.max(1, Math.ceil(pages.length / 2))}
      </div>

      <div
        className={`absolute inset-3 z-[25] flex flex-col overflow-hidden border border-ink/15 bg-paper/[0.97] shadow-[0_24px_70px_rgba(41,35,31,0.22)] backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(.2,.75,.25,1)] md:inset-5 ${
          searchOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-[0.985] opacity-0"
        }`}
        aria-hidden={!searchOpen}
      >
        <div className="flex items-end justify-between gap-4 border-b border-ink/10 px-5 pb-4 pt-14 md:px-7">
          <div>
            <p className="eyebrow">Recipe index</p>
            <p className="mt-1 font-editorial text-3xl font-semibold">{query ? `Results for “${query}”` : "Find a recipe"}</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/35">{filteredRecipes.length} shown</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {filteredRecipes.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => selectSearchRecipe(recipe)}
                  className="group overflow-hidden border border-ink/12 bg-paper-2 text-left transition duration-200 hover:-translate-y-1 hover:border-tomato/45 hover:shadow-[0_12px_26px_rgba(41,35,31,0.12)]"
                >
                  <div className="h-32 overflow-hidden bg-ink/10">
                    <img src={recipe.image_url || "/photos/party-04.webp"} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-tomato">{recipe.course || "Recipe"}</p>
                    <p className="mt-1 line-clamp-2 font-editorial text-xl font-semibold leading-tight">{recipe.title}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-ink/40"><Clock3 size={12}/>{(recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0)} min</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid h-full min-h-64 place-items-center text-center"><div><p className="font-editorial text-3xl font-semibold">No matching recipe.</p><p className="mt-2 text-sm text-ink/45">Try a different recipe name.</p></div></div>
          )}
        </div>
      </div>

      {size && wholeRecipeId && fanPages.length ? (
        <div className="absolute inset-0 z-40">
          <div className="absolute left-5 top-4 z-30 rounded-full border border-ink/12 bg-paper/92 px-3 py-1.5 shadow-card backdrop-blur">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">Whole recipe · scroll sideways</span>
          </div>
          <button
            type="button"
            onClick={() => setWholeRecipeId(null)}
            className="absolute right-5 top-4 z-30 grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-paper/95 shadow-card transition hover:-translate-y-0.5 hover:border-tomato hover:text-tomato"
            aria-label="Close whole recipe"
          >
            <X size={16}/>
          </button>
          <div className="h-full overflow-x-auto overflow-y-hidden px-8 [scrollbar-width:thin]">
            <div className="flex h-full w-max items-center gap-4 pr-10 pt-2">
              {fanPages.map(({ page, index }, fanIndex) => {
                const fanShift = -(fanIndex * Math.min(size.width * 0.86, 430));
                return (
                  <div
                    key={`fan-${index}`}
                    className="cookbook-fan-page shrink-0 overflow-hidden border border-black/15 bg-[#f7f2e8] shadow-[0_22px_48px_rgba(41,35,31,.22)]"
                    style={{
                      width: size.width,
                      height: size.height,
                      animationDelay: `${fanIndex * 80}ms`,
                      "--fan-shift": `${fanShift}px`,
                    } as CSSProperties}
                  >
                    <div className="pointer-events-none h-full w-full">{renderPage(page, index, undefined, `fan-${fanIndex}`)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
