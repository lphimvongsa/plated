"use client";

import { PartyAccessProvider, usePartyAccess } from "@/lib/party/access-client";
import { formatPartyWhen } from "@/lib/calendar";
import { PartyThemeBridge } from "@/components/party-theme-bridge";
import { partyThemeCssVars } from "@/lib/party/themes";
import { ChevronLeft, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export type PartyShellParty = {
  id: string;
  name: string;
  starts_at: string;
  timezone: string;
  status: string;
  color_scheme: string;
};

type PartyShellProps = {
  party: PartyShellParty;
  collaborators: string[];
  previewToken: string | null;
  role: string | null;
  children: ReactNode;
};

export function PartyShell({ party, collaborators, previewToken, role, children }: PartyShellProps) {
  return (
    <PartyAccessProvider role={role}>
      <PartyShellFrame party={party} collaborators={collaborators} previewToken={previewToken}>
        {children}
      </PartyShellFrame>
    </PartyAccessProvider>
  );
}

function PartyShellFrame({
  party,
  collaborators,
  previewToken,
  children,
}: Omit<PartyShellProps, "role">) {
  const pathname = usePathname();
  const { canEdit } = usePartyAccess();
  const base = `/app/parties/${party.id}`;
  const { date, time } = formatPartyWhen(party.starts_at, party.timezone);
  const statusLabel = party.status === "scheduled" ? "Upcoming" : party.status;

  const tabs = [
    [base, "Overview"],
    [`${base}/menu`, "Menu"],
    [`${base}/recipes`, "Recipes"],
    [`${base}/invitation`, "Invitation"],
    [`${base}/guests`, "Guests"],
    [`${base}/shopping`, "Shopping"],
    [`${base}/timeline`, "Timeline"],
    [`${base}/costs`, "Costs"],
    [`${base}/settings`, "Settings"],
  ] as const;

  const previewHref = previewToken ? `/invite/${previewToken}` : `${base}/invitation`;
  const lockViewport = pathname === `${base}/invitation` || pathname === `${base}/settings`;

  return (
    <>
      <PartyThemeBridge scheme={party.color_scheme} />
      <div
        className={`party-theme bg-paper text-ink ${lockViewport ? "flex h-full min-h-0 flex-col overflow-hidden" : "min-h-full"}`}
        style={partyThemeCssVars(party.color_scheme)}
      >
      {!canEdit ? (
        <div className="shrink-0 border-b border-olive/25 bg-olive/10 px-4 py-2.5 text-center text-xs font-semibold text-olive md:px-8 xl:px-12">
          You are a helper on this party. You can view every detail, but you cannot make changes.
        </div>
      ) : null}
      <div className="shrink-0 border-b border-ink/15 bg-paper-2 px-4 py-6 md:px-8 xl:px-12">
        <div className="mx-auto max-w-7xl">
          <Link href="/app/parties" className="editorial-link text-ink/45 hover:text-tomato">
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
                      className={`grid h-9 w-9 place-items-center rounded-full border-2 border-paper-2 text-[9px] font-bold ${
                        index === 0 ? "bg-tomato text-paper" : index === 1 ? "bg-olive text-paper" : "bg-blush text-ink"
                      }`}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
              ) : null}
              <Link href={`${base}/settings`} className="btn-secondary">
                <Users size={15} /> Collaborators
              </Link>
              <Link href={`${base}/guests`} className="btn-secondary">
                Invite guests
              </Link>
              {previewToken ? (
                <Link href={previewHref} className="btn-secondary" target="_blank">
                  <ExternalLink size={15} /> Preview
                </Link>
              ) : (
                <Link href={`${base}/invitation`} className="btn-secondary">
                  <ExternalLink size={15} /> Preview
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[62px] z-20 shrink-0 overflow-x-auto border-b border-ink/15 bg-paper/96 px-4 backdrop-blur lg:top-0 md:px-8 xl:px-12">
        <nav className="mx-auto flex max-w-7xl min-w-max gap-2 py-1.5">
          {tabs.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-[2px] border border-transparent px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.13em] transition duration-200 ${
                  active
                    ? "border-tomato/25 bg-tomato/[0.08] text-tomato"
                    : "text-ink/48 hover:-translate-y-0.5 hover:border-ink/10 hover:bg-paper-2 hover:text-tomato hover:shadow-[0_6px_16px_rgba(41,35,31,0.08)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className={
          lockViewport
            ? "mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden p-4 md:px-8 md:py-6 xl:px-12"
            : "mx-auto max-w-7xl p-4 md:p-8 xl:px-12 xl:py-10"
        }
      >
        {children}
      </div>
      </div>
    </>
  );
}
