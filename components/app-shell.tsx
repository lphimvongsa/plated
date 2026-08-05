"use client";

import { Brand } from "@/components/brand";
import { Bell, BookOpen, CalendarDays, ChefHat, Home, Menu, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

const nav = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/parties/summer-table", label: "Parties", icon: CalendarDays },
  { href: "/app/recipes", label: "Cookbook", icon: BookOpen },
  { href: "/app/inbox", label: "Inbox", icon: Bell },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="editorial-app min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-ink/15 bg-[#eee8dc] lg:flex lg:flex-col">
        <div className="border-b border-ink/15 px-6 py-7">
          <div className="flex items-start justify-between gap-3">
            <Brand compact />
            <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-ink/38">prototype</span>
          </div>
          <p className="mt-4 max-w-[160px] font-editorial text-[1.05rem] leading-[1.05] text-ink/58">
            Dinner parties,<br />planned beautifully.
          </p>
        </div>

        <div className="px-6 py-6">
          <Link href="/app/parties/new" className="btn-primary w-full justify-between">
            New party <Plus size={15} />
          </Link>
        </div>

        <nav className="border-y border-ink/15">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/app" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 border-b border-ink/10 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.12em] transition last:border-b-0 ${
                  active ? "border-l-[3px] border-l-tomato bg-[#f7f3eb] text-tomato" : "border-l-[3px] border-l-transparent text-ink/58 hover:bg-[#f7f3eb] hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={1.7} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-6 mt-7 border-y border-ink/20 py-5">
          <div className="flex items-center gap-2 text-tomato">
            <ChefHat size={17} strokeWidth={1.6} />
            <span className="text-[9px] font-bold uppercase tracking-[0.16em]">Next dinner</span>
          </div>
          <p className="mt-3 font-editorial text-2xl font-semibold leading-[0.95]">17 days to the table.</p>
          <div className="mt-4 h-px bg-ink/15">
            <div className="h-px w-[78%] bg-tomato" />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/45">Menu 78% ready</p>
        </div>

        <div className="mt-auto border-t border-ink/15 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/25 bg-paper font-editorial text-sm font-semibold">LP</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">Lukas Phimvongsa</p>
              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.12em] text-ink/38">Host account</p>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-ink/15 bg-paper/95 px-4 backdrop-blur lg:hidden">
        <Brand compact />
        <button className="btn-icon" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu size={18} />
        </button>
      </header>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm lg:hidden"
          onMouseDown={(event) => event.currentTarget === event.target && setMobileOpen(false)}
        >
          <aside className="h-full w-[86%] max-w-sm border-r border-ink/15 bg-paper shadow-paper">
            <div className="flex items-center justify-between border-b border-ink/15 px-5 py-5">
              <Brand compact />
              <button className="btn-icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <Link href="/app/parties/new" onClick={() => setMobileOpen(false)} className="btn-primary w-full justify-between">
                New party <Plus size={15} />
              </Link>
            </div>
            <nav className="border-y border-ink/15">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/app" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 border-b border-ink/10 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.12em] last:border-b-0 ${
                      active ? "border-l-[3px] border-l-tomato text-tomato" : "border-l-[3px] border-l-transparent text-ink/62"
                    }`}
                  >
                    <Icon size={16} /> {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}

      <main className="pb-[76px] lg:ml-[228px] lg:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink/20 bg-[#f7f3eb]/98 px-1 py-1.5 backdrop-blur lg:hidden">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/app" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-1 border-t-2 text-[8px] font-bold uppercase tracking-[0.08em] ${
                active ? "border-tomato text-tomato" : "border-transparent text-ink/48"
              }`}
            >
              <Icon size={16} strokeWidth={1.7} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
