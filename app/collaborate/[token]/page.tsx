import { CollaboratorInviteExperience } from "@/components/collaborate/collaborator-invite";
import { loadCollaboratorInvite } from "@/lib/actions/collaborators";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export default async function CollaboratorInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await loadCollaboratorInvite(token);
  const userId = await getAuthenticatedUserId();
  let userEmail: string | null = null;

  if (userId) {
    const supabase = await createClient();
    const [{ data: profile }, { data: claimsData }] = await Promise.all([
      supabase.from("profiles").select("email").eq("id", userId).maybeSingle(),
      supabase.auth.getClaims(),
    ]);
    userEmail = profile?.email || (claimsData?.claims?.email as string | undefined) || null;
  }

  return (
    <CollaboratorInviteExperience
      token={token}
      invite={invite}
      signedIn={Boolean(userId)}
      userEmail={userEmail}
    />
  );
}
