"use client";

import { CroppedImage } from "@/components/media/cropped-image";
import type { CropRect } from "@/lib/media/crop";

export function PolaroidPhoto({
  src,
  crop,
  caption,
  alt,
  className = "",
  imageClassName = "aspect-[4/5] w-full",
}: {
  src: string;
  crop: CropRect;
  caption?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <figure className={`relative bg-[#fffaf1] p-2 pb-9 text-ink ring-1 ring-black/[0.04] ${className}`}>
      <CroppedImage src={src} alt={alt} crop={crop} className={imageClassName} />
      <figcaption className="mt-1.5 min-h-[1.5rem] truncate px-1 font-handwritten text-lg leading-none">
        {caption || "\u00a0"}
      </figcaption>
    </figure>
  );
}
