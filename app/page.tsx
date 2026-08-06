import { Brand } from "@/components/brand";
import { PhotoFrame } from "@/components/photo-frame";
import { ArrowRight, Check, Clock3, ShoppingBasket, Sparkles, Users } from "lucide-react";
import Link from "next/link";

const steps = [
  ["01", "Set the direction", "Choose the theme, cuisine, menu structure, courses, and restrictions."],
  ["02", "Build the menu", "Import recipes, scale portions, convert measurements, and catch allergy conflicts."],
  ["03", "Plan the kitchen", "Create a dependency-aware timeline and delegate around skill and workload."],
  ["04", "Invite the table", "Share a custom menu preview, collect RSVPs, and let the plan adapt."],
];

export default function LandingPage() {
  return (
    <div className="paper-noise min-h-screen overflow-hidden bg-paper">
      <header className="relative z-30 mx-auto flex max-w-[1480px] items-center justify-between border-b border-ink/15 px-5 py-4 md:px-8">
        <nav className="hidden items-center gap-7 text-[9px] font-bold uppercase tracking-[0.16em] md:flex">
          <a href="#how" className="transition hover:text-tomato">How it works</a>
          <a href="#features" className="transition hover:text-tomato">Features</a>
          <a href="#story" className="transition hover:text-tomato">Our point of view</a>
        </nav>
        <div className="md:absolute md:left-1/2 md:-translate-x-1/2">
          <Brand compact />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:block">Log in</Link>
          <Link href="/auth/login" className="btn-primary">Plan a party <ArrowRight size={14} /></Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-[1480px] bg-tomato px-5 py-7 md:px-8 md:py-10">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
            <article className="border border-ink/15 bg-[#faf7ef] p-3 md:p-5">
              <div className="flex items-center justify-between border-b border-ink/15 pb-3 text-[8px] font-bold uppercase tracking-[0.17em] text-ink/50">
                <span>Dinner parties, planned beautifully</span>
                <span>Est. 2026</span>
              </div>

              <div className="relative mt-1">
                <h1 className="relative z-10 text-center font-editorial text-[5rem] font-semibold italic leading-[0.78] tracking-[-0.075em] text-tomato sm:text-[7.5rem] lg:text-[10.2rem] xl:text-[12rem]">
                  plated.
                </h1>

                <div className="relative -mt-6 h-[330px] overflow-hidden md:-mt-10 md:h-[460px] lg:h-[500px]">
                  <img
                    src="/photos/party-01.webp"
                    alt="An outdoor dinner party beneath string lights"
                    className="h-full w-full object-cover object-[50%_56%]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/15 via-transparent to-transparent" />
                </div>
              </div>

              <div className="grid gap-3 border-t border-ink/15 pt-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tomato">Menu-first planning for people who actually cook</p>
                <p className="font-handwritten text-2xl leading-none text-ink/72 md:px-5">less coordinating, more clinking glasses</p>
                <p className="text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50 md:text-right">Recipes · guests · shopping · timeline</p>
              </div>
            </article>

            <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <article className="border border-ink/15 bg-[#faf7ef] p-4">
                <p className="font-handwritten text-xl text-ink/60">it is about</p>
                <h2 className="mt-1 font-editorial text-[2.8rem] font-semibold leading-[0.83] tracking-[-0.04em] text-tomato">
                  the dinner everyone keeps talking about
                </h2>
                <div className="mt-5 h-36 overflow-hidden">
                  <img src="/photos/party-08.webp" alt="Friends laughing around a candlelit table" className="h-full w-full object-cover" />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-ink/58">
                  Build the menu first. Invite people into a night that already feels real.
                </p>
              </article>

              <article className="border border-ink/15 bg-[#faf7ef] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-tomato">A little structure before the beautiful mess</p>
                <div className="mt-4 h-44 overflow-hidden">
                  <img src="/photos/party-03.webp" alt="Guests toasting over flowers and candles" className="h-full w-full object-cover" />
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <p className="font-editorial text-2xl font-semibold leading-[0.95]">Make dinner.<br />Keep the night.</p>
                  <Link href="/auth/login" className="grid h-10 w-10 shrink-0 place-items-center border border-ink/25 transition hover:border-tomato hover:text-tomato" aria-label="Start planning">
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            </aside>
          </div>
        </section>

        <section id="story" className="mx-auto max-w-[1480px] border-t border-ink/15 px-5 py-20 md:px-8 lg:py-28">
          <div className="mx-auto max-w-6xl border border-ink/15 bg-[#faf7ef] p-5 md:p-10 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-5">
                <p className="font-handwritten text-2xl text-ink/60">It’s about</p>
                <h2 className="mt-1 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.045em] text-tomato md:text-7xl">
                  the night you planned without planning the joy out of it
                </h2>
                <div className="mt-8 h-56 overflow-hidden md:h-72">
                  <img src="/photos/party-04.webp" alt="A table filled with dishes, candles, and flowers" className="h-full w-full object-cover" />
                </div>
                <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink/60">
                  plated. keeps recipes, pantry checks, costs, guests, and kitchen timing in one shared plan.
                </p>
              </div>

              <div className="lg:col-span-3 lg:pt-28">
                <div className="h-72 overflow-hidden md:h-96">
                  <img src="/photos/party-10.webp" alt="Friends eating together in a warm dining room" className="h-full w-full object-cover" />
                </div>
                <p className="mt-3 font-handwritten text-xl text-tomato">no two tables are ever the same</p>
              </div>

              <div className="lg:col-span-4 lg:pt-8">
                <p className="text-right text-[9px] font-bold uppercase tracking-[0.15em] text-tomato">This is not about slicing onions flawlessly</p>
                <h3 className="mt-16 font-editorial text-4xl font-semibold leading-[0.9] md:text-5xl">
                  It is about being at your own dinner.
                </h3>
                <p className="mt-5 text-sm leading-relaxed text-ink/58">
                  The plan can be precise. The table can still be spontaneous. Everyone knows what to do, what to bring, and when to arrive.
                </p>
                <Link href="/auth/login" className="editorial-link mt-8 text-tomato">Create your first party <ArrowRight size={13} /></Link>
                <div className="mt-20 h-48 overflow-hidden">
                  <img src="/photos/party-07.webp" alt="Wine being poured at an outdoor dinner" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="border-y border-ink/15 bg-[#ebe4d8] px-5 py-20 md:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className="eyebrow">From idea to first pour</p>
                <h2 className="mt-4 max-w-md font-editorial text-5xl font-semibold leading-[0.88] tracking-[-0.04em] text-tomato md:text-7xl">
                  A plan as thoughtful as the menu.
                </h2>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink/58">
                  Work in the order hosts actually think: menu first, execution second, invitation once the night has a point of view.
                </p>
              </div>

              <div className="border-t border-ink/25">
                {steps.map(([number, title, copy]) => (
                  <article key={number} className="grid gap-4 border-b border-ink/25 py-6 md:grid-cols-[70px_220px_1fr] md:items-baseline">
                    <span className="font-editorial text-3xl text-tomato">{number}</span>
                    <h3 className="font-editorial text-3xl font-semibold leading-none">{title}</h3>
                    <p className="max-w-xl text-sm leading-relaxed text-ink/58">{copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-[1480px] px-5 py-20 md:px-8 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative min-h-[600px]">
              <PhotoFrame src="/photos/party-05.webp" alt="A playful dinner party with colorful paper crowns" className="absolute left-0 top-0 h-[74%] w-[78%] -rotate-[1.5deg]" label="the reason for the plan" />
              <PhotoFrame src="/photos/party-06.webp" alt="A tabletop filled with drawings, bottles, and notes" className="absolute bottom-0 right-0 h-[46%] w-[56%] rotate-[1.5deg]" label="after dinner, before goodbye" />
              <div className="absolute right-[2%] top-[5%] max-w-[180px] border border-ink/20 bg-paper p-4 font-handwritten text-xl leading-[0.95] text-tomato shadow-card">
                organized enough to feel effortless ↘
              </div>
            </div>

            <div className="lg:pl-8">
              <p className="eyebrow">A kitchen command center that still feels human</p>
              <h2 className="mt-4 font-editorial text-5xl font-semibold leading-[0.87] tracking-[-0.04em] text-tomato md:text-7xl">
                Everything the night needs. Nothing it doesn’t.
              </h2>

              <div className="mt-12 border-t border-ink/25">
                {[
                  [Sparkles, "Recipes that do the math", "Import from a URL, text, PDF, image, or manual entry. Scale portions, convert units, and combine every ingredient."],
                  [Users, "Plans made together", "Add co-hosts, editors, and helpers. Delegate around skill, specialty, workload, and locked assignments."],
                  [Clock3, "A timeline that can recover", "Track dependencies, check in on finished tasks, and reshape the plan when the kitchen falls behind."],
                  [ShoppingBasket, "Shopping without the guessing", "Remove pantry items, see category-based lists, estimate cost, and reconcile receipts after the run."],
                ].map(([Icon, title, copy]) => {
                  const FeatureIcon = Icon as typeof Sparkles;
                  return (
                    <article key={title as string} className="grid gap-4 border-b border-ink/25 py-6 sm:grid-cols-[44px_1fr]">
                      <div className="grid h-10 w-10 place-items-center border border-ink/20 text-tomato">
                        <FeatureIcon size={18} strokeWidth={1.6} />
                      </div>
                      <div>
                        <h3 className="font-editorial text-3xl font-semibold leading-none">{title as string}</h3>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/58">{copy as string}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-ink/15 px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-5xl gap-8 text-center">
            <p className="font-handwritten text-2xl text-ink/58">The menu is only the beginning.</p>
            <h2 className="font-editorial text-6xl font-semibold leading-[0.82] tracking-[-0.05em] text-tomato md:text-8xl">
              Make the dinner.<br />Keep the memory.
            </h2>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <Link href="/auth/login" className="btn-primary px-7">Start planning <ArrowRight size={15} /></Link>
              <Link href="/auth/login" className="btn-secondary px-7">Plan a dinner</Link>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/45">
              <span className="inline-flex items-center gap-2"><Check size={12} /> Menu-first workflow</span>
              <span className="inline-flex items-center gap-2"><Check size={12} /> Collaborative planning</span>
              <span className="inline-flex items-center gap-2"><Check size={12} /> Installable web app</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/20 bg-tomato px-5 py-10 text-paper md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Brand light />
            <p className="mt-4 max-w-sm text-xs uppercase tracking-[0.12em] text-paper/65">Dinner parties, planned beautifully.</p>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-paper/65 md:text-right">
            <p>Next.js · TypeScript · Tailwind</p>
            <p className="mt-2">Frontend prototype · 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
