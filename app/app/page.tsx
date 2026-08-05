import { PhotoFrame } from "@/components/photo-frame";
import { party, recipes } from "@/lib/mock-data";
import { AlertTriangle, ArrowRight, CalendarDays, Check, Clock3, Plus, ShoppingBasket, Sparkles, Users } from "lucide-react";
import Link from "next/link";

const nextActions = [
  ["01", CalendarDays, "Send invitation", "The menu preview is ready for guests.", "Today"],
  ["02", ShoppingBasket, "Confirm pantry", "Four ingredients are marked as already owned.", "By Friday"],
  ["03", Clock3, "Bake olive oil cake", "It needs time to cool before the glaze.", "Aug 22 · 10 AM"],
] as const;

export default function DashboardPage() {
  return (
    <div className="paper-noise px-4 py-7 md:px-8 md:py-10 xl:px-12 xl:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-6 border-b border-ink/20 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-handwritten text-2xl leading-none text-tomato">Wednesday, August 5</p>
            <h1 className="mt-2 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] md:text-7xl">
              Good afternoon, Lukas.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/55">
              The next useful thing is resolving two allergy conflicts before invitations go out.
            </p>
          </div>
          <Link href="/app/parties/new" className="btn-primary self-start md:self-auto">
            Create party <Plus size={15} />
          </Link>
        </header>

        <section className="mt-8 grid border border-ink/15 bg-[#f8f4ec] lg:grid-cols-[1.45fr_.72fr]">
          <Link href="/app/parties/summer-table" className="group relative min-h-[430px] overflow-hidden border-b border-ink/15 lg:min-h-[570px] lg:border-b-0 lg:border-r">
            <img
              src="/photos/party-01.webp"
              alt="Outdoor dinner party"
              className="absolute inset-0 h-full w-full object-cover object-[50%_55%] transition duration-700 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 border border-paper/60 bg-paper/92 px-4 py-3 text-ink md:bottom-8 md:left-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-tomato">Next party · 17 days away</p>
              <p className="mt-1 font-handwritten text-xl">the last light supper</p>
            </div>
          </Link>

          <div className="flex flex-col p-6 md:p-8 lg:p-9">
            <div className="flex items-start justify-between gap-4 border-b border-ink/15 pb-6">
              <div>
                <p className="eyebrow">Upcoming</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.82] tracking-[-0.04em] text-tomato md:text-6xl">
                  {party.name}
                </h2>
              </div>
              <ArrowRight size={22} className="mt-1 text-tomato" />
            </div>

            <dl className="divide-y divide-ink/12 border-b border-ink/15">
              <div className="grid grid-cols-[90px_1fr] py-4 text-xs">
                <dt className="font-bold uppercase tracking-[0.12em] text-ink/42">Date</dt>
                <dd className="font-semibold">{party.date} · {party.time}</dd>
              </div>
              <div className="grid grid-cols-[90px_1fr] py-4 text-xs">
                <dt className="font-bold uppercase tracking-[0.12em] text-ink/42">Place</dt>
                <dd className="font-semibold">{party.location}</dd>
              </div>
              <div className="grid grid-cols-[90px_1fr] py-4 text-xs">
                <dt className="font-bold uppercase tracking-[0.12em] text-ink/42">Style</dt>
                <dd className="font-semibold">{party.service} · {party.cuisine}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-3 border-b border-ink/15 py-6">
              <div className="border-r border-ink/15 pr-4">
                <p className="editorial-number">8</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">Attending</p>
              </div>
              <div className="border-r border-ink/15 px-4">
                <p className="editorial-number">4</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">Dishes</p>
              </div>
              <div className="pl-4">
                <p className="editorial-number">$143</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">Estimated</p>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em]">
                <span>Party readiness</span>
                <span className="text-tomato">78%</span>
              </div>
              <div className="mt-3 h-px bg-ink/18">
                <div className="h-px w-[78%] bg-tomato" />
              </div>
              <Link href="/app/parties/summer-table" className="editorial-link mt-6 text-tomato">
                Open party plan <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-7 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
              <div>
                <p className="eyebrow">Today’s kitchen</p>
                <h2 className="mt-2 font-editorial text-4xl font-semibold leading-none md:text-5xl">What’s next</h2>
              </div>
              <Link href="/app/parties/summer-table/timeline" className="editorial-link text-tomato">Full timeline <ArrowRight size={12} /></Link>
            </div>

            <div>
              {nextActions.map(([number, Icon, title, copy, time]) => (
                <article key={number} className="grid gap-4 border-b border-ink/15 py-5 sm:grid-cols-[44px_1fr_auto] sm:items-center">
                  <span className="font-editorial text-3xl text-tomato">{number}</span>
                  <div>
                    <h3 className="font-editorial text-2xl font-semibold leading-none">{title}</h3>
                    <p className="mt-2 text-xs text-ink/52">{copy}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <Icon size={16} className="text-ink/35" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">{time}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="border border-tomato/35 bg-[#f8f0e7] p-6 md:p-7">
            <div className="flex items-center justify-between gap-4 text-tomato">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em]">Needs attention</p>
              <AlertTriangle size={17} />
            </div>
            <h3 className="mt-8 font-editorial text-4xl font-semibold leading-[0.9]">
              Two recipes conflict with guest allergies.
            </h3>
            <p className="mt-5 text-sm leading-relaxed text-ink/55">
              The tart contains gluten and the greens contain sesame. Resolve both before the invite goes out.
            </p>
            <Link href="/app/parties/summer-table/menu" className="editorial-link mt-8 text-tomato">
              Review the menu <ArrowRight size={13} />
            </Link>
          </aside>
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-[1fr_.72fr]">
          <div>
            <div className="flex items-end justify-between border-b border-ink/20 pb-4">
              <div>
                <p className="eyebrow">Cookbook pull</p>
                <h2 className="mt-2 font-editorial text-4xl font-semibold leading-none md:text-5xl">On the menu</h2>
              </div>
              <Link href="/app/parties/summer-table/menu" className="editorial-link text-tomato">Edit menu <ArrowRight size={12} /></Link>
            </div>

            <div className="grid border-l border-t border-ink/15 sm:grid-cols-2">
              {recipes.slice(0, 4).map((recipe, index) => (
                <Link href="/app/parties/summer-table/menu" key={recipe.id} className="group border-b border-r border-ink/15 bg-[#f8f4ec] p-3">
                  <div className="h-44 overflow-hidden md:h-52">
                    <img src={recipe.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                  </div>
                  <div className="flex items-start justify-between gap-4 px-1 pb-2 pt-4">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-tomato">{recipe.course}</p>
                      <h3 className="mt-2 font-editorial text-2xl font-semibold leading-[0.93]">{recipe.title}</h3>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink/40">{recipe.prep} prep · {recipe.cook} cook</p>
                    </div>
                    <span className="font-editorial text-xl text-ink/28">0{index + 1}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="relative min-h-[520px]">
            <PhotoFrame
              src="/photos/party-08.webp"
              alt="Friends laughing at a candlelit table"
              className="absolute inset-x-0 top-0 h-[88%] rotate-[1deg]"
              label="this is the part you’re planning for"
            />
            <div className="absolute bottom-0 left-4 max-w-[250px] -rotate-[2deg] border border-ink/20 bg-paper p-5 shadow-card">
              <Sparkles size={16} className="text-tomato" />
              <p className="mt-3 font-handwritten text-2xl leading-[0.9]">
                The timeline is there so you do not spend the whole night in the kitchen.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14 grid border-y border-ink/20 md:grid-cols-3">
          {[
            [Users, "10 of 14 guests replied", "Two allergy notes require review."],
            [Check, "6 of 8 tasks assigned", "Two tasks still need a helper."],
            [Sparkles, "One kitchen conflict", "Move the tart twenty minutes earlier."],
          ].map(([Icon, title, copy], index) => {
            const StatusIcon = Icon as typeof Users;
            return (
              <article key={title as string} className={`py-6 md:px-6 ${index < 2 ? "border-b border-ink/15 md:border-b-0 md:border-r" : ""}`}>
                <StatusIcon size={17} className="text-tomato" />
                <h3 className="mt-5 font-editorial text-2xl font-semibold leading-none">{title as string}</h3>
                <p className="mt-2 text-xs text-ink/48">{copy as string}</p>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
