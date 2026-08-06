import { formatPartyWhen } from "@/lib/calendar";
import { formatRsvpStatus, initialsFromName } from "@/lib/rsvp";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock3, DollarSign, ListChecks, ShoppingBasket, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PartyOverviewPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();
  const base = `/app/parties/${partyId}`;

  const { data: party } = await supabase.from("parties").select("*").eq("id", partyId).maybeSingle();
  if (!party) notFound();

  const [{ data: guests }, { data: recipes }, { data: grocery }, { data: tasks }] = await Promise.all([
    supabase.from("guests").select("id, name, rsvp_status, allergies, plus_one_count").eq("party_id", partyId),
    supabase.from("recipes").select("id, allergy_notes").eq("party_id", partyId),
    supabase
      .from("grocery_items")
      .select("estimated_cost, already_owned")
      .eq("party_id", partyId),
    supabase.from("tasks").select("id, title, status, start_at").eq("party_id", partyId).order("sort_order"),
  ]);

  const guestList = guests ?? [];
  const attending = guestList.filter((g) => g.rsvp_status === "attending").length;
  const maybe = guestList.filter((g) => g.rsvp_status === "maybe").length;
  const pending = guestList.filter((g) => g.rsvp_status === "no_response").length;
  const allergyFlags = (recipes ?? []).filter((r) => r.allergy_notes).length;
  const ownedCount = (grocery ?? []).filter((item) => item.already_owned).length;
  const shoppingEstimate = (grocery ?? [])
    .filter((item) => !item.already_owned)
    .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const done = (tasks ?? []).filter((task) => task.status === "done").length;
  const nextTask = (tasks ?? []).find((task) => task.status !== "done");
  const { date, time } = formatPartyWhen(party.starts_at, party.timezone);
  const daysAway = Math.max(
    0,
    Math.ceil((new Date(party.starts_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const guestCount = Math.max(1, party.planning_guest_count || attending || 1);
  const perGuest = shoppingEstimate / guestCount;
  const checklistDone = [
    Boolean(party.service_style),
    (recipes ?? []).length > 0,
    allergyFlags === 0,
    Boolean(party.dress_code || party.guest_contribution_notes),
    pending === 0 && guestList.length > 0,
  ];
  const checklistComplete = checklistDone.filter(Boolean).length;

  return (
    <div className="space-y-12">
      <section className="grid border border-ink/15 bg-[#f8f4ec] lg:grid-cols-[1.22fr_.78fr]">
        <div className="relative min-h-[430px] overflow-hidden border-b border-ink/15 lg:min-h-[560px] lg:border-b-0 lg:border-r">
          <img
            src={party.hero_image || "/photos/party-01.webp"}
            alt={`${party.name} cover`}
            className="absolute inset-0 h-full w-full object-cover object-[50%_55%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 border border-paper/60 bg-paper/92 px-4 py-3 md:bottom-8 md:left-8">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-tomato">The visual direction</p>
            <p className="mt-1 font-handwritten text-xl text-ink">{party.theme || "Your party theme"}</p>
          </div>
        </div>

        <div className="flex flex-col p-6 md:p-8 lg:p-10">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-bold uppercase tracking-[0.14em] text-ink/45">
            <span className="text-tomato">{party.service_style || "Dinner"}</span>
            <span>{party.cuisine || "Open cuisine"}</span>
          </div>
          <h2 className="mt-7 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] text-tomato md:text-6xl">
            Everything is coming together.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ink/55">
            {party.description ||
              "Finish allergy substitutions, confirm the pantry, and send the invite. The rest of the plan can adapt as people reply."}
          </p>

          <div className="mt-10 border-y border-ink/15 py-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Overall progress</p>
                <p className="mt-3 font-editorial text-6xl font-semibold leading-none">
                  {Math.round((checklistComplete / 5) * 100)}%
                </p>
              </div>
              <CheckCircle2 className="mb-1 text-olive" size={24} strokeWidth={1.5} />
            </div>
            <div className="mt-5 h-px bg-ink/15">
              <div className="h-px bg-tomato" style={{ width: `${(checklistComplete / 5) * 100}%` }} />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/42">
              {daysAway} days away · {date} · {time}
            </p>
          </div>

          <div className="mt-auto pt-8">
            <div className="flex items-center gap-2 text-tomato">
              <Sparkles size={16} />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Kitchen analysis</span>
            </div>
            <h3 className="mt-3 font-editorial text-3xl font-semibold leading-[0.95]">
              {allergyFlags > 0 ? `${allergyFlags} allergy flag${allergyFlags === 1 ? "" : "s"} to review.` : "Menu looks clear so far."}
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-ink/50">
              Open the menu to scale dishes and resolve conflicts before invitations go out.
            </p>
            <Link href={`${base}/menu`} className="editorial-link mt-5 text-tomato">
              Review analysis <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid border-y border-ink/20 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Users, `${attending} attending`, `${maybe} maybe · ${pending} pending`, `${base}/guests`],
          [ListChecks, `${(recipes ?? []).length} dishes`, `${allergyFlags} allergy flags`, `${base}/menu`],
          [
            ShoppingBasket,
            `$${shoppingEstimate.toFixed(2)} estimated`,
            `${ownedCount} pantry items removed`,
            `${base}/shopping`,
          ],
          [
            Clock3,
            `${done}/${(tasks ?? []).length} tasks done`,
            nextTask ? `Next: ${nextTask.title}` : "No open tasks",
            `${base}/timeline`,
          ],
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
            <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-tomato">
              {checklistComplete} of 5
            </span>
          </div>

          <div>
            {[
              [checklistDone[0], "Choose menu structure", party.service_style || "Not set"],
              [
                checklistDone[1],
                "Add and scale recipes",
                `${(recipes ?? []).length} dishes · ${party.planning_guest_count} servings`,
              ],
              [
                checklistDone[2],
                "Resolve allergy conflicts",
                allergyFlags ? `${allergyFlags} still need review` : "No allergy flags",
              ],
              [
                checklistDone[3],
                "Add dress code and bring-a-bottle note",
                [party.dress_code, party.guest_contribution_notes].filter(Boolean).join(" · ") || "Not set",
              ],
              [
                checklistDone[4],
                "Send invitations",
                guestList.length ? `${pending} awaiting reply` : "No guests yet",
              ],
            ].map(([complete, title, detail], index) => (
              <div key={title as string} className="grid grid-cols-[32px_1fr_auto] gap-3 border-b border-ink/15 py-5">
                <span className={`font-editorial text-2xl ${complete ? "text-olive" : "text-tomato"}`}>0{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{title as string}</p>
                  <p className={`mt-1 text-xs ${complete ? "text-ink/45" : "font-semibold text-tomato"}`}>
                    {detail as string}
                  </p>
                </div>
                <span
                  className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${complete ? "border-olive bg-olive text-paper" : "border-ink/25"}`}
                >
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
            {guestList.length === 0 ? (
              <p className="py-6 text-sm text-ink/45">No guests yet. Add people from the Guests tab.</p>
            ) : (
              guestList.slice(0, 4).map((guest, index) => {
                const status = formatRsvpStatus(guest.rsvp_status);
                const allergies = guest.allergies?.trim();
                return (
                  <div key={guest.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-4">
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-full text-[9px] font-bold ${index % 3 === 0 ? "bg-blush" : index % 3 === 1 ? "bg-gold" : "bg-olive text-paper"}`}
                    >
                      {initialsFromName(guest.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{guest.name}</p>
                      <p className="mt-1 truncate text-[10px] text-ink/45">
                        {status === "Attending"
                          ? "RSVP’d yes"
                          : status === "Maybe"
                            ? "May bring guests"
                            : "Awaiting response"}
                        {allergies ? ` · ${allergies} allergy` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[8px] font-bold uppercase tracking-[0.1em] ${allergies ? "text-tomato" : "text-ink/45"}`}
                    >
                      {status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <Link href={`${base}/guests`} className="btn-secondary mt-6 w-full">
            Manage guests
          </Link>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="border border-tomato/35 bg-[#f8f0e7] p-6 md:p-8">
          <div className="flex items-center gap-2 text-tomato">
            <AlertTriangle size={17} />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Allergy alert</span>
          </div>
          <h3 className="mt-7 font-editorial text-4xl font-semibold leading-[0.9]">
            {allergyFlags > 0
              ? `${allergyFlags} dish${allergyFlags === 1 ? "" : "es"} need allergy review.`
              : "No allergy flags on the menu."}
          </h3>
          <p className="mt-5 text-sm leading-relaxed text-ink/55">
            Cross-check recipe allergy notes against guest responses before you send invitations.
          </p>
          <Link href={`${base}/menu`} className="editorial-link mt-7 text-tomato">
            Find a replacement <ArrowRight size={12} />
          </Link>
        </article>

        <article className="border border-ink/20 bg-ink p-6 text-paper md:p-8">
          <div className="flex items-center gap-2 text-gold">
            <DollarSign size={17} />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em]">Cost snapshot</span>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-5 border-y border-paper/20 py-6">
            <div className="border-r border-paper/20 pr-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-paper/45">Estimated total</p>
              <p className="mt-3 font-editorial text-5xl font-semibold leading-none">${shoppingEstimate.toFixed(2)}</p>
            </div>
            <div className="pl-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-paper/45">Per guest</p>
              <p className="mt-3 font-editorial text-5xl font-semibold leading-none">${perGuest.toFixed(2)}</p>
            </div>
          </div>
          <Link href={`${base}/costs`} className="editorial-link mt-7 text-orange">
            View costs <ArrowRight size={12} />
          </Link>
        </article>
      </section>
    </div>
  );
}
