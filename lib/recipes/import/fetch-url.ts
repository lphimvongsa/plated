import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 8_000;

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata"]);

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Enter a valid recipe URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("That URL is blocked for security.");
  }

  const literalIp = isIP(host);
  if (literalIp && isPrivateIp(host)) {
    throw new Error("That URL is blocked for security.");
  }

  if (!literalIp) {
    const records = await lookup(host, { all: true });
    if (!records.length) throw new Error("Could not resolve that URL.");
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        throw new Error("That URL is blocked for security.");
      }
    }
  }

  return url;
}

export type FetchedPage = {
  url: string;
  finalUrl: string;
  html: string;
  status: number;
};

export async function fetchRecipePage(rawUrl: string): Promise<FetchedPage> {
  const url = await assertSafePublicUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "plated-recipe-import/1.0 (+https://plated.app)",
      },
    });

    // Re-check final URL after redirects
    await assertSafePublicUrl(response.url);

    if (response.status === 401 || response.status === 402 || response.status === 403) {
      const err = new Error("This recipe looks paywalled or login-walled.");
      (err as Error & { code: string }).code = "paywall";
      throw err;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("That URL did not return a recipe page.");
    }

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > MAX_BYTES) {
      throw new Error("That page is too large to import.");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Could not read that page.");

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        reader.cancel().catch(() => undefined);
        throw new Error("That page is too large to import.");
      }
      chunks.push(value);
    }

    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
    return {
      url: url.toString(),
      finalUrl: response.url || url.toString(),
      html,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error && (error as Error & { code?: string }).code === "paywall") {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timed out fetching that recipe URL.");
    }
    throw error instanceof Error ? error : new Error("Could not fetch that recipe URL.");
  } finally {
    clearTimeout(timer);
  }
}

export function looksPaywalled(html: string): boolean {
  const sample = html.slice(0, 20_000).toLowerCase();
  const signals = [
    "subscribe to continue",
    "create a free account to view",
    "sign in to continue",
    "membership required",
    "paywall",
    "already a subscriber",
  ];
  return signals.some((signal) => sample.includes(signal)) && !/application\/ld\+json/i.test(html);
}
