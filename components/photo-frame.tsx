import Image from "next/image";

export function PhotoFrame({
  src,
  alt,
  className = "",
  imageClassName = "",
  priority = false,
  label,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  label?: string;
}) {
  return (
    <figure className={`relative border border-ink/15 bg-[#faf7ef] p-1.5 pb-7 shadow-card ${className}`}>
      <div className="flash-photo relative h-full min-h-0 w-full overflow-hidden bg-ink">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 92vw, 46vw"
          className={`object-cover ${imageClassName}`}
        />
      </div>
      {label ? (
        <figcaption className="absolute inset-x-2 bottom-1.5 flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink/55">
          <span className="truncate">{label}</span>
          <span aria-hidden="true">plated.</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
