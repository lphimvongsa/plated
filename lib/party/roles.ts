export const COLLABORATOR_ROLES = ["co_owner", "helper"] as const;
export type CollaboratorRole = (typeof COLLABORATOR_ROLES)[number];

export function canEditPartyRole(role: string | null | undefined) {
  return role === "owner" || role === "co_owner" || role === "manager" || role === "editor";
}

export function canManagePartyRole(role: string | null | undefined) {
  return role === "owner" || role === "co_owner";
}

export function formatPartyRole(role: string | null | undefined) {
  if (role === "co_owner") return "co-owner";
  if (!role) return "member";
  return role.replaceAll("_", "-");
}
