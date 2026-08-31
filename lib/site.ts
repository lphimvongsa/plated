export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function invitePageUrl(token: string, origin?: string) {
  const base = (origin || siteUrl()).replace(/\/$/, "");
  return `${base}/invite/${token}`;
}

export function shareRsvpCookieName(shareToken: string) {
  return `plated_share_${shareToken}`;
}

export function inviteCalendarUrl(token: string, origin?: string) {
  return `${invitePageUrl(token, origin)}/calendar`;
}

export function icsFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "invitation"}.ics`;
}
