"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/20 bg-paper p-5 shadow-paper md:max-w-2xl md:rounded-[2rem] md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-editorial text-3xl font-semibold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
