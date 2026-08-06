"use client";

import { formatPartyWhen } from "@/lib/calendar";
import { ChevronLeft, ExternalLink, MoreHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export type PartyShellParty = {
  id: string;
  name: string;
  starts_at: string;
  timezone: string;
  status: string;
};

type PartyShellProps = {
  party: PartyShellParty;
  collaborators: string[];
  previewToken: string | null;
  children: ReactNode;
};

export function PartyShell({ party, collaborators, previewToken, children }: PartyShellProps) {
  const pathname = usePathname();
  const base = `/app/parties/${party.id}`;
  const { date, time } = formatPartyWhen(party.starts_at, party.timezone);
  const statusLabel = party.status === "scheduled" ? "Upcoming" : party.status;

  const tabs = [
    [base, "Overview"],
    [`${base}/menu`, "Menu"],
    [`${base}/recipes`, "Recipes"],
    [`${base}/guests`, "Guests"],
    [`${base}/shopping`, "Shopping"],
    [`${base}/timeline`, "Timeline"],
    [`${base}/costs`, "Costs"],
    [`${base}/settings`, "Settings"],
  ] as const;

  const previewHref = previewToken ? `/invite/${previewToken}` : `${base}/guests`;

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
                <span className="text-tomato">{statusLabel}</span>
                <span>{date}</span>
                <span>{time}</span>
              </div>
              <h1 className="mt-2 font-editorial text-5xl font-semibold leading-[0.84] tracking-[-0.045em] text-tomato md:text-7xl">
                {party.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {collaborators.length > 0 ? (
                <div className="mr-2 flex -space-x-2">
                  {collaborators.map((initials, index) => (
                    <div
                      key={`${initials}-${index}`}
                      className={`grid h-9 w-9 place-items-center rounded-full border-2 border-[#f7f3eb] text-[9px] font-bold ${
                        index === 0 ? "bg-tomato text-paper" : index === 1 ? "bg-olive text-paper" : "bg-blush text-ink"
                      }`}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
              ) : null}
              <Link href={`${base}/guests`} className="btn-secondary">
                <Users size={15} /> Invite
              </Link>
              {previewToken ? (
                <Link href={previewHref} className="btn-secondary" target="_blank">
                  <ExternalLink size={15} /> Preview
                </Link>
              ) : (
                <Link href={`${base}/guests`} className="btn-secondary">
                  <ExternalLink size={15} /> Preview
                </Link>
              )}
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
