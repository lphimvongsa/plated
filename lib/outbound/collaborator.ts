import { formatPartyWhen } from "@/lib/calendar";
import { collaboratorInviteUrl } from "@/lib/site";

export type CollaboratorInviteParty = {
  name: string;
  startsAt: string;
  timezone: string;
  location: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function roleLabel(role: "co_owner" | "helper") {
  return role === "co_owner" ? "co-owner" : "helper";
}

function roleCopy(role: "co_owner" | "helper") {
  return role === "co_owner"
    ? "As a co-owner you will be able to plan the menu, guests, shopping list, timeline, and every other party detail."
    : "As a helper you will be able to view the full plan — menu, guests, shopping, timeline, and costs — without making changes.";
}

export function buildCollaboratorInviteEmail(input: {
  hostName?: string | null;
  party: CollaboratorInviteParty;
  role: "co_owner" | "helper";
  token: string;
  origin?: string;
}) {
  const inviteUrl = collaboratorInviteUrl(input.token, input.origin);
  const when = formatPartyWhen(input.party.startsAt, input.party.timezone);
  const host = input.hostName?.trim() || "A host";
  const role = roleLabel(input.role);
  const location = input.party.location || "Location to come";
  const subject = `${host} invited you to collaborate on ${input.party.name}`;

  const text = [
    `${host} invited you to be a ${role} on ${input.party.name}.`,
    `${when.date} at ${when.time}`,
    location,
    "",
    roleCopy(input.role),
    "Once you accept, you will also get a helper lane on the party timeline.",
    "",
    `Accept the invite: ${inviteUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f0e7;color:#29231f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0e7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fffaf1;border:1px solid rgba(41,35,31,0.12);">
            <tr>
              <td style="padding:36px 32px 28px;font-family:Georgia,'Times New Roman',serif;">
                <p style="margin:0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:700;color:#c84432;">Collaborator invite</p>
                <p style="margin:18px 0 0;font-size:28px;line-height:1.05;">${escapeHtml(host)} invited you to ${escapeHtml(input.party.name)}.</p>
                <p style="margin:18px 0 0;font-size:16px;line-height:1.5;">You are invited as a <strong>${escapeHtml(role)}</strong>.</p>
                <p style="margin:22px 0 0;font-size:14px;letter-spacing:.08em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${escapeHtml(when.date)} · ${escapeHtml(when.time)}</p>
                <p style="margin:8px 0 0;font-size:15px;color:rgba(41,35,31,0.62);">${escapeHtml(location)}</p>
                <p style="margin:22px 0 0;font-size:16px;line-height:1.5;">${escapeHtml(roleCopy(input.role))}</p>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:rgba(41,35,31,0.62);">Accepting also adds you as a helper on the party timeline.</p>
                <p style="margin:28px 0 0;">
                  <a href="${escapeHtml(inviteUrl)}" style="display:inline-block;background:#c84432;color:#fffaf1;text-decoration:none;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Accept invitation</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text, inviteUrl };
}
