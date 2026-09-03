"use client";

import {
  inviteCollaborator,
  removeCollaborator,
  resendCollaboratorInvite,
  revokeCollaboratorInvite,
  updateCollaboratorRole,
} from "@/lib/actions/collaborators";
import { formatPartyRole, usePartyAccess } from "@/lib/party/access-client";
import type { CollaboratorRole } from "@/lib/party/roles";
import { Mail, Send, Trash2, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";

export type CollaboratorPerson = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
};

export type PendingCollaboratorInvite = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sent_at: string | null;
};

export function CollaboratorsCard({
  partyId,
  currentUserId,
  members,
  pendingInvites,
}: {
  partyId: string;
  currentUserId: string;
  members: CollaboratorPerson[];
  pendingInvites: PendingCollaboratorInvite[];
}) {
  const { canManage, isOwner } = usePartyAccess();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string | null }>, success?: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else if (success) setMessage(success);
    });
  }

  return (
    <article className="card p-6">
      <p className="eyebrow">Kitchen crew</p>
      <h3 className="mt-2 font-editorial text-3xl font-semibold">Collaborators</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/55">
        Co-owners can change everything the owner can. Helpers can see the full plan but cannot edit it.
        Accepted collaborators are added to the timeline as a helper.
      </p>

      {message ? <p className="mt-4 text-sm font-semibold text-olive">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-tomato">{error}</p> : null}

      <ul className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
        {members.map((member) => {
          const canChange = canManage && member.role !== "owner" && member.userId !== currentUserId;
          return (
            <li key={member.userId} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{member.name || member.email || "Collaborator"}</p>
                <p className="truncate text-xs text-ink/45">{member.email || formatPartyRole(member.role)}</p>
              </div>
              {canChange ? (
                <label className="sr-only" htmlFor={`role-${member.userId}`}>
                  Role for {member.name || member.email}
                </label>
              ) : null}
              {canChange ? (
                <select
                  id={`role-${member.userId}`}
                  className="field !w-auto !py-2 text-xs"
                  value={member.role === "helper" ? "helper" : "co_owner"}
                  disabled={pending}
                  onChange={(event) =>
                    run(
                      () => updateCollaboratorRole(partyId, member.userId, event.target.value as CollaboratorRole),
                      "Role updated.",
                    )
                  }
                >
                  <option value="co_owner">Co-owner</option>
                  <option value="helper">Helper</option>
                </select>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">
                  {formatPartyRole(member.role)}
                  {member.userId === currentUserId ? " · you" : ""}
                </span>
              )}
              {canChange ? (
                <button
                  type="button"
                  className="btn-icon h-9 w-9 shrink-0 text-ink/35 hover:border-tomato hover:text-tomato"
                  aria-label={`Remove ${member.name || member.email}`}
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`Remove ${member.name || member.email || "this collaborator"} from the party?`)) return;
                    run(() => removeCollaborator(partyId, member.userId), "Collaborator removed.");
                  }}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {pendingInvites.length ? (
        <div className="mt-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink/45">Pending invites</p>
          <ul className="mt-2 divide-y divide-ink/10 border-y border-ink/10">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{invite.email}</p>
                  <p className="text-xs text-ink/45">{formatPartyRole(invite.role)} · waiting to accept</p>
                </div>
                {canManage ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-2 text-[10px]"
                      disabled={pending}
                      onClick={() => run(() => resendCollaboratorInvite(partyId, invite.id), "Invite resent.")}
                    >
                      <Send size={13} /> Resend
                    </button>
                    <button
                      type="button"
                      className="btn-icon h-9 w-9 shrink-0 text-ink/35 hover:border-tomato hover:text-tomato"
                      aria-label={`Cancel invite to ${invite.email}`}
                      disabled={pending}
                      onClick={() => run(() => revokeCollaboratorInvite(partyId, invite.id), "Invite cancelled.")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <form
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_8.5rem_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            run(async () => {
              const result = await inviteCollaborator(partyId, data);
              if (!result.error) form.reset();
              return result;
            }, "Invite sent.");
          }}
        >
          <label className="block">
            <span className="mb-2 block text-xs font-semibold">Email</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" size={15} />
              <input className="field pl-10" type="email" name="email" placeholder="cook@email.com" required />
            </span>
          </label>
          <label>
            <span className="mb-2 block text-xs font-semibold">Role</span>
            <select className="field" name="role" defaultValue="helper">
              <option value="helper">Helper</option>
              <option value="co_owner">Co-owner</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              <UserPlus size={15} /> {pending ? "Sending…" : "Invite"}
            </button>
          </div>
        </form>
      ) : isOwner ? null : (
        <p className="mt-4 text-xs text-ink/45">Only the owner or a co-owner can invite more collaborators.</p>
      )}
    </article>
  );
}
