import { guests, party, recipes, timelineTasks } from "@/lib/mock-data";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock3, DollarSign, ListChecks, ShoppingBasket, Sparkles, Users } from "lucide-react";
import Link from "next/link";

export default function PartyOverviewPage() {
  const done = timelineTasks.filter((task) => task.done).length;

  return (
    <div className="space-y-12">
      <section className="grid border border-ink/15 bg-[#f8f4ec] lg:grid-cols-[1.22fr_.78fr]">
        <div className="relative min-h-[430px] overflow-hidden border-b border-ink/15 lg:min-h-[560px] lg:border-b-0 lg:border-r">
          <img src="/photos/party-01.webp" alt="The Last Light Supper cover" className="absolute inset-0 h-full w-full object-cover object-[50%_55%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 border border-paper/60 bg-paper/92 px-4 py-3 md:bottom-8 md:left-8">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-tomato">The visual direction</p>
            <p className="mt-1 font-handwritten text-xl text-ink">{party.theme}</p>
          </div>
        </div>

        <div className="flex flex-col p-6 md:p-8 lg:p-10">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-bold uppercase tracking-[0.14em] text-ink/45">
            <span className="text-tomato">{party.service}</span>
            <span>{party.cuisine}</span>
          </div>
          <h2 className="mt-7 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] text-tomato md:text-6xl">
            Everything is coming together.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ink/55">
            Finish allergy substitutions, confirm the pantry, and send the invite. The rest of the plan can adapt as people reply.
          </p>

          <div className="mt-10 border-y border-ink/15 py-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Overall progress</p>
                <p className="mt-3 font-editorial text-6xl font-semibold leading-none">78%</p>
              </div>
              <CheckCircle2 className="mb-1 text-olive" size={24} strokeWidth={1.5} />
            </div>
            <div className="mt-5 h-px bg-ink/15">
              <div className="h-px w-[78%] bg-tomato" />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/42">Ahead of schedule · 17 days away</p>
          </div>

          <div className="mt-auto pt-8">
            <div className="flex items-center gap-2 text-tomato">
              <Sparkles size={16} />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Kitchen analysis</span>
            </div>
            <h3 className="mt-3 font-editorial text-3xl font-semibold leading-[0.95]">One oven conflict at 5:10 PM.</h3>
            <p className="mt-3 text-xs leading-relaxed text-ink/50">The tart finish and chicken rest overlap. Move the tart twenty minutes earlier.</p>
            <Link href="/app/parties/summer-table/menu" className="editorial-link mt-5 text-tomato">Review analysis <ArrowRight size={12} /></Link>
          </div>
        </div>
      </section>

      <section className="grid border-y border-ink/20 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Users, `${party.attending} attending`, `${party.maybe} maybe · ${party.invited - party.attending - party.maybe} pending`, "/app/parties/summer-table/guests"],
          [ListChecks, `${recipes.length} dishes`, "2 allergy flags", "/app/parties/summer-table/menu"],
          [ShoppingBasket, "$142.60 estimated", "4 pantry items removed", "/app/parties/summer-table/shopping"],
          [Clock3, `${done}/${timelineTasks.length} tasks done`, "Next: bake cake", "/app/parties/summer-table/timeline"],
        ].map(([Icon, title, copy, href], index) => {
          const StatIcon = Icon as typeof Users;
          return (
            <Link
              href={href as string}
              key={title as string}
              className={`group px-1 py-6 sm:px-6 ${index < 3 ? "border-b border-ink/15 xl:border-b-0 xl:border-r" : ""} ${index === 0 ? "sm:border-r" : index === 1 ? "sm:border-r-0" : index === 2 ? "sm:border-r" : ""}`}
            >
              <div className="flex items-start justify-between">
                <StatIcon size={17} className="text-tomato" strokeWidth={1.6} />
                <ArrowRight size={14} className="text-ink/25 transition group-hover:translate-x-1 group-hover:text-tomato" />
              </div>
              <p className="mt-6 font-editorial text-3xl font-semibold leading-none">{title as string}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/42">{copy as string}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.08fr_.92fr]">
        <article>
          <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
            <div>
              <p className="eyebrow">Planning checklist</p>
              <h2 className="mt-2 font-editorial text-4xl font-semibold leading-none">Before invitations go out</h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-tomato">3 of 5</span>
          </div>

          <div>
            {[
              [true, "Choose menu structure", "Family style"],
              [true, "Add and scale recipes", "4 dishes · 12 servings"],
              [false, "Resolve allergy conflicts", "Gluten and sesame need review"],
              [true, "Add dress code and bring-a-bottle note", "Garden color · wine welcome"],
              [false, "Send invitations", "14 guests ready to invite"],
            ].map(([complete, title, detail], index) => (
              <div key={title as string} className="grid grid-cols-[32px_1fr_auto] gap-3 border-b border-ink/15 py-5">
                <span className={`font-editorial text-2xl ${complete ? "text-olive" : "text-tomato"}`}>0{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{title as string}</p>
                  <p className={`mt-1 text-xs ${complete ? "text-ink/45" : "font-semibold text-tomato"}`}>{detail as string}</p>
                </div>
                <span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${complete ? "border-olive bg-olive text-paper" : "border-ink/25"}`}>
                  {complete ? <Check size={12} /> : null}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-ink/15 bg-[#f8f4ec] p-6 md:p-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Guest signals</p>
              <h2 className="mt-2 font-editorial text-4xl font-semibold leading-none">What changed</h2>
            </div>
            <Users size={19} className="text-tomato" />
          </div>

          <div className="mt-7 divide-y divide-ink/15 border-y border-ink/15">
            {guests.slice(0, 4).map((guest, index) => (
              <div key={guest.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-4">
                <div className={`grid h-9 w-9 place-items-center rounded-full text-[9px] font-bold ${index % 3 === 0 ? "bg-blush" : index % 3 === 1 ? "bg-gold" : "bg-olive text-paper"}`}>
                  {guest.name.split(" ").map((part) => part[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{guest.name}</p>
                  <p className="mt-1 truncate text-[10px] text-ink/45">
                    {guest.status === "Attending" ? "RSVP’d yes" : guest.status === "Maybe" ? "May bring one guest" : "Awaiting response"}
                    {guest.allergies !== "None" && guest.allergies !== "—" ? ` · ${guest.allergies} allergy` : ""}
                  </p>
                </div>
                <span className={`text-[8px] font-bold uppercase tracking-[0.1em] ${guest.allergies !== "None" && guest.allergies !== "—" ? "text-tomato" : "text-ink/45"}`}>
                  {guest.status}
                </span>
              </div>
            ))}
          </div>
          <Link href="/app/parties/summer-table/guests" className="btn-secondary mt-6 w-full">Manage guests</Link>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="border border-tomato/35 bg-[#f8f0e7] p-6 md:p-8">
          <div className="flex items-center gap-2 text-tomato">
            <AlertTriangle size={17} />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Allergy alert</span>
          </div>
          <h3 className="mt-7 font-editorial text-4xl font-semibold leading-[0.9]">Nina can’t eat the tart as written.</h3>
          <p className="mt-5 text-sm leading-relaxed text-ink/55">The pastry uses wheat flour. Ask for a replacement or add a separate gluten-free welcome bite.</p>
          <Link href="/app/parties/summer-table/menu" className="editorial-link mt-7 text-tomato">Find a replacement <ArrowRight size={12} /></Link>
        </article>

        <article className="border border-ink/20 bg-ink p-6 text-paper md:p-8">
          <div className="flex items-center gap-2 text-gold">
            <DollarSign size={17} />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Cost snapshot</span>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-5 border-y border-paper/20 py-6">
            <div className="border-r border-paper/20 pr-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-paper/45">Estimated total</p>
              <p className="mt-3 font-editorial text-5xl font-semibold leading-none">$142.60</p>
            </div>
            <div className="pl-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-paper/45">Per guest</p>
              <p className="mt-3 font-editorial text-5xl font-semibold leading-none">$11.88</p>
            </div>
          </div>
          <Link href="/app/parties/summer-table/costs" className="editorial-link mt-7 text-orange">View costs <ArrowRight size={12} /></Link>
        </article>
      </section>
    </div>
  );
}
