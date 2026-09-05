import { Brand } from "@/components/brand";
import { InviteExperience } from "@/components/invite/invite-experience";
import { loadInvite } from "@/lib/actions/invite";
import { siteUrl } from "@/lib/site";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Unavailable() {
  return (
    <main className="paper-noise flex min-h-screen flex-col items-center justify-center bg-[#eee4d4] px-5 text-center text-ink">
      <Brand compact />
      <h1 className="mt-10 font-editorial text-5xl font-semibold tracking-[-0.04em] text-tomato">
        This invitation is no longer available.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/55">
        The group link may have been reset or the dinner was removed. Ask your host for the current party link.
      </p>
      <Link href="/" className="btn-secondary mt-8">
        Visit plated.
      </Link>
    </main>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const invite = await loadInvite(token);
    if (invite.status === "revoked" || !invite.party) {
      return <Unavailable />;
    }
    return <InviteExperience token={token} initial={invite} origin={siteUrl()} />;
  } catch (error) {
    console.error("[invite] page render failed", error);
    return <Unavailable />;
  }
}
