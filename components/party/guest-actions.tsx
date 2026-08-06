"use client";

import { addGuest, regenerateInvite, revokeInvite } from "@/lib/actions/parties";
import { Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

export function CopyInviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn-icon"
      aria-label="Copy invite link"
      onClick={async () => {
        const url = `${window.location.origin}/invite/${token}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy size={15} />
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function InviteActions({
  inviteId,
  partyId,
  revoked,
}: {
  inviteId: string;
  partyId: string;
  revoked: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      {!revoked ? (
        <button
          type="button"
          disabled={pending}
          className="btn-icon h-8 w-8"
          aria-label="Revoke invite"
          onClick={() =>
            startTransition(async () => {
              await revokeInvite(inviteId, partyId);
            })
          }
        >
          <Trash2 size={14} />
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className="btn-icon h-8 w-8"
        aria-label="Regenerate invite"
        onClick={() =>
          startTransition(async () => {
            await regenerateInvite(inviteId, partyId);
          })
        }
      >
        <RefreshCw size={14} />
      </button>
    </div>
  );
}

export function AddGuestForm({ partyId }: { partyId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add guest
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await addGuest(partyId, formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          event.currentTarget.reset();
          setOpen(false);
        });
      }}
    >
      <label className="flex-1">
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em]">Name</span>
        <input className="field" name="name" required placeholder="Guest name" />
      </label>
      <label className="flex-1">
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em]">Email</span>
        <input className="field" name="email" type="email" placeholder="optional" />
      </label>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </button>
      <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {error ? <p className="text-xs font-semibold text-tomato sm:col-span-full">{error}</p> : null}
    </form>
  );
}
