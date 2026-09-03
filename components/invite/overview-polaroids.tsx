"use client";

import { PolaroidPhoto } from "@/components/invite/polaroid-photo";
import type { CropRect } from "@/lib/media/crop";
import type { ReactNode } from "react";

export type OverviewPolaroid = {
  src: string;
  crop: CropRect;
  caption?: string;
};

export function OverviewPolaroids({
  left,
  right,
  variant = "invite",
  empty = null,
}: {
  left: OverviewPolaroid | null;
  right: OverviewPolaroid | null;
  variant?: "invite" | "preview";
  empty?: ReactNode;
}) {
  const single = left && right ? null : left ?? right;

  if (single) {
    const frame =
      variant === "preview"
        ? "h-[470px] -rotate-[1deg] p-2 pb-9 shadow-paper ring-0"
        : "h-[610px] -rotate-[1deg] p-2 pb-10 shadow-paper ring-0 md:h-[730px]";
    return (
      <PolaroidPhoto
        src={single.src}
        crop={single.crop}
        caption={single.caption}
        alt="Dinner party"
        className={frame}
        imageClassName="h-full w-full"
      />
    );
  }

  if (left && right) {
    return (
      <div className="relative pr-1">
        <PolaroidPhoto
          src={left.src}
          crop={left.crop}
          caption={left.caption}
          alt="Dinner party"
          className="relative z-10 w-[72%] -rotate-[3.5deg] shadow-[0_22px_48px_rgba(41,35,31,.2)]"
        />
        <PolaroidPhoto
          src={right.src}
          crop={right.crop}
          caption={right.caption}
          alt="Dinner party detail"
          className="relative z-20 ml-auto -mt-[28%] w-[50%] rotate-[4.5deg] shadow-[0_18px_40px_rgba(41,35,31,.22)]"
        />
      </div>
    );
  }

  return empty;
}
