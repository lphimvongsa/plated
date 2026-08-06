import "server-only";

const MAX_PDF_BYTES = 8_000_000;

export async function extractTextFromPdf(data: ArrayBuffer | Uint8Array): Promise<{
  text: string;
  pageCount: number;
}> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!bytes.byteLength) {
    throw new Error("PDF file is empty.");
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF is too large (max 8MB).");
  }

  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: true });
  const rawText = result.text;
  const text = (Array.isArray(rawText) ? rawText.join("\n") : String(rawText ?? ""))
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    text,
    pageCount: result.totalPages ?? 0,
  };
}
