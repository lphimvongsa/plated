import { InviteExperience } from "@/components/invite/invite-experience";
import { loadInvite } from "@/lib/actions/invite";
import { Brand } from "@/components/brand";
import { siteUrl } from "@/lib/site";
import Link from "next/link";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await loadInvite(token);

  if (invite.status === "revoked" || !invite.party || !invite.guest) {
    return (
      <main className="paper-noise flex min-h-screen flex-col items-center justify-center bg-[#eee4d4] px-5 text-center text-ink">
        <Brand compact />
        <h1 className="mt-10 font-editorial text-5xl font-semibold tracking-[-0.04em] text-tomato">This invitation is no longer available.</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/55">
          The link may have been revoked, replaced, or the dinner was removed. Ask your host for a fresh invite.
        </p>
        <Link href="/" className="btn-secondary mt-8">
          Visit plated.
        </Link>
      </main>
    );
  }

  return <InviteExperience token={token} initial={invite} origin={siteUrl()} />;
}
