"use client";

import { Modal } from "@/components/modal";
import { addRecipeToPartyMenu } from "@/lib/actions/parties";
import type { CookbookRecipe, PartyOption } from "@/lib/cookbook";
import { formatMinutes } from "@/lib/rsvp";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Sparkles,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export function CookbookBook({
  recipes,
  parties,
}: {
  recipes: CookbookRecipe[];
  parties: PartyOption[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(parties[0]?.id ?? "");
  const [feedback, setFeedback] = useState<{ tone: "good" | "warn"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const recipe = recipes[index] ?? null;
  const pageLabel = recipes.length ? `${index + 1} / ${recipes.length}` : "0 / 0";

  const canPrev = index > 0;
  const canNext = index < recipes.length - 1;

  const turn = (direction: "next" | "prev") => {
    if (turning) return;
    if (direction === "next" && !canNext) return;
    if (direction === "prev" && !canPrev) return;
    setTurning(direction);
    window.setTimeout(() => {
      setIndex((current) => (direction === "next" ? current + 1 : current - 1));
      setTurning(null);
      setFeedback(null);
    }, 280);
  };

  const sortedParties = useMemo(
    () =>
      [...parties].sort((a, b) => {
        const aTime = a.starts_at ? new Date(a.starts_at).getTime() : 0;
        const bTime = b.starts_at ? new Date(b.starts_at).getTime() : 0;
        return aTime - bTime;
      }),
    [parties],
  );

  const onAddToMenu = () => {
    if (!recipe || !selectedPartyId) return;
    startTransition(async () => {
      const result = await addRecipeToPartyMenu(selectedPartyId, recipe.id);
      if (result.error) {
        setFeedback({ tone: "warn", text: result.error });
        return;
      }
      setFeedback({
        tone: "good",
        text: result.alreadyOnMenu ? "Already on that party menu." : "Added to party menu.",
      });
      setAddOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-76px)] flex-col lg:min-h-screen">
      <div className="flex flex-col gap-4 border-b border-ink/10 px-4 py-5 md:flex-row md:items-end md:justify-between md:px-8 xl:px-10">
        <div>
          <p className="eyebrow">Your cookbook</p>
          <h1 className="mt-2 font-editorial text-4xl font-semibold leading-none md:text-5xl">
            Open the book.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink/55">
            Flip through description pages. Open a full recipe when you need the method.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setImportOpen(true)}>
          <Plus size={16} /> Add recipe
        </button>
      </div>

      <div className="relative flex flex-1 flex-col px-3 py-5 md:px-6 md:py-8 xl:px-8">
        <div className="pointer-events-none absolute inset-0 editorial-grid opacity-40" />

        <div className="relative mx-auto flex w-full max-w-[1180px] flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
              {recipes.length} recipes · page {pageLabel}
            </p>
            {feedback ? (
              <p
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  feedback.tone === "good" ? "text-olive" : "text-tomato"
                }`}
              >
                <Check size={14} /> {feedback.text}
              </p>
            ) : (
              <p className="font-handwritten text-lg text-tomato">description cards only</p>
            )}
          </div>

          <div
            className={`cookbook-shell relative flex min-h-[62vh] flex-1 overflow-hidden border border-ink/20 bg-[#2a211c] shadow-[0_28px_80px_rgba(41,35,31,0.28)] md:min-h-[68vh] ${
              turning === "next" ? "is-turning-next" : turning === "prev" ? "is-turning-prev" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-px -translate-x-1/2 bg-ink/25 md:block" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-8 -translate-x-1/2 bg-gradient-to-r from-ink/25 via-transparent to-ink/15 md:block" />

            {!recipe ? (
              <div className="grid flex-1 place-items-center bg-[#f7f1e6] p-8 text-center">
                <div>
                  <BookOpen className="mx-auto text-tomato" size={28} />
                  <h2 className="mt-4 font-editorial text-4xl font-semibold">Empty shelves</h2>
                  <p className="mt-3 text-sm text-ink/55">Add your first recipe to fill the book.</p>
                  <button className="btn-primary mt-6" onClick={() => setImportOpen(true)}>
                    <Plus size={16} /> Add recipe
                  </button>
                </div>
              </div>
            ) : (
              <>
                <section className="relative hidden min-h-[420px] flex-1 bg-[#efe6d6] md:block">
                  <img
                    src={recipe.image_url || "/photos/party-04.webp"}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-7 text-paper">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-paper/70">
                      {recipe.course || "Recipe"}
                    </p>
                    <p className="mt-2 font-editorial text-4xl font-semibold leading-none">{recipe.title}</p>
                  </div>
                </section>

                <section className="relative flex flex-1 flex-col bg-[#f7f1e6] p-5 sm:p-7 md:p-8">
                  <div className="absolute right-5 top-5 font-editorial text-5xl text-ink/10 md:right-7 md:top-7">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="md:hidden">
                    <div className="h-48 overflow-hidden border border-ink/15">
                      <img
                        src={recipe.image_url || "/photos/party-04.webp"}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <p className="eyebrow mt-5 text-tomato md:mt-0">{recipe.course || "Recipe"}</p>
                  <h2 className="mt-3 max-w-[16ch] font-editorial text-4xl font-semibold leading-[0.92] sm:text-5xl md:text-[3.4rem]">
                    {recipe.title}
                  </h2>

                  <p className="mt-5 max-w-md text-sm leading-relaxed text-ink/60 md:text-[15px]">
                    {recipe.description || "A dinner-party recipe saved for the next table."}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="chip">
                      <Clock3 size={13} /> {formatMinutes(recipe.prep_minutes)} prep
                    </span>
                    <span className="chip">{formatMinutes(recipe.cook_minutes)} cook</span>
                    <span className="chip">
                      <Users size={13} /> {recipe.servings} servings
                    </span>
                    {recipe.allergy_notes ? (
                      <span className="chip border-tomato/30 text-tomato">{recipe.allergy_notes}</span>
                    ) : null}
                  </div>

                  <p className="mt-8 border-t border-ink/10 pt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">
                    Description page · ingredients & instructions live in the recipe view
                  </p>

                  <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
                    <Link href={`/app/recipes/${recipe.id}`} className="btn-primary flex-1">
                      <UtensilsCrossed size={15} /> See recipe
                    </Link>
                    <button
                      className="btn-secondary flex-1"
                      onClick={() => {
                        setSelectedPartyId(sortedParties[0]?.id ?? "");
                        setAddOpen(true);
                      }}
                    >
                      <Plus size={15} /> Add to party menu
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              className="btn-secondary"
              onClick={() => turn("prev")}
              disabled={!canPrev || Boolean(turning)}
              aria-label="Previous recipe"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <div className="flex max-w-[50%] flex-wrap justify-center gap-1.5">
              {recipes.map((item, pageIndex) => (
                <button
                  key={item.id}
                  aria-label={`Go to ${item.title}`}
                  onClick={() => {
                    setIndex(pageIndex);
                    setFeedback(null);
                  }}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    pageIndex === index ? "bg-tomato" : "bg-ink/20 hover:bg-ink/40"
                  }`}
                />
              ))}
            </div>

            <button
              className="btn-secondary"
              onClick={() => turn("next")}
              disabled={!canNext || Boolean(turning)}
              aria-label="Next recipe"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to party menu">
        {!recipe ? null : (
          <>
            <p className="text-sm text-ink/55">
              Add <span className="font-semibold text-ink">{recipe.title}</span> to an upcoming party menu.
            </p>
            {sortedParties.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-ink/10 bg-white/40 p-5">
                <p className="font-editorial text-2xl font-semibold">No parties yet</p>
                <p className="mt-2 text-sm text-ink/50">Create a party first, then build the menu from here.</p>
                <Link href="/app/parties/new" className="btn-primary mt-5 w-full" onClick={() => setAddOpen(false)}>
                  <Plus size={16} /> New party
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {sortedParties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => setSelectedPartyId(party.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                      selectedPartyId === party.id
                        ? "border-tomato bg-tomato/5"
                        : "border-ink/15 bg-white/40 hover:border-tomato/50"
                    }`}
                  >
                    <span>
                      <span className="block font-editorial text-xl font-semibold">{party.name}</span>
                      <span className="mt-1 block text-xs text-ink/45">
                        {party.starts_at
                          ? new Intl.DateTimeFormat("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }).format(new Date(party.starts_at))
                          : "Date TBD"}
                      </span>
                    </span>
                    {selectedPartyId === party.id ? <Check size={18} className="text-tomato" /> : null}
                  </button>
                ))}
                <button className="btn-primary mt-4 w-full" disabled={pending || !selectedPartyId} onClick={onAddToMenu}>
                  {pending ? "Adding…" : "Add to party menu"}
                </button>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Add to your cookbook">
        <div className="grid gap-3 sm:grid-cols-2">
          {["Import from URL", "Paste recipe text", "Upload PDF or image", "Enter manually"].map((item) => (
            <button
              key={item}
              onClick={() => setImportOpen(false)}
              className="rounded-[1.5rem] border border-ink/15 bg-white/35 p-5 text-left hover:border-tomato"
            >
              <BookOpen size={18} />
              <p className="mt-6 font-editorial text-2xl font-semibold">{item}</p>
              <p className="mt-2 text-xs text-ink/45">Mock import flow</p>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-orange/8 p-4 text-sm text-ink/55">
          <Sparkles size={16} className="mr-2 inline text-orange" />
          Imported recipes remain fully editable and keep their original source URL when available.
        </div>
      </Modal>
    </div>
  );
}
