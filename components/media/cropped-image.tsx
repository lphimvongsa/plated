"use client";

import { cropFromJson, type CropRect } from "@/lib/media/crop";
import { useEffect, useMemo, useRef, useState } from "react";

type Size = { width: number; height: number };

export function CroppedImage({
  src,
  alt,
  crop,
  className = "",
  imageClassName = "",
}: {
  src: string;
  alt: string;
  crop?: CropRect | null;
  className?: string;
  imageClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<Size>({ width: 0, height: 0 });
  const [natural, setNatural] = useState<Size>({ width: 0, height: 0 });
  const normalized = useMemo(() => cropFromJson(crop), [crop]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setContainer({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style = useMemo(() => {
    if (!container.width || !container.height || !natural.width || !natural.height) {
      return { inset: 0, width: "100%", height: "100%", objectFit: "cover" as const };
    }

    const cropWidthPx = natural.width * normalized.width;
    const cropHeightPx = natural.height * normalized.height;
    const scale = Math.max(container.width / cropWidthPx, container.height / cropHeightPx);
    const renderedWidth = natural.width * scale;
    const renderedHeight = natural.height * scale;
    const centerX = (normalized.x + normalized.width / 2) * natural.width * scale;
    const centerY = (normalized.y + normalized.height / 2) * natural.height * scale;
    return {
      width: renderedWidth,
      height: renderedHeight,
      left: container.width / 2 - centerX,
      top: container.height / 2 - centerY,
    };
  }, [container, natural, normalized]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`absolute max-w-none select-none ${imageClassName}`}
        draggable={false}
        onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        style={style}
      />
    </div>
  );
}
