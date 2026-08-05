"use client";

import { Archive, Copy, Save, Trash2 } from "lucide-react";
import { useState } from "react";

export default function PartySettingsPage() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-8">
      <section><p className="eyebrow">Party settings</p><h2 className="mt-2 font-editorial text-5xl font-semibold">Details, access, and defaults.</h2><p className="mt-4 max-w-2xl text-sm text-ink/55">Changes to date, time, or guest count can trigger a fresh recipe scale, cost estimate, timeline, and assignment pass.</p></section>
      {saved ? <div className="rounded-2xl border border-olive/25 bg-olive/8 p-4 text-sm font-semibold text-olive">Changes saved in prototype state.</div> : null}
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <article className="card p-6"><p className="eyebrow">Event details</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Party name</span><input className="field" defaultValue="The Last Light Supper" /></label><label><span className="mb-2 block text-xs font-semibold">Date</span><input className="field" type="date" defaultValue="2026-08-22" /></label><label><span className="mb-2 block text-xs font-semibold">Start time</span><input className="field" type="time" defaultValue="18:30" /></label><label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold">Location</span><input className="field" defaultValue="Lukas' backyard · Providence, RI" /></label></div></article>
          <article className="card p-6"><p className="eyebrow">Theme and invite</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold">Theme</span><input className="field" defaultValue="Late-summer garden party" /></label><label><span className="mb-2 block text-xs font-semibold">Cuisine</span><input className="field" defaultValue="Mediterranean-inspired" /></label><label><span className="mb-2 block text-xs font-semibold">Dress code</span><input className="field" defaultValue="Garden color" /></label><label><span className="mb-2 block text-xs font-semibold">Guests can bring</span><input className="field" defaultValue="A bottle they’re excited to share" /></label></div></article>
          <article className="card p-6"><p className="eyebrow">Collaboration</p><div className="mt-5 space-y-3">{[["Lukas Phimvongsa", "Owner"],["Maya Johnson", "Manager"],["Ari Shah", "Helper"]].map(([name, role], i) => <div key={name} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white/35 p-4"><div className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-tomato text-paper" : i === 1 ? "bg-olive text-paper" : "bg-blush"}`}>{name.split(" ").map((x) => x[0]).join("")}</div><div className="flex-1"><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-ink/45">{role}</p></div><select className="rounded-full border border-ink/15 bg-paper px-3 py-2 text-xs font-bold" defaultValue={role}><option>Owner</option><option>Manager</option><option>Editor</option><option>Helper</option></select></div>)}</div><button className="btn-secondary mt-5">Invite collaborator</button></article>
          <button className="btn-primary" onClick={() => setSaved(true)}><Save size={16} /> Save changes</button>
        </div>
        <aside className="space-y-4"><article className="card p-5"><p className="eyebrow">Party actions</p><div className="mt-5 space-y-2"><button className="btn-secondary w-full justify-start"><Copy size={16} /> Duplicate party</button><button className="btn-secondary w-full justify-start"><Archive size={16} /> Archive party</button></div></article><article className="rounded-[1.75rem] border border-tomato/25 bg-tomato/5 p-5"><p className="font-editorial text-2xl font-semibold text-tomato">Danger zone</p><p className="mt-2 text-xs leading-relaxed text-ink/50">Deleting a party will remove guests, assignments, receipts, and party-specific recipe edits.</p><button className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-tomato"><Trash2 size={15} /> Delete party</button></article></aside>
      </section>
    </div>
  );
}
