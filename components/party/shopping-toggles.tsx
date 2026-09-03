"use client";

import { toggleGroceryOwned, toggleGroceryPurchased } from "@/lib/actions/parties";
import { usePartyAccess } from "@/lib/party/access-client";
import { Check } from "lucide-react";
import { useTransition } from "react";

export function GroceryPurchasedToggle({
  itemId,
  partyId,
  purchased,
  owned,
}: {
  itemId: string;
  partyId: string;
  purchased: boolean;
  owned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { canEdit } = usePartyAccess();

  return (
    <button
      type="button"
      disabled={owned || pending || !canEdit}
      onClick={() =>
        startTransition(async () => {
          await toggleGroceryPurchased(itemId, !purchased, partyId);
        })
      }
      className={`grid h-7 w-7 place-items-center rounded-full border ${
        purchased
          ? "border-olive bg-olive text-paper"
          : owned
            ? "border-ink/10 bg-ink/10 text-ink/35"
            : "border-ink/25"
      }`}
      aria-label={purchased ? "Mark not purchased" : "Mark purchased"}
    >
      {purchased || owned ? <Check size={14} /> : null}
    </button>
  );
}

export function GroceryOwnedToggle({
  itemId,
  partyId,
  owned,
}: {
  itemId: string;
  partyId: string;
  owned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { canEdit } = usePartyAccess();

  return (
    <button
      type="button"
      disabled={pending || !canEdit}
      onClick={() =>
        startTransition(async () => {
          await toggleGroceryOwned(itemId, !owned, partyId);
        })
      }
      className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${owned ? "text-olive" : "text-tomato"}`}
    >
      {owned ? "In pantry" : "I have this"}
    </button>
  );
}
