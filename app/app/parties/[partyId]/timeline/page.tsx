import { TimelineBoard, type TimelineBoardTask } from "@/components/party/timeline-board";
import { formatPartyWhen } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";
import { Clock3 } from "lucide-react";
import { notFound } from "next/navigation";

function formatTaskWhen(iso: string | null, timeZone: string) {
  if (!iso) return "Unscheduled";
  const start = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(start);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(start);
  return `${day} · ${time}`;
}

export default async function TimelinePage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, starts_at, timezone")
    .eq("id", partyId)
    .maybeSingle();
  if (!party) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("party_id", partyId)
    .order("sort_order");

  const list = (tasks ?? []) as TimelineBoardTask[];
  const complete = list.filter((task) => task.status === "done").length;
  const next = list.find((task) => task.status !== "done");
  const { date, time } = formatPartyWhen(party.starts_at, party.timezone);

  const workloadMap = new Map<string, number>();
  for (const task of list) {
    const name = task.assigned_name?.trim() || "Unassigned";
    workloadMap.set(name, (workloadMap.get(name) ?? 0) + 1);
  }
  const workload = [...workloadMap.entries()].map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Order of operations</p>
          <h2 className="mt-2 font-editorial text-5xl font-semibold">A timeline that moves with you.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">
            Tasks account for cooling, resting, equipment, dependencies, helper skill, and the party start time.
            Drag blocks to reschedule — pickup size matches duration, and a silhouette marks the landing slot.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5">
          <p className="eyebrow">Progress</p>
          <p className="mt-3 font-editorial text-4xl font-semibold">
            {complete}/{list.length}
          </p>
          <p className="mt-2 text-xs text-ink/45">tasks complete</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Next checkpoint</p>
          <p className="mt-3 font-editorial text-3xl font-semibold">
            {next ? formatTaskWhen(next.start_at, party.timezone) : "All clear"}
          </p>
          <p className="mt-2 text-xs text-ink/45">{next?.title || "No open tasks"}</p>
        </article>
        <article className="card p-5">
          <p className="eyebrow">Locked tasks</p>
          <p className="mt-3 font-editorial text-3xl font-semibold">
            {list.filter((task) => task.locked).length}
          </p>
          <p className="mt-2 text-xs text-ink/45">fixed assignments</p>
        </article>
        <article className="rounded-[1.75rem] bg-orange p-5 text-paper">
          <p className="eyebrow !text-paper/55">Party starts</p>
          <p className="mt-3 font-editorial text-3xl font-semibold">{time}</p>
          <p className="mt-2 text-xs text-paper/65">{date}</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_290px]">
        <TimelineBoard
          partyId={partyId}
          partyStartsAt={party.starts_at}
          timezone={party.timezone}
          tasks={list}
        />
        <aside className="space-y-4">
          <article className="card p-5">
            <p className="eyebrow">Workload</p>
            <h3 className="mt-2 font-editorial text-3xl font-semibold">
              {workload.length || 0} cook{workload.length === 1 ? "" : "s"}
            </h3>
            <div className="mt-5 space-y-4">
              {workload.length === 0 ? <p className="text-xs text-ink/45">No assignments yet.</p> : null}
              {workload.map((person, i) => (
                <div key={person.name}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{person.name}</span>
                    <span>{person.count} tasks</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-ink/10">
                    <div
                      className={`h-full rounded-full ${i === 0 ? "bg-tomato" : i === 1 ? "bg-orange" : "bg-olive"}`}
                      style={{ width: `${Math.min(100, person.count * 24)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper">
            <Clock3 className="text-orange" size={21} />
            <h3 className="mt-5 font-editorial text-3xl font-semibold">Live check-ins</h3>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              On party day, plated. asks whether critical tasks actually happened and shifts dependent work when needed.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
