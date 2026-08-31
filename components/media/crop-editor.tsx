"use client";

import { normalizeCrop, type CropRect } from "@/lib/media/crop";
import { Check, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DragState =
  | { kind: "move"; pointerX: number; pointerY: number; start: CropRect }
  | { kind: "resize"; corner: "nw" | "ne" | "sw" | "se"; pointerX: number; pointerY: number; start: CropRect };

const MIN_SIZE = 0.12;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CropEditor({
  open,
  src,
  value,
  onCancel,
  onSave,
  title = "Crop image",
}: {
  open: boolean;
  src: string;
  value?: CropRect | null;
  onCancel: () => void;
  onSave: (crop: CropRect) => void;
  title?: string;
}) {
  const [crop, setCrop] = useState<CropRect>(() => normalizeCrop(value));
  const [drag, setDrag] = useState<DragState | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [imageRatio, setImageRatio] = useState(4 / 3);

  useEffect(() => {
    if (open) setCrop(normalizeCrop(value));
  }, [open, value]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (event: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (event.clientX - drag.pointerX) / rect.width;
      const dy = (event.clientY - drag.pointerY) / rect.height;
      if (drag.kind === "move") {
        setCrop({
          ...drag.start,
          x: clamp(drag.start.x + dx, 0, 1 - drag.start.width),
          y: clamp(drag.start.y + dy, 0, 1 - drag.start.height),
        });
        return;
      }

      const start = drag.start;
      let x = start.x;
      let y = start.y;
      let width = start.width;
      let height = start.height;
      if (drag.corner.includes("e")) width = clamp(start.width + dx, MIN_SIZE, 1 - start.x);
      if (drag.corner.includes("s")) height = clamp(start.height + dy, MIN_SIZE, 1 - start.y);
      if (drag.corner.includes("w")) {
        const nextX = clamp(start.x + dx, 0, start.x + start.width - MIN_SIZE);
        width = start.width + (start.x - nextX);
        x = nextX;
      }
      if (drag.corner.includes("n")) {
        const nextY = clamp(start.y + dy, 0, start.y + start.height - MIN_SIZE);
        height = start.height + (start.y - nextY);
        y = nextY;
      }
      setCrop(normalizeCrop({ x, y, width, height }));
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  if (!open) return null;

  const beginMove = (event: React.PointerEvent) => {
    event.preventDefault();
    setDrag({ kind: "move", pointerX: event.clientX, pointerY: event.clientY, start: crop });
  };
  const beginResize = (corner: "nw" | "ne" | "sw" | "se") => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDrag({ kind: "resize", corner, pointerX: event.clientX, pointerY: event.clientY, start: crop });
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl border border-white/15 bg-[#211d1a] text-white shadow-[0_28px_90px_rgba(0,0,0,.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Image editor</p>
            <h3 className="mt-1 font-editorial text-3xl font-semibold">{title}</h3>
          </div>
          <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close crop editor"><X size={17}/></button>
        </div>

        <div className="grid place-items-center bg-black/25 p-5 md:p-8">
          <div
            ref={stageRef}
            className="relative max-h-[68vh] max-w-full overflow-hidden bg-black shadow-2xl"
            style={{ aspectRatio: imageRatio, width: imageRatio >= 1 ? "min(100%, 820px)" : "min(62vh, 620px)" }}
          >
            <img
              src={src}
              alt="Crop preview"
              className="absolute inset-0 h-full w-full select-none object-fill"
              draggable={false}
              onLoad={(event) => {
                const ratio = event.currentTarget.naturalWidth / Math.max(1, event.currentTarget.naturalHeight);
                if (Number.isFinite(ratio) && ratio > 0) setImageRatio(ratio);
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-black/50" />
            <div
              className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,.38)]"
              style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%`, backgroundImage: `url(${src})`, backgroundSize: `${100 / crop.width}% ${100 / crop.height}%`, backgroundPosition: `${crop.width < 1 ? (crop.x / (1 - crop.width)) * 100 : 50}% ${crop.height < 1 ? (crop.y / (1 - crop.height)) * 100 : 50}%` }}
              onPointerDown={beginMove}
            >
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
                {Array.from({ length: 9 }).map((_, index) => <span key={index} className="border border-white/30" />)}
              </div>
              {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                <button
                  key={corner}
                  type="button"
                  aria-label={`Resize crop ${corner}`}
                  onPointerDown={beginResize(corner)}
                  className={`absolute h-5 w-5 rounded-full border-2 border-[#211d1a] bg-white shadow ${corner.includes("n") ? "-top-2.5" : "-bottom-2.5"} ${corner.includes("w") ? "-left-2.5" : "-right-2.5"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <p className="max-w-xl text-xs leading-relaxed text-white/45">Drag the crop window to reposition it. Drag any corner to resize the crop. The original upload stays untouched.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })} className="inline-flex min-h-10 items-center gap-2 border border-white/20 px-4 text-xs font-bold uppercase tracking-widest text-white/70 hover:border-white/45 hover:text-white"><RotateCcw size={14}/> Reset</button>
            <button type="button" onClick={() => onSave(crop)} className="inline-flex min-h-10 items-center gap-2 bg-white px-5 text-xs font-bold uppercase tracking-widest text-[#211d1a] hover:-translate-y-px"><Check size={14}/> Use crop</button>
          </div>
        </div>
      </div>
    </div>
  );
}
