"use client";

import { Modal } from "@/components/modal";
import { addManualGroceryItem } from "@/lib/actions/shopping";
import { usePartyAccess } from "@/lib/party/access-client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AddShoppingItem({ partyId }: { partyId: string }) {
  const { canEdit } = usePartyAccess();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  return <>
    <button type="button" className="btn-secondary" onClick={() => setOpen(true)}><Plus size={16}/> Add item</button>
    <Modal open={open} onClose={() => !pending && setOpen(false)} title="Add grocery item">
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const name = String(form.get("name") ?? "").trim();
        if (!name) { setError("Give the item a name."); return; }
        setError(null);
        startTransition(async () => {
          const result = await addManualGroceryItem(partyId, {
            name,
            quantity: String(form.get("quantity") ?? "") || null,
            unit: String(form.get("unit") ?? "").trim() || null,
            category: String(form.get("category") ?? "").trim() || null,
          });
          if (result.error) { setError(result.error); return; }
          setOpen(false);
          router.refresh();
        });
      }}>
        <label><span className="mb-2 block text-xs font-semibold">Item</span><input autoFocus className="field" name="name" placeholder="Extra lemons"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="mb-2 block text-xs font-semibold">Quantity</span><input className="field" name="quantity" inputMode="decimal" placeholder="2"/></label>
          <label><span className="mb-2 block text-xs font-semibold">Unit</span><input className="field" name="unit" placeholder="each"/></label>
        </div>
        <label><span className="mb-2 block text-xs font-semibold">Category</span><input className="field" name="category" placeholder="Produce"/></label>
        {error ? <p className="text-sm font-semibold text-tomato">{error}</p> : null}
        <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" disabled={pending}><Plus size={15}/>{pending ? "Adding…" : "Add item"}</button></div>
      </form>
    </Modal>
  </>;
}
