import { Bell, CheckCircle2, Clock3, Mail, UserPlus } from "lucide-react";

const items = [
  [UserPlus, "Nina RSVP’d yes", "She added a gluten allergy. Two recipes were flagged for review.", "8 minutes ago"],
  [CheckCircle2, "Maya completed ‘Marinate chicken’", "The next dependent task is still on schedule.", "Yesterday"],
  [Mail, "Invitation delivered to 12 guests", "Two phone numbers are still missing for SMS delivery.", "Yesterday"],
  [Clock3, "Timeline check-in coming up", "Bake the olive oil cake Saturday at 10:00 AM.", "Aug 22"],
];

export default function InboxPage() {
  return <div className="p-4 md:p-8 xl:p-12"><div className="mx-auto max-w-4xl"><p className="eyebrow">Inbox</p><h1 className="mt-2 font-editorial text-5xl font-semibold md:text-6xl">The party, in motion.</h1><p className="mt-4 text-sm text-ink/55">RSVPs, task updates, timeline shifts, and invitations appear here.</p><div className="mt-10 overflow-hidden rounded-[1.75rem] border border-ink/10 bg-[#f8f2e8] shadow-card"><div className="flex items-center justify-between border-b border-ink/10 p-5"><div className="flex items-center gap-2"><Bell size={18} /><span className="text-sm font-bold">All activity</span></div><button className="text-xs font-bold text-tomato">Mark all read</button></div><div className="divide-y divide-ink/8">{items.map(([Icon,title,copy,time],i) => { const I=Icon as typeof Bell; return <article key={title as string} className={`flex gap-4 p-5 md:p-6 ${i<2 ? "bg-orange/4" : ""}`}><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${i===0 ? "bg-tomato text-paper" : "bg-ink/5"}`}><I size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-bold">{title as string}</h2><span className="text-[11px] text-ink/40">{time as string}</span></div><p className="mt-2 text-sm leading-relaxed text-ink/52">{copy as string}</p></div></article>})}</div></div></div></div>
}
