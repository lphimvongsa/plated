"use client";

import { party } from "@/lib/mock-data";
import { ChevronLeft, ExternalLink, MoreHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const tabs = [
  ["/app/parties/summer-table", "Overview"],
  ["/app/parties/summer-table/menu", "Menu"],
  ["/app/parties/summer-table/recipes", "Recipes"],
  ["/app/parties/summer-table/guests", "Guests"],
  ["/app/parties/summer-table/shopping", "Shopping"],
  ["/app/parties/summer-table/timeline", "Timeline"],
  ["/app/parties/summer-table/costs", "Costs"],
  ["/app/parties/summer-table/settings", "Settings"],
] as const;

export function PartyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="border-b border-ink/15 bg-[#f7f3eb] px-4 py-6 md:px-8 xl:px-12">
        <div className="mx-auto max-w-7xl">
          <Link href="/app" className="editorial-link text-ink/45 hover:text-tomato">
            <ChevronLeft size={13} /> All parties
          </Link>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-bold uppercase tracking-[0.16em] text-ink/48">
                <span className="text-tomato">Upcoming</span>
                <span>{party.date}</span>
                <span>{party.time}</span>
              </div>
              <h1 className="mt-2 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] text-tomato md:text-7xl">
                {party.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-2 flex -space-x-2">
                {party.collaborators.map((initials, index) => (
                  <div
                    key={initials}
                    className={`grid h-9 w-9 place-items-center rounded-full border-2 border-[#f7f3eb] text-[9px] font-bold ${
                      index === 0 ? "bg-tomato text-paper" : index === 1 ? "bg-olive text-paper" : "bg-blush text-ink"
                    }`}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <Link href="/app/parties/summer-table/guests" className="btn-secondary">
                <Users size={15} /> Invite
              </Link>
              <Link href="/invite/summer-table" className="btn-secondary" target="_blank">
                <ExternalLink size={15} /> Preview
              </Link>
              <button className="btn-icon" aria-label="More party actions">
                <MoreHorizontal size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[62px] z-20 overflow-x-auto border-b border-ink/15 bg-paper/96 px-4 backdrop-blur lg:top-0 md:px-8 xl:px-12">
        <nav className="mx-auto flex max-w-7xl min-w-max gap-7">
          {tabs.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`border-b-2 py-3 text-[10px] font-bold uppercase tracking-[0.13em] transition ${
                  active ? "border-tomato text-tomato" : "border-transparent text-ink/48 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl p-4 md:p-8 xl:px-12 xl:py-10">{children}</div>
    </div>
  );
}
