"use client";

import { rotateShareToken } from "@/lib/actions/parties";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function inviteHref(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

export function CopyShareLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={!token || pending}
      onClick={() => {
        startTransition(async () => {
          await navigator.clipboard.writeText(inviteHref(token));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      {copied ? <Check size={15} /> : <Link2 size={15} />}
      {copied ? "Copied" : "Copy party link"}
    </button>
  );
}

export function ShareInviteCard({ partyId, token }: { partyId: string; token: string }) {
  const router = useRouter();
  const [shareToken, setShareToken] = useState(token);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const path = shareToken ? `/invite/${shareToken}` : "";

  function copy() {
    if (!shareToken) return;
    startTransition(async () => {
      await navigator.clipboard.writeText(inviteHref(shareToken));
      setCopied(true);
      setStatus("Party link copied. Paste it in a group chat.");
      setError(null);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  function rotate() {
    startTransition(async () => {
      const result = await rotateShareToken(partyId);
      if (result.error || !result.token) {
        setError(result.error ?? "Could not reset the party link.");
        return;
      }
      setShareToken(result.token);
      setStatus("New party link created. The old one no longer works.");
      setError(null);
      router.refresh();
    });
  }

  return (
    <article className="card p-5">
      <p className="font-handwritten text-sm text-tomato">Group chat</p>
      <h3 className="mt-2 font-editorial text-3xl font-semibold">One link for everyone.</h3>
      <p className="mt-3 text-xs leading-relaxed text-ink/50">
        Paste this in a text thread. Guests open the invitation, add their name, and RSVP — no private link per person.
      </p>
      <div className="mt-4 flex gap-2">
        <input className="field" readOnly value={path} />
        <button type="button" className="btn-secondary shrink-0" disabled={!shareToken || pending} onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button type="button" className="mt-3 text-[10px] font-bold uppercase tracking-widest text-ink/35 hover:text-tomato" disabled={pending} onClick={rotate}>
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw size={11} /> {pending ? "Resetting…" : "Reset link"}
        </span>
      </button>
      {status ? <p className="mt-3 border border-olive/25 bg-olive/10 px-3 py-2 text-xs font-semibold text-olive">{status}</p> : null}
      {error ? <p className="mt-3 border border-tomato/25 bg-tomato/10 px-3 py-2 text-xs font-semibold text-tomato">{error}</p> : null}
    </article>
  );
}
