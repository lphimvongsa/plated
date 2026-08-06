"use client";

import { deleteParty } from "@/lib/actions/parties";
import { ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

type PartyListItemProps = {
  party: {
    id: string;
    name: string;
    location: string | null;
    hero_image: string | null;
  };
  whenLabel: string;
  attending: number;
  dishes: number;
  countdown: string;
  role: string | null;
  canDelete: boolean;
  tense: "upcoming" | "past";
};

export function PartyListItem({
  party,
  whenLabel,
  attending,
  dishes,
  countdown,
  role,
  canDelete,
  tense,
}: PartyListItemProps) {
  const [deleting, startDelete] = useTransition();

  return (
    <div className="group grid gap-5 border-b border-ink/15 py-6 md:grid-cols-[170px_1fr_auto] md:items-center">
      <Link href={`/app/parties/${party.id}`} className="contents">
        <div className={`h-28 overflow-hidden md:h-24 ${tense === "past" ? "opacity-70 grayscale" : ""}`}>
          <img
            src={party.hero_image || "/photos/party-01.webp"}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-tomato">{whenLabel}</p>
          <h3 className="mt-2 font-editorial text-3xl font-semibold leading-none transition group-hover:text-tomato md:text-4xl">
            {party.name}
          </h3>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink/45">
            <span>{party.location || "Location TBD"}</span>
            <span>
              {attending} attending · {dishes} dish{dishes === 1 ? "" : "es"}
            </span>
            {role ? <span>You are {role}</span> : null}
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3 md:justify-end">
        <Link
          href={`/app/parties/${party.id}`}
          className="flex items-center gap-4 text-ink/42 transition group-hover:text-ink"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]">{countdown}</span>
          <ArrowRight size={18} className="text-ink/28 transition group-hover:translate-x-1 group-hover:text-tomato" />
        </Link>
        {canDelete ? (
          <button
            type="button"
            disabled={deleting}
            className="btn-icon shrink-0 text-ink/35 hover:border-tomato hover:text-tomato"
            aria-label={`Delete ${party.name}`}
            title="Delete party"
            onClick={() => {
              if (!window.confirm(`Delete “${party.name}” permanently? This cannot be undone.`)) return;
              startDelete(async () => {
                await deleteParty(party.id);
              });
            }}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
