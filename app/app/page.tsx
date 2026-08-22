import { formatPartyWhen } from "@/lib/calendar";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, ArrowRight, CalendarDays, Clock3, Plus, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

type Party = Database["public"]["Tables"]["parties"]["Row"];
type OpenTask = Pick<
  Database["public"]["Tables"]["tasks"]["Row"],
  "id" | "party_id" | "title" | "description" | "start_at" | "assigned_name"
>;
type GuestSignal = Pick<
  Database["public"]["Tables"]["guests"]["Row"],
  "id" | "party_id" | "name" | "rsvp_status" | "allergies"
>;
type MenuDish = Pick<Database["public"]["Tables"]["recipes"]["Row"], "id" | "party_id" | "allergy_notes">;

type Alert = {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  urgent: boolean;
};

const DAY_MS = 1000 * 60 * 60 * 24;

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
    .select("party_id")
    .eq("user_id", user.id);

  const partyIds = [...new Set((memberships ?? []).map((row) => row.party_id))];
  const { data: partyRows } =
    partyIds.length > 0
      ? await supabase.from("parties").select("*").in("id", partyIds)
      : { data: [] as Party[] };

  const now = Date.now();
  const parties = (partyRows ?? [])
    .slice()
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const upcomingParties = parties.filter((party) => new Date(party.starts_at).getTime() >= now);
  const focusIds = upcomingParties.map((party) => party.id);

  let openTasks: OpenTask[] = [];
  let guests: GuestSignal[] = [];
  let dishes: MenuDish[] = [];

  if (focusIds.length > 0) {
    const [{ data: taskRows }, { data: guestRows }, { data: recipeRows }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, party_id, title, description, start_at, assigned_name")
        .in("party_id", focusIds)
        .neq("status", "done")
        .order("start_at", { ascending: true, nullsFirst: false }),
      supabase.from("guests").select("id, party_id, name, rsvp_status, allergies").in("party_id", focusIds),
      supabase.from("recipes").select("id, party_id, allergy_notes").in("party_id", focusIds),
    ]);
    openTasks = taskRows ?? [];
    guests = guestRows ?? [];
    dishes = recipeRows ?? [];
  }

  const firstName = profile?.name?.trim().split(/\s+/)[0] || "there";
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const partyById = new Map(parties.map((party) => [party.id, party]));
  const daysUntil = (startsAt: string) => Math.max(0, Math.ceil((new Date(startsAt).getTime() - now) / DAY_MS));

  const alerts: Alert[] = [];
  for (const party of upcomingParties) {
    const base = `/app/parties/${party.id}`;
    const partyGuests = guests.filter((guest) => guest.party_id === party.id);
    const partyDishes = dishes.filter((dish) => dish.party_id === party.id);
    const daysAway = daysUntil(party.starts_at);

    const allergyGuests = partyGuests.filter((guest) => guest.allergies?.trim());
    if (allergyGuests.length > 0 && partyDishes.length > 0) {
      const flagged = partyDishes.filter((dish) => dish.allergy_notes?.trim()).length;
      alerts.push({
        id: `${party.id}-allergy`,
        label: "Allergy conflict",
        title: `${allergyGuests.length} guest${allergyGuests.length === 1 ? "" : "s"} with allergies on ${party.name}`,
        detail: `${allergyGuests.map((guest) => guest.allergies?.trim()).join(", ")} · ${flagged} dish${flagged === 1 ? "" : "es"} flagged`,
        href: `${base}/menu`,
        urgent: true,
      });
    }

    const overdue = openTasks.filter(
      (task) => task.party_id === party.id && task.start_at && new Date(task.start_at).getTime() < now,
    );
    if (overdue.length > 0) {
      alerts.push({
        id: `${party.id}-timeline`,
        label: "Timeline slipping",
        title: `${overdue.length} task${overdue.length === 1 ? "" : "s"} past their start time`,
        detail: `${party.name} · ${overdue[0].title}`,
        href: `${base}/timeline`,
        urgent: true,
      });
    }

    const pending = partyGuests.filter((guest) => guest.rsvp_status === "no_response").length;
    if (pending > 0 && daysAway <= 7) {
      alerts.push({
        id: `${party.id}-rsvp`,
        label: "RSVPs outstanding",
        title: `${pending} guest${pending === 1 ? "" : "s"} have not replied to ${party.name}`,
        detail: `${daysAway} day${daysAway === 1 ? "" : "s"} until the table is set`,
        href: `${base}/guests`,
        urgent: daysAway <= 3,
      });
    }

    if (partyDishes.length === 0 && daysAway <= 14) {
      alerts.push({
        id: `${party.id}-menu`,
        label: "Menu is empty",
        title: `${party.name} has no dishes yet`,
        detail: `${daysAway} day${daysAway === 1 ? "" : "s"} away · start with the course structure`,
        href: `${base}/menu`,
        urgent: daysAway <= 5,
      });
    }
  }
  alerts.sort((a, b) => Number(b.urgent) - Number(a.urgent));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday.getTime() + DAY_MS);
  const todayTasks = openTasks.filter((task) => {
    if (!task.start_at) return false;
    const at = new Date(task.start_at).getTime();
    return at >= startOfToday.getTime() && at < endOfToday.getTime();
  });
  const listIsToday = todayTasks.length > 0;
  const listTasks = (listIsToday ? todayTasks : openTasks).slice(0, 6);

  if (parties.length === 0) {
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

  const nextParty = upcomingParties[0] ?? null;

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
              {nextParty
                ? `Your next table is ${daysUntil(nextParty.starts_at)} day${daysUntil(nextParty.starts_at) === 1 ? "" : "s"} away.`
                : "Nothing upcoming. Your past parties are in the archive."}
            </p>
          </div>
          <Link href="/app/parties/new" className="btn-primary self-start md:self-auto">
            Create party <Plus size={15} />
          </Link>
        </header>

        {alerts.length > 0 ? (
          <section className="mt-8 border border-tomato/35 bg-[#f8f0e7]">
            <div className="flex items-center justify-between gap-4 border-b border-tomato/25 px-5 py-4 text-tomato md:px-7">
              <div className="flex items-center gap-2">
                <AlertTriangle size={17} />
                <p className="text-[9px] font-bold uppercase tracking-[0.15em]">Needs attention</p>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-[0.13em]">
                {alerts.length} item{alerts.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="divide-y divide-tomato/15">
              {alerts.slice(0, 5).map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="group grid gap-2 px-5 py-5 md:grid-cols-[150px_1fr_auto] md:items-center md:gap-5 md:px-7"
                >
                  <span
                    className={`text-[9px] font-bold uppercase tracking-[0.13em] ${alert.urgent ? "text-tomato" : "text-ink/45"}`}
                  >
                    {alert.label}
                  </span>
                  <div>
                    <p className="font-editorial text-2xl font-semibold leading-none">{alert.title}</p>
                    <p className="mt-2 text-xs text-ink/55">{alert.detail}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-ink/28 transition group-hover:translate-x-1 group-hover:text-tomato md:justify-self-end"
                  />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
            <div>
              <p className="eyebrow">On the calendar</p>
              <h2 className="mt-2 font-editorial text-4xl font-semibold leading-none md:text-5xl">Upcoming parties</h2>
            </div>
            <Link href="/app/parties" className="editorial-link text-tomato">
              All parties <ArrowRight size={12} />
            </Link>
          </div>

          {upcomingParties.length === 0 ? (
            <p className="py-8 text-sm text-ink/45">
              No upcoming parties.{" "}
              <Link href="/app/parties" className="font-semibold text-tomato">
                Browse the archive
              </Link>{" "}
              or create the next one.
            </p>
          ) : (
            <div className="grid gap-5 pt-6 md:grid-cols-2 xl:grid-cols-3">
              {upcomingParties.slice(0, 3).map((party) => {
                const when = formatPartyWhen(party.starts_at, party.timezone);
                const daysAway = daysUntil(party.starts_at);
                const attending = guests.filter(
                  (guest) => guest.party_id === party.id && guest.rsvp_status === "attending",
                ).length;
                const dishCount = dishes.filter((dish) => dish.party_id === party.id).length;
                return (
                  <Link
                    key={party.id}
                    href={`/app/parties/${party.id}`}
                    className="group flex flex-col border border-ink/15 bg-[#f8f4ec] p-3"
                  >
                    <div className="relative h-44 overflow-hidden md:h-52">
                      <Image
                        src={party.hero_image || "/photos/party-01.webp"}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                        unoptimized={Boolean(party.hero_image?.startsWith("http"))}
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-tomato">
                        {daysAway} day{daysAway === 1 ? "" : "s"} away
                      </p>
                      <h3 className="mt-2 font-editorial text-3xl font-semibold leading-[0.92]">{party.name}</h3>
                      <p className="mt-3 text-xs text-ink/52">
                        {when.date} · {when.time}
                      </p>
                      <p className="mt-1 text-xs text-ink/52">{party.location || "Location TBD"}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-ink/15 pt-4 text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">
                        <span>
                          {attending} attending · {dishCount} dish{dishCount === 1 ? "" : "es"}
                        </span>
                        <ArrowRight
                          size={15}
                          className="text-ink/28 transition group-hover:translate-x-1 group-hover:text-tomato"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-4">
              <div>
                <p className="eyebrow">{listIsToday ? "Today’s kitchen" : "Nothing scheduled today"}</p>
                <h2 className="mt-2 font-editorial text-4xl font-semibold leading-none md:text-5xl">
                  {listIsToday ? "Today’s list" : "What’s next"}
                </h2>
              </div>
              {nextParty ? (
                <Link href={`/app/parties/${nextParty.id}/timeline`} className="editorial-link text-tomato">
                  Full timeline <ArrowRight size={12} />
                </Link>
              ) : null}
            </div>

            <div>
              {listTasks.length === 0 ? (
                <p className="py-6 text-sm text-ink/45">No open tasks across your upcoming parties.</p>
              ) : (
                listTasks.map((task, index) => {
                  const icons = [CalendarDays, ShoppingBasket, Clock3] as const;
                  const Icon = icons[index % icons.length];
                  const taskParty = partyById.get(task.party_id);
                  const timeLabel = task.start_at
                    ? formatPartyWhen(task.start_at, taskParty?.timezone ?? undefined).time
                    : "Soon";
                  return (
                    <Link
                      key={task.id}
                      href={`/app/parties/${task.party_id}/timeline`}
                      className="grid gap-4 border-b border-ink/15 py-5 sm:grid-cols-[44px_1fr_auto] sm:items-center"
                    >
                      <span className="font-editorial text-3xl text-tomato">0{index + 1}</span>
                      <div>
                        <h3 className="font-editorial text-2xl font-semibold leading-none">{task.title}</h3>
                        <p className="mt-2 text-xs text-ink/52">
                          {taskParty ? `${taskParty.name} · ` : ""}
                          {task.assigned_name || task.description || "Keep the plan moving."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <Icon size={16} className="text-ink/35" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">
                          {timeLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <aside className="border border-ink/15 bg-[#f8f4ec] p-6 md:p-7">
            <p className="eyebrow">Across your parties</p>
            <dl className="mt-6 divide-y divide-ink/12 border-y border-ink/15">
              <div className="flex items-baseline justify-between py-4">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">Upcoming</dt>
                <dd className="font-editorial text-3xl font-semibold leading-none">{upcomingParties.length}</dd>
              </div>
              <div className="flex items-baseline justify-between py-4">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">Open tasks</dt>
                <dd className="font-editorial text-3xl font-semibold leading-none">{openTasks.length}</dd>
              </div>
              <div className="flex items-baseline justify-between py-4">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">Guests invited</dt>
                <dd className="font-editorial text-3xl font-semibold leading-none">{guests.length}</dd>
              </div>
            </dl>
            <p className="mt-6 font-handwritten text-2xl leading-[0.95] text-ink/62">
              the plan is only here so you can sit down and eat with everyone else
            </p>
            <Link href="/app/parties" className="btn-secondary mt-6 w-full">
              See all parties
            </Link>
          </aside>
        </section>
      </div>
    </div>
  );
}
