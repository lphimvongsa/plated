const RETRYABLE = /internal server error|econnrefused|timeout|503|502|unknownerror|fetch failed/i;

export function friendlyStorageUploadError(message: string | undefined) {
  const text = (message ?? "").trim();
  if (!text || RETRYABLE.test(text)) {
    return "Photo storage is temporarily unavailable. Wait a moment and try again.";
  }
  return text;
}

export async function withStorageUploadRetry<T extends { error: { message: string } | null }>(
  run: () => Promise<T>,
  attempts = 3,
) {
  let last: T | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await run();
    if (!last.error) return last;
    if (!RETRYABLE.test(last.error.message) || attempt === attempts - 1) return last;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return last as T;
}
