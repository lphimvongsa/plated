"use client";

import { Brand } from "@/components/brand";
import { Check, ChevronDown, MapPin, PartyPopper, Sparkles, Wine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function InvitePage() {
  const [rsvp, setRsvp] = useState("Attending");
  const [submitted, setSubmitted] = useState(false);
  return (
    <main className="paper-noise min-h-screen overflow-hidden bg-[#eee4d4] text-ink">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10"><Brand compact /><Link href="/auth/login" className="text-xs font-bold uppercase tracking-widest">Made with plated.</Link></header>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-4 md:px-10 lg:grid-cols-[1.05fr_.95fr] lg:pt-10">
        <div className="relative min-h-[610px] md:min-h-[760px]">
          <div className="absolute left-0 top-3 h-[72%] w-[79%] -rotate-[2deg] bg-[#fffaf1] p-2 pb-10 shadow-paper"><div className="relative h-full overflow-hidden"><img src="/photos/party-01.webp" alt="Outdoor garden dinner party" className="h-full w-full object-cover object-[50%_58%]" /><div className="absolute inset-0 bg-gradient-to-t from-ink/25 to-transparent" /></div><p className="absolute bottom-3 left-4 font-handwritten text-sm">the last light supper · providence</p></div>
          <div className="absolute bottom-0 right-0 h-[45%] w-[47%] rotate-[4deg] bg-[#fffaf1] p-2 pb-9 shadow-paper"><div className="h-full overflow-hidden"><img src="/photos/party-03.webp" alt="Guests making a toast" className="h-full w-full object-cover" /></div><p className="absolute bottom-2 left-3 font-handwritten text-xs">come hungry</p></div>
          <div className="absolute right-[2%] top-[8%] z-20 rotate-[5deg] bg-orange px-5 py-4 text-paper shadow-card"><p className="text-center text-[10px] font-black uppercase tracking-[.18em]">Saturday</p><p className="font-editorial text-5xl font-semibold leading-none">22</p><p className="text-center text-[10px] font-black uppercase tracking-[.18em]">August</p></div>
          <div className="absolute bottom-[17%] left-[3%] z-20 -rotate-[5deg] rounded-full bg-tomato px-5 py-3 font-handwritten text-sm font-bold text-paper shadow-card">wear a little color ↗</div>
        </div>
        <div className="lg:pl-4">
          <p className="font-handwritten text-xl text-tomato">Lukas, Maya & Ari invite you to</p>
          <h1 className="mt-3 font-editorial text-[4.6rem] font-semibold leading-[.82] tracking-[-.055em] sm:text-[6.3rem]">The Last<br /><span className="font-display text-tomato">Light Supper</span></h1>
          <div className="mt-8 editorial-rule pt-5"><p className="text-sm font-bold uppercase tracking-[.18em]">Saturday, August 22 · 6:30 PM</p><p className="mt-2 flex items-center gap-2 text-sm text-ink/55"><MapPin size={15} /> Lukas’ backyard · Providence, Rhode Island</p></div>
          <p className="mt-6 max-w-xl font-editorial text-2xl leading-relaxed">A late-summer dinner in the garden, served family style as the sun goes down.</p>
          <div className="mt-7 flex flex-wrap gap-2"><span className="chip bg-white/45">Mediterranean-inspired</span><span className="chip bg-white/45">Garden color</span><span className="chip bg-white/45">Outdoor</span></div>
          <a href="#rsvp" className="btn-primary mt-8 px-8">RSVP to dinner <ChevronDown size={16} /></a>
        </div>
      </section>

      <section className="bg-ink px-5 py-20 text-paper md:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="eyebrow !text-paper/45">On the table</p><h2 className="mt-3 font-editorial text-6xl font-semibold leading-[.9]">The menu</h2><p className="mt-5 font-handwritten text-lg text-orange">served in the middle, passed around, seconds encouraged</p></div><div className="divide-y divide-paper/15 border-y border-paper/15">{[["Welcome", "Heirloom tomato tart", "crème fraîche · basil · flaky pastry"],["Main", "Charred lemon chicken", "oregano · garlic · pan juices"],["Alongside", "Herby greens & tahini", "charred lemon · toasted seeds"],["Something sweet", "Citrus olive oil cake", "berries · whipped cream"]].map(([course,dish,detail])=><article key={dish} className="grid gap-2 py-6 sm:grid-cols-[150px_1fr]"><p className="text-xs font-bold uppercase tracking-widest text-orange">{course}</p><div><h3 className="font-editorial text-3xl font-semibold">{dish}</h3><p className="mt-1 text-sm text-paper/45">{detail}</p></div></article>)}</div></div>
          <div className="mt-14 grid gap-4 md:grid-cols-3"><article className="rounded-[1.5rem] bg-[#312720] p-5"><Sparkles className="text-orange" size={19}/><p className="mt-5 text-xs font-bold uppercase tracking-widest text-paper/45">Dress</p><p className="mt-2 font-editorial text-2xl font-semibold">Garden color</p><p className="mt-2 text-xs leading-relaxed text-paper/45">Anything festive, relaxed, and comfortable outside.</p></article><article className="rounded-[1.5rem] bg-[#312720] p-5"><Wine className="text-orange" size={19}/><p className="mt-5 text-xs font-bold uppercase tracking-widest text-paper/45">Bring</p><p className="mt-2 font-editorial text-2xl font-semibold">A bottle you love</p><p className="mt-2 text-xs leading-relaxed text-paper/45">Optional. Wine, sparkling water, or something surprising.</p></article><article className="overflow-hidden rounded-[1.5rem]"><img src="/photos/party-07.webp" alt="Wine poured at dinner" className="h-full min-h-52 w-full object-cover" /></article></div>
        </div>
      </section>

      <section id="rsvp" className="px-5 py-20 md:px-10 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="font-handwritten text-xl text-tomato">Save your seat</p><h2 className="mt-3 font-editorial text-6xl font-semibold leading-[.9]">Will you join us?</h2><p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/55">Your response helps the kitchen scale the recipes. Allergies are shared privately with the hosts and highlighted in the menu plan.</p><div className="mt-8 h-80 overflow-hidden rounded-[1.75rem] rotate-[-2deg] bg-white p-2 pb-9 shadow-card"><img src="/photos/party-08.webp" alt="Friends laughing around a dinner table" className="h-full w-full object-cover" /><p className="mt-2 pl-2 font-handwritten text-xs">there’s always room at the table</p></div></div>
          <div className="card p-6 md:p-8">
            {!submitted ? <form onSubmit={(e)=>{e.preventDefault();setSubmitted(true)}}><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold">Your name</span><input className="field" required placeholder="Name" /></label><label><span className="mb-2 block text-xs font-semibold">Email</span><input className="field" type="email" required placeholder="you@example.com" /></label></div><fieldset className="mt-6"><legend className="text-xs font-semibold">RSVP</legend><div className="mt-3 grid grid-cols-3 gap-2">{["Attending","Maybe","Can’t make it"].map((item)=><button type="button" key={item} onClick={()=>setRsvp(item)} className={`rounded-2xl border px-3 py-4 text-xs font-bold ${rsvp===item ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white/35"}`}>{item}</button>)}</div></fieldset><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-xs font-semibold">Plus-one count</span><select className="field"><option>0</option><option>1</option><option>2</option></select></label><label><span className="mb-2 block text-xs font-semibold">Dietary preference</span><select className="field"><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Pescatarian</option><option>Other</option></select></label></div><label className="mt-4 block"><span className="mb-2 block text-xs font-semibold">Allergies</span><input className="field" placeholder="e.g. gluten, sesame, shellfish" /></label><label className="mt-4 block"><span className="mb-2 block text-xs font-semibold">Note for the hosts</span><textarea className="field min-h-28" placeholder="Anything else we should know?" /></label><button type="submit" className="btn-primary mt-6 w-full">Send RSVP <PartyPopper size={16}/></button></form> : <div className="flex min-h-[470px] flex-col items-center justify-center text-center"><div className="grid h-20 w-20 place-items-center rounded-full bg-olive text-paper"><Check size={32}/></div><p className="mt-7 font-handwritten text-xl text-tomato">You’re on the list.</p><h3 className="mt-2 font-editorial text-5xl font-semibold">See you at sunset.</h3><p className="mt-4 max-w-md text-sm leading-relaxed text-ink/55">Your RSVP has been sent to the hosts. Any allergy details will be checked against the menu.</p><button className="btn-secondary mt-7" onClick={()=>setSubmitted(false)}>Edit response</button></div>}
          </div>
        </div>
      </section>
      <footer className="border-t border-ink/10 px-5 py-10 md:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><Brand compact /><p className="text-xs text-ink/45">A dinner invitation made with plated.</p></div></footer>
    </main>
  );
}
