"use client";

import { acceptCollaboratorInvite } from "@/lib/actions/collaborators";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AcceptCollaboratorButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn-primary !px-3 !py-2"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptCollaboratorInvite(token);
            if (!result.ok || !result.partyId) {
              setError(result.error ?? "Could not accept.");
              return;
            }
            router.push(`/app/parties/${result.partyId}`);
            router.refresh();
          });
        }}
      >
        <Check size={14} /> {pending ? "Accepting…" : "Accept"}
      </button>
      {error ? <p className="text-xs font-semibold text-tomato">{error}</p> : null}
    </div>
  );
}
