"use client";

import { Modal } from "@/components/modal";
import { timelineTasks as seedTasks } from "@/lib/mock-data";
import { AlertTriangle, Check, Clock3, Lock, Play, RefreshCw, Sparkles, Unlock, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

export default function TimelinePage() {
  const [tasks, setTasks] = useState(seedTasks);
  const [delayOpen, setDelayOpen] = useState(false);
  const [regen, setRegen] = useState(false);
  const complete = tasks.filter((task) => task.done).length;
  const toggleDone = (id: number) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  const toggleLock = (id: number) => setTasks((current) => current.map((task) => task.id === id ? { ...task, locked: !task.locked } : task));
  const workload = useMemo(() => ["Lukas", "Maya", "Ari"].map((name) => ({ name, count: tasks.filter((task) => task.assignee === name).length })), [tasks]);
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">Order of operations</p><h2 className="mt-2 font-editorial text-5xl font-semibold">A timeline that moves with you.</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">Tasks account for cooling, resting, equipment, dependencies, helper skill, and the 6:30 PM start time.</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setDelayOpen(true)}><AlertTriangle size={16} /> I’m behind</button><button className="btn-primary" onClick={() => setRegen(true)}><RefreshCw size={16} /> Redelegate unlocked</button></div>
      </section>

      {regen ? <div className="flex flex-col gap-3 rounded-[1.5rem] border border-olive/25 bg-olive/8 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Sparkles size={19} className="mt-0.5 text-olive" /><div><p className="text-sm font-bold">Mock delegation refreshed</p><p className="mt-1 text-xs text-ink/50">Two unlocked tasks were rebalanced while all locked assignments stayed in place.</p></div></div><button className="text-xs font-bold text-olive" onClick={() => setRegen(false)}>Dismiss</button></div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5"><p className="eyebrow">Progress</p><p className="mt-3 font-editorial text-4xl font-semibold">{complete}/{tasks.length}</p><p className="mt-2 text-xs text-ink/45">tasks complete</p></article>
        <article className="card p-5"><p className="eyebrow">Next checkpoint</p><p className="mt-3 font-editorial text-3xl font-semibold">Sat · 10 AM</p><p className="mt-2 text-xs text-ink/45">Bake olive oil cake</p></article>
        <article className="card p-5"><p className="eyebrow">Critical path</p><p className="mt-3 font-editorial text-3xl font-semibold">3 linked tasks</p><p className="mt-2 text-xs text-ink/45">Dough → shell → tart</p></article>
        <article className="rounded-[1.75rem] bg-orange p-5 text-paper"><p className="eyebrow !text-paper/55">Party starts</p><p className="mt-3 font-editorial text-3xl font-semibold">6:30 PM</p><p className="mt-2 text-xs text-paper/65">Saturday, August 22</p></article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_290px]">
        <div className="relative">
          <div className="absolute bottom-6 left-[26px] top-6 w-px bg-ink/15" />
          <div className="space-y-4">{tasks.map((task) => <article key={task.id} className={`relative ml-14 rounded-[1.5rem] border p-5 transition ${task.done ? "border-olive/20 bg-olive/7" : "border-ink/10 bg-[#f8f2e8] shadow-card"}`}>
            <button onClick={() => toggleDone(task.id)} className={`absolute -left-[46px] top-6 z-10 grid h-9 w-9 place-items-center rounded-full border-4 border-paper ${task.done ? "bg-olive text-paper" : "bg-paper text-ink/35 ring-1 ring-ink/15"}`} aria-label={`Mark ${task.title} complete`}>{task.done ? <Check size={15} /> : <Play size={13} />}</button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-wider text-tomato">{task.time}</span>{task.locked ? <span className="chip"><Lock size={12} /> locked</span> : null}</div><h3 className={`mt-3 font-editorial text-2xl font-semibold ${task.done ? "text-ink/48 line-through" : ""}`}>{task.title}</h3><p className="mt-2 text-sm text-ink/50">{task.detail}</p></div><div className="flex shrink-0 flex-wrap gap-2"><span className="chip"><UserRound size={13} /> {task.assignee}</span><span className="chip">{task.level}</span><button onClick={() => toggleLock(task.id)} className="btn-icon h-8 w-8" aria-label={task.locked ? "Unlock task" : "Lock task"}>{task.locked ? <Unlock size={14} /> : <Lock size={14} />}</button></div></div>
          </article>)}</div>
        </div>
        <aside className="space-y-4">
          <article className="card p-5"><p className="eyebrow">Workload</p><h3 className="mt-2 font-editorial text-3xl font-semibold">Three cooks</h3><div className="mt-5 space-y-4">{workload.map((person, i) => <div key={person.name}><div className="flex items-center justify-between text-xs font-semibold"><span>{person.name}</span><span>{person.count} tasks</span></div><div className="mt-2 h-2 rounded-full bg-ink/10"><div className={`h-full rounded-full ${i === 0 ? "bg-tomato" : i === 1 ? "bg-orange" : "bg-olive"}`} style={{ width: `${person.count * 24}%` }} /></div></div>)}</div><button className="btn-secondary mt-6 w-full">Manage helpers</button></article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper"><Clock3 className="text-orange" size={21} /><h3 className="mt-5 font-editorial text-3xl font-semibold">Live check-ins</h3><p className="mt-3 text-sm leading-relaxed text-paper/60">On party day, plated. asks whether critical tasks actually happened and shifts dependent work when needed.</p><button className="mt-5 text-sm font-bold text-orange" onClick={() => setDelayOpen(true)}>Preview recovery flow →</button></article>
        </aside>
      </section>

      <Modal open={delayOpen} onClose={() => setDelayOpen(false)} title="Recover the timeline">
        <div className="rounded-[1.5rem] border border-tomato/25 bg-tomato/5 p-5"><p className="text-xs font-bold uppercase tracking-widest text-tomato">Current checkpoint</p><h3 className="mt-2 font-editorial text-3xl font-semibold">The cake did not go into the oven at 10:00 AM.</h3><p className="mt-3 text-sm leading-relaxed text-ink/55">Tell plated. how far behind you are. Locked tasks will remain fixed unless the recovery is impossible.</p></div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{["15 min", "30 min", "1 hour", "Not started"].map((time) => <button key={time} className="rounded-2xl border border-ink/15 bg-white/40 p-4 text-sm font-bold hover:border-tomato hover:bg-tomato/5">{time}</button>)}</div>
        <div className="mt-5 rounded-2xl bg-olive/8 p-4"><p className="text-sm font-bold text-olive">Suggested recovery</p><p className="mt-2 text-sm leading-relaxed text-ink/55">Move table setup to Maya, start the cake at 10:35 AM, and glaze at 2:00 PM. No guest-facing delay expected.</p></div>
        <button className="btn-primary mt-6 w-full" onClick={() => setDelayOpen(false)}><RefreshCw size={16} /> Apply recovery plan</button>
      </Modal>
    </div>
  );
}
