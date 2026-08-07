"use client";

import { Modal } from "@/components/modal";
import { addRecipeToPartyMenu } from "@/lib/actions/parties";
import type { PartyOption } from "@/lib/cookbook";
import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export function AddToPartyMenuButton({
  recipeId,
  recipeTitle,
  parties,
}: {
  recipeId: string;
  recipeTitle: string;
  parties: PartyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(parties[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sortedParties = useMemo(
    () =>
      [...parties].sort((a, b) => {
        const aTime = a.starts_at ? new Date(a.starts_at).getTime() : 0;
        const bTime = b.starts_at ? new Date(b.starts_at).getTime() : 0;
        return aTime - bTime;
      }),
    [parties],
  );

  return (
    <>
      <button
        className="btn-secondary"
        onClick={() => {
          setSelectedPartyId(sortedParties[0]?.id ?? "");
          setMessage(null);
          setOpen(true);
        }}
      >
        <Plus size={15} /> Add to party menu
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add to party menu">
        <p className="text-sm text-ink/55">
          Add <span className="font-semibold text-ink">{recipeTitle}</span> to a party menu.
        </p>
        {message ? <p className="mt-3 text-sm font-semibold text-olive">{message}</p> : null}
        {sortedParties.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-ink/10 bg-white/40 p-5">
            <p className="font-editorial text-2xl font-semibold">No parties yet</p>
            <Link href="/app/parties/new" className="btn-primary mt-5 w-full" onClick={() => setOpen(false)}>
              <Plus size={16} /> New party
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {sortedParties.map((party) => (
              <button
                key={party.id}
                onClick={() => setSelectedPartyId(party.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                  selectedPartyId === party.id
                    ? "border-tomato bg-tomato/5"
                    : "border-ink/15 bg-white/40 hover:border-tomato/50"
                }`}
              >
                <span>
                  <span className="block font-editorial text-xl font-semibold">{party.name}</span>
                  <span className="mt-1 block text-xs text-ink/45">
                    {party.starts_at
                      ? new Intl.DateTimeFormat("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(party.starts_at))
                      : "Date TBD"}
                  </span>
                </span>
                {selectedPartyId === party.id ? <Check size={18} className="text-tomato" /> : null}
              </button>
            ))}
            <button
              className="btn-primary mt-4 w-full"
              disabled={pending || !selectedPartyId}
              onClick={() => {
                startTransition(async () => {
                  const result = await addRecipeToPartyMenu(selectedPartyId, recipeId);
                  if (result.error) {
                    setMessage(result.error);
                    return;
                  }
                  setMessage(result.alreadyOnMenu ? "Already on that party menu." : "Added to party menu.");
                  router.refresh();
                  if (!result.alreadyOnMenu) {
                    window.setTimeout(() => setOpen(false), 700);
                  }
                });
              }}
            >
              {pending ? "Adding…" : "Add to party menu"}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
