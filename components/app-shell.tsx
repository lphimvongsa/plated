"use client";

import { Brand } from "@/components/brand";
import { Bell, BookOpen, CalendarDays, ChefHat, Home, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const nav = [
  { href: "/app", label: "Home", icon: Home, match: (pathname: string) => pathname === "/app" },
  {
    href: "/app/parties",
    label: "Parties",
    icon: CalendarDays,
    match: (pathname: string) => pathname.startsWith("/app/parties"),
  },
  {
    href: "/app/recipes",
    label: "Cookbook",
    icon: BookOpen,
    match: (pathname: string) => pathname.startsWith("/app/recipes"),
  },
  {
    href: "/app/inbox",
    label: "Inbox",
    icon: Bell,
    match: (pathname: string) => pathname.startsWith("/app/inbox"),
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: Settings,
    match: (pathname: string) => pathname.startsWith("/app/settings"),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="editorial-app min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-ink/15 bg-[#eee8dc] lg:flex lg:flex-col">
        <div className="border-b border-ink/15 px-6 py-7">
          <Brand compact />
        </div>

        <div className="px-6 py-6">
          <Link href="/app/parties/new" className="btn-primary w-full justify-between">
            New party <Plus size={15} />
          </Link>
        </div>

        <nav className="border-y border-ink/15">
          {nav.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`group flex items-center gap-3 border-b border-ink/10 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.12em] transition last:border-b-0 ${
                  active
                    ? "border-l-[3px] border-l-tomato bg-[#f7f3eb] text-tomato"
                    : "border-l-[3px] border-l-transparent text-ink/58 hover:bg-[#f7f3eb] hover:text-ink"
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
          <p className="mt-3 font-editorial text-2xl font-semibold leading-[0.95]">Plan the next table.</p>
          <div className="mt-4 h-px bg-ink/15">
            <div className="h-px w-[40%] bg-tomato" />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/45">Open a party to track progress</p>
        </div>

        <div className="mt-auto border-t border-ink/15 px-6 py-5">
          <Link href="/app/settings" className="flex items-center gap-3 transition hover:opacity-80">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/25 bg-paper font-editorial text-sm font-semibold">
              ··
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">Host account</p>
              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.12em] text-ink/38">Signed in</p>
            </div>
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-[62px] items-center border-b border-tomato bg-tomato px-4 lg:hidden">
        <Brand compact light />
      </header>

      <main className="pb-[76px] lg:ml-[228px] lg:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink/20 bg-[#f7f3eb]/98 px-1 py-1.5 backdrop-blur lg:hidden">
        {nav.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={label}
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
