"use client";

import { deleteGuest } from "@/lib/actions/parties";
import { usePartyAccess } from "@/lib/party/access-client";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export function GuestActions({ guestId, guestName, partyId }: { guestId: string; guestName: string; partyId: string }) {
  const [pending, startTransition] = useTransition();
  const { canEdit } = usePartyAccess();
  if (!canEdit) return null;

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-icon h-9 w-9 shrink-0"
      aria-label={`Remove ${guestName}`}
      onClick={() => startTransition(async () => { await deleteGuest(guestId, partyId); })}
    >
      <Trash2 size={14} />
    </button>
  );
}
