"use client";

import { syncPartyTimeline } from "@/lib/actions/timeline";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function TimelineSyncBanner({ partyId }: { partyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function handleSync() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await syncPartyTimeline(partyId, { mode: "structural" });
        if (result.error) {
          setError(result.error);
          return;
        }
        setDismissed(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not sync timeline.");
      }
    });
  }

  return (
    <div className="rounded-[2px] border border-orange/30 bg-orange/8 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange">
            <AlertTriangle size={14} /> Timeline out of date
          </p>
          <h3 className="mt-2 font-editorial text-2xl font-semibold">Recipe tasks changed</h3>
          <p className="mt-2 max-w-xl text-sm text-ink/55">
            New, removed, or retimed tasks/steps need a timeline update. Description-only edits were already
            applied.
          </p>
          {error ? <p className="mt-3 text-sm font-semibold text-tomato">{error}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setDismissed(true)} disabled={pending}>
            Not now
          </button>
          <button type="button" className="btn-primary" onClick={handleSync} disabled={pending}>
            <RefreshCw size={15} /> {pending ? "Updating…" : "Update timeline"}
          </button>
        </div>
      </div>
    </div>
  );
}
