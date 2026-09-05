"use client";

import { Brand } from "@/components/brand";
import Link from "next/link";
import { useEffect } from "react";

export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[invite] route error", error);
  }, [error]);

  return (
    <main className="paper-noise flex min-h-screen flex-col items-center justify-center bg-[#eee4d4] px-5 text-center text-ink">
      <Brand compact />
      <h1 className="mt-10 font-editorial text-5xl font-semibold tracking-[-0.04em] text-tomato">
        We couldn’t open this invitation.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/55">
        Something went wrong loading the RSVP page. Try again, or ask your host to resend the party link.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Visit plated.
        </Link>
      </div>
    </main>
  );
}
