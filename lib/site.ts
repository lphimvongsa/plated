export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function safeNextPath(value: string | null | undefined, fallback = "/app") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return fallback;
  }
  return value;
}

export function invitePageUrl(token: string, origin?: string) {
  const base = (origin || siteUrl()).replace(/\/$/, "");
  return `${base}/invite/${token}`;
}

export function collaboratorInviteUrl(token: string, origin?: string) {
  const base = (origin || siteUrl()).replace(/\/$/, "");
  return `${base}/collaborate/${token}`;
}

export function icsFilename(partyName: string) {
  const slug = partyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "invitation"}.ics`;
}

