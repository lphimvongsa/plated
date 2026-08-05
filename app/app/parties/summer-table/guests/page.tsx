"use client";

import { Modal } from "@/components/modal";
import { guests as initialGuests } from "@/lib/mock-data";
import { AlertTriangle, Check, Copy, Mail, MessageSquareText, Plus, Search, Send, Users } from "lucide-react";
import { useMemo, useState } from "react";

export default function GuestsPage() {
  const [guests, setGuests] = useState(initialGuests);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [query, setQuery] = useState("");
  const counts = useMemo(() => ({
    attending: guests.filter((g) => g.status === "Attending").length,
    maybe: guests.filter((g) => g.status === "Maybe").length,
    pending: guests.filter((g) => g.status === "No response").length,
    allergies: guests.filter((g) => g.allergies !== "None" && g.allergies !== "—").length,
  }), [guests]);
  const cycle = (id: number) => setGuests((current) => current.map((g) => g.id === id ? { ...g, status: g.status === "No response" ? "Attending" : g.status === "Attending" ? "Maybe" : g.status === "Maybe" ? "Not attending" : "No response" } : g));
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">Guests and invitations</p><h2 className="mt-2 font-editorial text-5xl font-semibold">Invite them into the menu.</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/55">Guests see the dinner before they reply. New allergies or headcount changes feed back into recipes, shopping, cost, and timeline.</p></div>
        <button className="btn-primary" onClick={() => { setSent(false); setInviteOpen(true); }}><Send size={16} /> Send invitations</button>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card p-5"><p className="eyebrow">Attending</p><p className="mt-3 font-editorial text-4xl font-semibold">{counts.attending}</p><p className="mt-2 text-xs text-ink/45">confirmed guests</p></article>
        <article className="card p-5"><p className="eyebrow">Maybe</p><p className="mt-3 font-editorial text-4xl font-semibold">{counts.maybe}</p><p className="mt-2 text-xs text-ink/45">including plus-ones</p></article>
        <article className="card p-5"><p className="eyebrow">Awaiting reply</p><p className="mt-3 font-editorial text-4xl font-semibold">{counts.pending}</p><p className="mt-2 text-xs text-ink/45">reminder not sent</p></article>
        <article className="rounded-[1.75rem] bg-tomato p-5 text-paper"><p className="eyebrow !text-paper/55">Allergy profiles</p><p className="mt-3 font-editorial text-4xl font-semibold">{counts.allergies}</p><p className="mt-2 text-xs text-paper/65">need menu attention</p></article>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-col gap-3 rounded-[1.5rem] border border-ink/10 bg-white/35 p-3 sm:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="field pl-11" placeholder="Search guests" /></label><button className="btn-secondary"><Plus size={15} /> Add guest</button></div>
          <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-ink/10 bg-[#f8f2e8] shadow-card">
            <div className="hidden grid-cols-[1.2fr_.85fr_.65fr_.45fr] gap-4 border-b border-ink/10 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ink/40 md:grid"><span>Guest</span><span>Status</span><span>Dietary</span><span className="text-right">Plus</span></div>
            <div className="divide-y divide-ink/8">{guests.filter((g) => g.name.toLowerCase().includes(query.toLowerCase())).map((guest, i) => <div key={guest.id} className="grid gap-4 p-5 md:grid-cols-[1.2fr_.85fr_.65fr_.45fr] md:items-center"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${i % 4 === 0 ? "bg-blush" : i % 4 === 1 ? "bg-gold" : i % 4 === 2 ? "bg-olive text-paper" : "bg-orange text-paper"}`}>{guest.name.split(" ").map((p) => p[0]).join("")}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{guest.name}</p><p className="truncate text-xs text-ink/43">{guest.email}</p></div></div><div><button onClick={() => cycle(guest.id)} className={`chip ${guest.status === "Attending" ? "border-olive/30 bg-olive/10 text-olive" : guest.status === "Maybe" ? "border-gold/40 bg-gold/10" : guest.status === "Not attending" ? "bg-ink/5 text-ink/40" : "border-tomato/20 bg-tomato/5 text-tomato"}`}>{guest.status === "Attending" ? <Check size={12} /> : null}{guest.status}</button></div><div>{guest.allergies !== "None" && guest.allergies !== "—" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-tomato"><AlertTriangle size={13} /> {guest.allergies}</span> : <span className="text-xs text-ink/40">{guest.allergies}</span>}</div><div className="text-sm font-bold md:text-right">{guest.plus}</div></div>)}</div>
          </div>
        </div>
        <aside className="space-y-4">
          <article className="card overflow-hidden"><div className="h-48"><img src="/photos/party-07.webp" alt="Outdoor dinner invitation image" className="h-full w-full object-cover" /></div><div className="p-5"><p className="font-handwritten text-sm text-tomato">Invitation preview</p><h3 className="mt-2 font-editorial text-3xl font-semibold">The Last Light Supper</h3><p className="mt-3 text-xs leading-relaxed text-ink/50">Menu, dress code, guest contributions, allergies, and RSVP in one custom page.</p><a href="/invite/summer-table" target="_blank" className="btn-secondary mt-5 w-full">Open preview</a></div></article>
          <article className="rounded-[1.75rem] bg-ink p-5 text-paper"><Users size={21} className="text-orange" /><h3 className="mt-5 font-editorial text-3xl font-semibold">Collaborators are different from guests.</h3><p className="mt-3 text-sm leading-relaxed text-paper/60">Managers and editors can change the party. Helpers can receive and complete assigned tasks.</p><button className="mt-5 text-sm font-bold text-orange">Manage access →</button></article>
        </aside>
      </section>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Send the invitation">
        {!sent ? <>
          <div className="grid gap-3 sm:grid-cols-2"><button className="rounded-[1.5rem] border-2 border-ink bg-white/45 p-5 text-left"><Mail size={20} /><p className="mt-5 font-editorial text-2xl font-semibold">Email</p><p className="mt-1 text-xs text-ink/50">14 recipients selected</p></button><button className="rounded-[1.5rem] border border-ink/15 bg-white/35 p-5 text-left"><MessageSquareText size={20} /><p className="mt-5 font-editorial text-2xl font-semibold">SMS</p><p className="mt-1 text-xs text-ink/50">8 phone numbers available</p></button></div>
          <label className="mt-5 block"><span className="mb-2 block text-xs font-semibold">Host message</span><textarea className="field min-h-28" defaultValue="Come over for a late-summer dinner in the garden. Wear something colorful, and bring a bottle you’re excited to share if you’d like." /></label>
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-ink/10 bg-white/35 p-4"><div><p className="text-sm font-semibold">Invitation link</p><p className="mt-1 text-xs text-ink/45">plated.app/invite/summer-table</p></div><button className="btn-icon"><Copy size={15} /></button></div>
          <button className="btn-primary mt-6 w-full" onClick={() => setSent(true)}><Send size={16} /> Send 14 invitations</button>
        </> : <div className="py-5 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-olive text-paper"><Check size={28} /></div><h3 className="mt-5 font-editorial text-4xl font-semibold">Invitations are out.</h3><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/55">This is a mocked send. Production will use email and SMS providers with delivery tracking and secure invite tokens.</p><button className="btn-secondary mt-6" onClick={() => setInviteOpen(false)}>Done</button></div>}
      </Modal>
    </div>
  );
}
