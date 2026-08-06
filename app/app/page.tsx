import { PhotoFrame } from "@/components/photo-frame";
import { formatPartyWhen } from "@/lib/calendar";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, ArrowRight, CalendarDays, Check, Clock3, Plus, ShoppingBasket, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type Party = Database["public"]["Tables"]["parties"]["Row"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_complete) {
    redirect("/onboarding");
  }

  const { data: memberships } = await supabase
    .from("party_members")
    .select("role, party_id")
    .eq("user_id", user.id);

  const partyIds = [...new Set((memberships ?? []).map((row) => row.party_id))];
  const { data: partyRows } =
    partyIds.length > 0
      ? await supabase.from("parties").select("*").in("id", partyIds)
      : { data: [] as Party[] };

  const parties = (partyRows ?? [])
    .slice()
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const upcoming =
    parties.find((party) => new Date(party.starts_at).getTime() >= Date.now()) ?? parties[0] ?? null;

  const firstName = profile?.name?.trim().split(/\s+/)[0] || "there";
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  let attending = 0;
  let recipeCount = 0;
  let estimate = 0;
  let menuRecipes: Array<{
    id: string;
    title: string;
    course: string | null;
    image_url: string | null;
    prep_minutes: number | null;
    cook_minutes: number | null;
  }> = [];
  let nextTasks: Array<{ id: string; title: string; start_at: string | null; description: string | null }> = [];

  if (upcoming) {
    const [{ data: guests }, { data: recipes }, { data: grocery }, { data: tasks }] = await Promise.all([
      supabase.from("guests").select("rsvp_status").eq("party_id", upcoming.id),
      supabase
        .from("recipes")
        .select("id, title, course, image_url, prep_minutes, cook_minutes")
        .eq("party_id", upcoming.id)
        .limit(4),
      supabase
        .from("grocery_items")
        .select("estimated_cost, already_owned")
        .eq("party_id", upcoming.id),
      supabase
        .from("tasks")
        .select("id, title, start_at, description, status")
        .eq("party_id", upcoming.id)
        .neq("status", "done")
        .order("sort_order")
        .limit(3),
    ]);

    attending = (guests ?? []).filter((guest) => guest.rsvp_status === "attending").length;
    recipeCount = (recipes ?? []).length;
    estimate = (grocery ?? [])
      .filter((item) => !item.already_owned)
      .reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
    menuRecipes = recipes ?? [];
    nextTasks = tasks ?? [];
  }

  const when = upcoming ? formatPartyWhen(upcoming.starts_at, upcoming.timezone) : null;
  const daysAway = upcoming
    ? Math.max(0, Math.ceil((new Date(upcoming.starts_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const partyHref = upcoming ? `/app/parties/${upcoming.id}` : "/app/parties/new";

  if (!upcoming) {
    return (
      <div className="paper-noise px-4 py-7 md:px-8 md:py-10 xl:px-12 xl:py-12">
        <div className="mx-auto max-w-3xl border border-ink/15 bg-[#f8f4ec] p-8 md:p-12">
          <p className="font-handwritten text-2xl leading-none text-tomato">{todayLabel}</p>
          <h1 className="mt-2 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] md:text-6xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink/55">
            You do not have a party on the calendar yet. Create one to start the menu, guest list, shopping list, and
            timeline.
          </p>
          <Link href="/app/parties/new" className="btn-primary mt-8">
            Create party <Plus size={15} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-noise px-4 py-7 md:px-8 md:py-10 xl:px-12 xl:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-6 border-b border-ink/20 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-handwritten text-2xl leading-none text-tomato">{todayLabel}</p>
            <h1 className="mt-2 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] md:text-7xl">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/55">
              Your next table is {daysAway} day{daysAway === 1 ? "" : "s"} away. Open the party plan to keep momentum.
            </p>
          </div>
          <Link href="/app/parties/new" className="btn-primary self-start md:self-auto">
            Create party <Plus size={15} />
          </Link>
        </header>

        <section className="mt-8 grid border border-ink/15 bg-[#f8f4ec] lg:grid-cols-[1.45fr_.72fr]">
          <Link
            href={partyHref}
            className="group relative min-h-[430px] overflow-hidden border-b border-ink/15 lg:min-h-[570px] lg:border-b-0 lg:border-r"
          >
            <img
              src={upcoming.hero_image || "/photos/party-01.webp"}
              alt="Outdoor dinner party"
              className="absolute inset-0 h-full w-full object-cover object-[50%_55%] transition duration-700 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 border border-paper/60 bg-paper/92 px-4 py-3 text-ink md:bottom-8 md:left-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-tomato">
                Next party · {daysAway} days away
              </p>
              <p className="mt-1 font-handwritten text-xl">{upcoming.name.toLowerCase()}</p>
            </div>
          </Link>

          <div className="flex flex-col p-6 md:p-8 lg:p-9">
            <div className="flex items-start justify-between gap-4 border-b border-ink/15 pb-6">
              <div>
                <p className="eyebrow">Upcoming</p>
                <h2 className="mt-3 font-editorial text-5xl font-semibold leading-[0.82] tracking-[-0.04em] text-tomato md:text-6xl">
                  {upcoming.name}
                </h2>
              </div>
              <ArrowRight size={22} className="mt-1 text-tomato" />
            </div>

            <dl className="divide-y divide-ink/12 border-b border-ink/15">
              <div className="grid grid-cols-[90px_1fr] py-4 text-xs">
                <dt className="font-bold uppercase tracking-[0.12em] text-ink/42">Date</dt>
                <dd className="font-semibold">
                  {when?.date} · {when?.time}
                </dd>
              </div>
              <div className="grid grid-cols-[90px_1fr] py-4 text-xs">
                <dt className="font-bold uppercase tracking-[0.12em] text-ink/42">Place</dt>
                <dd className="font-semibold">{upcoming.location || "Location TBD"}</dd>
              </div>
              <div className="grid grid-cols-[90px_1fr] py-4 text-xs">
                <dt className="font-bold uppercase tracking-[0.12em] text-ink/42">Style</dt>
                <dd className="font-semibold">
                  {[upcoming.service_style, upcoming.cuisine].filter(Boolean).join(" · ") || "Open style"}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-3 border-b border-ink/15 py-6">
              <div className="border-r border-ink/15 pr-4">
                <p className="editorial-number">{attending}</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">Attending</p>
              </div>
              <div className="border-r border-ink/15 px-4">
                <p className="editorial-number">{recipeCount}</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">Dishes</p>
              </div>
              <div className="pl-4">
                <p className="editorial-number">${Math.round(estimate)}</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-ink/42">Estimated</p>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Link href={partyHref} className="editorial-link text-tomato">
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
              <Link href={`${partyHref}/timeline`} className="editorial-link text-tomato">
                Full timeline <ArrowRight size={12} />
              </Link>
            </div>

            <div>
              {nextTasks.length === 0 ? (
                <p className="py-6 text-sm text-ink/45">No open tasks yet for this party.</p>
              ) : (
                nextTasks.map((task, index) => {
                  const icons = [CalendarDays, ShoppingBasket, Clock3] as const;
                  const Icon = icons[index % icons.length];
                  const timeLabel = task.start_at
                    ? formatPartyWhen(task.start_at, upcoming.timezone).time
                    : "Soon";
                  return (
                    <article
                      key={task.id}
                      className="grid gap-4 border-b border-ink/15 py-5 sm:grid-cols-[44px_1fr_auto] sm:items-center"
                    >
                      <span className="font-editorial text-3xl text-tomato">0{index + 1}</span>
                      <div>
                        <h3 className="font-editorial text-2xl font-semibold leading-none">{task.title}</h3>
                        <p className="mt-2 text-xs text-ink/52">{task.description || "Keep the plan moving."}</p>
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <Icon size={16} className="text-ink/35" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">{timeLabel}</span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <aside className="border border-tomato/35 bg-[#f8f0e7] p-6 md:p-7">
            <div className="flex items-center justify-between gap-4 text-tomato">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em]">Needs attention</p>
              <AlertTriangle size={17} />
            </div>
            <h3 className="mt-8 font-editorial text-4xl font-semibold leading-[0.9]">
              Keep the menu and guest list in sync.
            </h3>
            <p className="mt-5 text-sm leading-relaxed text-ink/55">
              Review allergy notes and RSVPs before invitations go out.
            </p>
            <Link href={`${partyHref}/menu`} className="editorial-link mt-8 text-tomato">
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
              <Link href={`${partyHref}/menu`} className="editorial-link text-tomato">
                Edit menu <ArrowRight size={12} />
              </Link>
            </div>

            <div className="grid border-l border-t border-ink/15 sm:grid-cols-2">
              {menuRecipes.length === 0 ? (
                <div className="border-b border-r border-ink/15 bg-[#f8f4ec] p-6 sm:col-span-2">
                  <p className="text-sm text-ink/50">No recipes on this party yet.</p>
                </div>
              ) : (
                menuRecipes.map((recipe, index) => (
                  <Link
                    href={`${partyHref}/menu`}
                    key={recipe.id}
                    className="group border-b border-r border-ink/15 bg-[#f8f4ec] p-3"
                  >
                    <div className="h-44 overflow-hidden md:h-52">
                      <img
                        src={recipe.image_url || "/photos/party-04.webp"}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4 px-1 pb-2 pt-4">
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-tomato">
                          {recipe.course || "Course"}
                        </p>
                        <h3 className="mt-2 font-editorial text-2xl font-semibold leading-[0.93]">{recipe.title}</h3>
                      </div>
                      <span className="font-editorial text-xl text-ink/28">0{index + 1}</span>
                    </div>
                  </Link>
                ))
              )}
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
            [Users, `${attending} guests attending`, "RSVPs update the plan as they come in."],
            [Check, `${recipeCount} dishes planned`, "Scale the menu when the headcount shifts."],
            [Sparkles, `$${Math.round(estimate)} estimated`, "Pantry marks lower the shopping total."],
          ].map(([Icon, title, copy], index) => {
            const StatusIcon = Icon as typeof Users;
            return (
              <article
                key={title as string}
                className={`py-6 md:px-6 ${index < 2 ? "border-b border-ink/15 md:border-b-0 md:border-r" : ""}`}
              >
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
