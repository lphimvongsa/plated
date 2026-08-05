import Link from "next/link";

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="plated. home"
      className={`inline-flex items-baseline font-editorial font-semibold italic leading-[0.72] tracking-[-0.075em] ${
        compact ? "text-[2.35rem]" : "text-5xl md:text-6xl"
      } ${light ? "text-paper" : "text-tomato"}`}
    >
      plated<span className="ml-[0.02em] not-italic tracking-normal">.</span>
    </Link>
  );
}
