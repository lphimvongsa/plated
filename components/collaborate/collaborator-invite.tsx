"use client";

import { signOut } from "@/lib/actions/auth";
import { acceptCollaboratorInvite } from "@/lib/actions/collaborators";
import { Brand } from "@/components/brand";
import { formatPartyWhen } from "@/lib/calendar";
import { formatPartyRole } from "@/lib/party/roles";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type CollaboratorInviteView = {
  status: "pending" | "accepted" | "revoked" | "missing";
  email?: string;
  role?: string;
  inviter_name?: string;
  party?: {
    id: string;
    name: string;
    starts_at: string;
    timezone: string;
    location: string | null;
    hero_image: string | null;
  };
};

export function CollaboratorInviteExperience({
  token,
  invite,
  signedIn,
  userEmail,
}: {
  token: string;
  invite: CollaboratorInviteView;
  signedIn: boolean;
  userEmail: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const party = invite.party;
  const next = `/collaborate/${token}`;

  if (invite.status === "missing" || invite.status === "revoked" || !party) {
    return (
      <main className="paper-noise flex min-h-screen flex-col items-center justify-center bg-[#eee4d4] px-5 text-center text-ink">
        <Brand compact />
        <h1 className="mt-10 font-editorial text-5xl font-semibold tracking-[-0.04em] text-tomato">
          This invite is no longer available.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/55">
          The link may have been cancelled, already used, or the party was removed. Ask the host for a fresh invite.
        </p>
        <Link href={signedIn ? "/app" : "/"} className="btn-secondary mt-8">
          {signedIn ? "Go to your parties" : "Visit plated."}
        </Link>
      </main>
    );
  }

  const when = formatPartyWhen(party.starts_at, party.timezone);
  const role = formatPartyRole(invite.role);
  const emailMismatch = Boolean(signedIn && userEmail && invite.email && userEmail.toLowerCase() !== invite.email.toLowerCase());
  const alreadyAccepted = invite.status === "accepted";

  return (
    <main className="paper-noise min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6 md:px-8">
        <Brand compact />
        <section className="my-auto border border-ink/15 bg-[#f8f4ec] p-6 md:p-10">
          <p className="eyebrow">Collaborator invite</p>
          <h1 className="mt-3 font-editorial text-5xl font-semibold leading-[0.86] tracking-[-0.04em] text-tomato md:text-6xl">
            {invite.inviter_name || "A host"} invited you to {party.name}.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-ink/55">
            You are invited as a <strong className="text-ink">{role}</strong>.{" "}
            {invite.role === "helper"
              ? "You will be able to see the full plan without making changes."
              : "You will be able to plan this party the same way the owner can."}{" "}
            Accepting also adds you as a helper on the timeline.
          </p>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">
            {when.date} · {when.time}
            {party.location ? ` · ${party.location}` : ""}
          </p>
          {invite.email ? (
            <p className="mt-3 text-xs text-ink/50">
              This invite was sent to <span className="font-semibold text-ink">{invite.email}</span>.
            </p>
          ) : null}

          {error ? <p className="mt-5 text-sm font-semibold text-tomato">{error}</p> : null}
          {emailMismatch ? (
            <p className="mt-5 text-sm font-semibold text-tomato">
              You are signed in as {userEmail}. Switch to {invite.email} to accept.
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {alreadyAccepted && signedIn && !emailMismatch ? (
              <Link href={`/app/parties/${party.id}`} className="btn-primary">
                Open party <ArrowRight size={15} />
              </Link>
            ) : !signedIn ? (
              <>
                <Link href={`/auth/login?next=${encodeURIComponent(next)}&mode=signup`} className="btn-primary">
                  Create account and accept <ArrowRight size={15} />
                </Link>
                <Link href={`/auth/login?next=${encodeURIComponent(next)}&mode=login`} className="btn-secondary">
                  Sign in
                </Link>
              </>
            ) : emailMismatch ? (
              <form action={signOut}>
                <button type="submit" className="btn-secondary">
                  Sign out to switch accounts
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await acceptCollaboratorInvite(token);
                    if (!result.ok || !result.partyId) {
                      setError(result.error ?? "Could not accept this invite.");
                      return;
                    }
                    router.push(`/app/parties/${result.partyId}`);
                    router.refresh();
                  });
                }}
              >
                <Check size={15} /> {pending ? "Accepting…" : "Accept invite"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
