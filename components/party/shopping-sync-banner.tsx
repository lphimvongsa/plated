"use client";

import { regenerateShoppingList } from "@/lib/actions/shopping";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ShoppingSyncBanner({ partyId }: { partyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await regenerateShoppingList(partyId);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update shopping data.");
      }
    });
  }

  return (
    <div className="rounded-[2px] border border-orange/30 bg-orange/8 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange">
            <AlertTriangle size={14} /> Totals are updating
          </p>
          <h3 className="mt-2 font-editorial text-2xl font-semibold">Showing the last saved shopping list</h3>
          <p className="mt-2 max-w-xl text-sm text-ink/55">
            Menu or guest-count changes are still being applied. You can keep using this snapshot or update it now.
          </p>
          {error ? <p className="mt-3 text-sm font-semibold text-tomato">{error}</p> : null}
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={handleRefresh} disabled={pending}>
          <RefreshCw size={15} className={pending ? "animate-spin" : ""} />
          {pending ? "Updating…" : "Update now"}
        </button>
      </div>
    </div>
  );
}
