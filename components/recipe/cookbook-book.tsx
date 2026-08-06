"use client";

import {
  BlankPage,
  CoverPage,
  RecipeBodyPage,
  RecipeHeroPage,
  TocPage,
} from "@/components/recipe/book-pages";
import { paginateCookbook, type BookRecipe } from "@/lib/recipes/paginate-book";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const HTMLFlipBook = dynamic(() => import("react-pageflip"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[420px] place-items-center rounded-[3px] border border-ink/10 bg-[#f8f4ec]">
      <p className="text-sm text-ink/45">Opening your cookbook…</p>
    </div>
  ),
});

type FlipApi = {
  pageFlip: () => {
    flipNext: (corner?: "top" | "bottom") => void;
    flipPrev: (corner?: "top" | "bottom") => void;
    flip: (page: number, corner?: "top" | "bottom") => void;
    turnToPage: (page: number) => void;
    getCurrentPageIndex: () => number;
    getPageCount: () => number;
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function CookbookBook({ recipes }: { recipes: BookRecipe[] }) {
  const pages = useMemo(() => paginateCookbook(recipes), [recipes]);
  const bookRef = useRef<FlipApi | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [dims, setDims] = useState({ width: 360, height: 500 });
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const measure = () => {
      const cw = el.clientWidth;
      const availableHeight = Math.max(360, Math.min(window.innerHeight - 210, 640));
      const narrow = cw < 700;
      const pageWidth = narrow
        ? Math.max(260, Math.min(cw - 16, 380))
        : Math.max(280, Math.min(Math.floor((cw - 40) / 2), 420));
      const pageHeight = Math.min(Math.round(pageWidth * 1.38), availableHeight);
      setDims({ width: pageWidth, height: pageHeight });
      setReady(true);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const pageCount = pages.length;
  const displayPage = Math.min(pageIndex + 1, pageCount);

  const goTo = useCallback(
    (index: number, animate: boolean) => {
      const api = bookRef.current?.pageFlip?.();
      if (!api) return;
      const clamped = Math.max(0, Math.min(index, pageCount - 1));
      if (!animate || reducedMotion) api.turnToPage(clamped);
      else api.flip(clamped, "top");
    },
    [pageCount, reducedMotion],
  );

  const flipNext = useCallback(() => {
    const api = bookRef.current?.pageFlip?.();
    if (!api) return;
    if (reducedMotion) api.turnToPage(Math.min(api.getCurrentPageIndex() + 1, pageCount - 1));
    else api.flipNext("top");
  }, [pageCount, reducedMotion]);

  const flipPrev = useCallback(() => {
    const api = bookRef.current?.pageFlip?.();
    if (!api) return;
    if (reducedMotion) api.turnToPage(Math.max(api.getCurrentPageIndex() - 1, 0));
    else api.flipPrev("top");
  }, [reducedMotion]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        flipNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        flipPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipNext, flipPrev]);

  return (
    <section className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Open book</p>
          <p className="mt-1 text-sm text-ink/50">
            Drag a corner, tap the edges, or use the arrows. Prefer cards? Switch in Settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-icon"
            aria-label="Previous page"
            onClick={flipPrev}
            disabled={pageIndex <= 0}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[5.5rem] text-center font-editorial text-lg tabular-nums text-ink/70">
            {displayPage} / {pageCount}
          </span>
          <button
            type="button"
            className="btn-icon"
            aria-label="Next page"
            onClick={flipNext}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative mx-auto flex min-h-[420px] w-full max-w-5xl items-center justify-center rounded-[3px] bg-[radial-gradient(ellipse_at_center,rgba(41,35,31,0.08),transparent_65%)] py-4"
      >
        {ready ? (
          <FlipBook
            key={`${dims.width}x${dims.height}-${pageCount}`}
            ref={bookRef}
            className="cookbook-flipbook"
            style={{ margin: "0 auto" }}
            width={dims.width}
            height={dims.height}
            size="fixed"
            minWidth={240}
            maxWidth={480}
            minHeight={320}
            maxHeight={680}
            showCover
            drawShadow
            maxShadowOpacity={0.45}
            flippingTime={reducedMotion ? 0 : 850}
            usePortrait
            autoSize
            mobileScrollSupport
            clickEventForward
            useMouseEvents
            showPageCorners
            startPage={0}
            startZIndex={1}
            swipeDistance={30}
            disableFlipByClick={false}
            onInit={(event) => setPageIndex(event.data.page)}
            onFlip={(event) => setPageIndex(event.data)}
          >
            {pages.map((page, index) => {
              const pageNumber = index + 1;
              if (page.kind === "cover") {
                return <CoverPage key={`cover-${index}`} recipeCount={page.recipeCount} pageNumber={pageNumber} />;
              }
              if (page.kind === "toc") {
                return (
                  <TocPage
                    key={`toc-${index}`}
                    entries={page.entries}
                    part={page.part}
                    parts={page.parts}
                    pageNumber={pageNumber}
                    onJump={(target) => goTo(target, !reducedMotion)}
                  />
                );
              }
              if (page.kind === "recipe-hero") {
                return <RecipeHeroPage key={`hero-${page.recipe.id}`} page={page} pageNumber={pageNumber} />;
              }
              if (page.kind === "recipe-body") {
                return (
                  <RecipeBodyPage
                    key={`body-${page.recipe.id}-${page.part}`}
                    page={page}
                    pageNumber={pageNumber}
                  />
                );
              }
              return <BlankPage key={`blank-${index}`} pageNumber={pageNumber} />;
            })}
          </FlipBook>
        ) : null}
      </div>
    </section>
  );
}
