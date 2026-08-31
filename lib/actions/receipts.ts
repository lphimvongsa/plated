"use server";

import { revalidatePath } from "next/cache";
import { withStorageUploadRetry } from "@/lib/media/storage-upload";
import { createClient } from "@/lib/supabase/server";

type GroceryChoice = {
  id: string;
  ingredient_name: string;
  canonical_key: string | null;
};

export type ReceiptMatchDraft = {
  rawName: string;
  normalizedName: string;
  quantity: number | null;
  lineTotal: number;
  groceryItemId: string | null;
  confidence: number;
  purchased: boolean;
};

export type ReceiptAnalysis = {
  ok: true;
  storeName: string | null;
  purchasedAt: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  imagePath: string | null;
  items: ReceiptMatchDraft[];
  grocery: GroceryChoice[];
} | { ok: false; error: string };

function aiConfig() {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  };
}

function normalizeReceiptName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(org|organic|bnch|bunch|pkg|pack|ct|count|ea|each|fresh|frsh)\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:oz|lb|lbs|g|kg|ml|l|ct)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function similarity(aRaw: string, bRaw: string) {
  const a = normalizeReceiptName(aRaw);
  const b = normalizeReceiptName(bRaw);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.82;
  const at = new Set(a.split(" ").filter(Boolean));
  const bt = new Set(b.split(" ").filter(Boolean));
  let intersection = 0;
  for (const token of at) if (bt.has(token)) intersection += 1;
  const union = new Set([...at, ...bt]).size || 1;
  const jaccard = intersection / union;
  const prefix = [...at].some((token) => [...bt].some((other) => token.length > 3 && (token.startsWith(other) || other.startsWith(token)))) ? 0.18 : 0;
  return Math.min(1, jaccard + prefix);
}

function bestGroceryMatch(name: string, grocery: GroceryChoice[]) {
  let best: GroceryChoice | null = null;
  let score = 0;
  for (const item of grocery) {
    const candidate = item.canonical_key || item.ingredient_name;
    const current = Math.max(similarity(name, candidate), similarity(name, item.ingredient_name));
    if (current > score) {
      best = item;
      score = current;
    }
  }
  return { best, score };
}

async function requirePartyMember(partyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in to scan receipts." };
  const { data: party } = await supabase.from("parties").select("id").eq("id", partyId).maybeSingle();
  if (!party) return { ok: false as const, error: "Party not found or you do not have access." };
  return { ok: true as const, supabase, user };
}

export async function analyzeReceipt(partyId: string, formData: FormData): Promise<ReceiptAnalysis> {
  const auth = await requirePartyMember(partyId);
  if (!auth.ok) return auth;
  const file = formData.get("receipt");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Choose or take a receipt photo first." };
  const fileType = file.type || "image/jpeg";
  if (!fileType.startsWith("image/")) return { ok: false, error: "Receipt scanning currently supports image files." };
  if (file.size > 12 * 1024 * 1024) return { ok: false, error: "Receipt photo must be under 12 MB." };

  const { supabase, user } = auth;
  const { data: groceryRows, error: groceryError } = await supabase
    .from("grocery_items")
    .select("id,ingredient_name,canonical_key")
    .eq("party_id", partyId)
    .order("sort_order");
  if (groceryError) return { ok: false, error: groceryError.message };
  const grocery = (groceryRows ?? []) as GroceryChoice[];

  const config = aiConfig();
  if (!config) return { ok: false, error: "Set AI_API_KEY to enable receipt scanning." };

  const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
  const dataUrl = `data:${fileType};base64,${buffer.toString("base64")}`;
  const groceryPrompt = grocery.map((item) => ({ id: item.id, name: item.ingredient_name, canonical: item.canonical_key })).slice(0, 250);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You extract grocery receipts. Return only JSON. Read every purchasable line item and its full line total. Ignore subtotal/tax/total lines as items. Normalize abbreviated store names into ordinary grocery ingredient names. If a line clearly matches one supplied grocery item, return that exact grocery_item_id. Never invent a match when uncertain.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                grocery_list: groceryPrompt,
                schema: {
                  store_name: "string|null",
                  purchased_at: "YYYY-MM-DD|null",
                  subtotal: "number|null",
                  tax: "number|null",
                  total: "number|null",
                  items: [{ raw_name: "string", normalized_name: "string", quantity: "number|null", line_total: "number", grocery_item_id: "uuid|null", confidence: "0..1" }],
                },
              }),
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, error: `Receipt scan failed (${response.status})${detail ? `: ${detail.slice(0, 140)}` : ""}` };
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) return { ok: false, error: "The receipt scanner returned an empty result." };

  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: "The receipt scanner returned invalid data." }; }
  const ids = new Set(grocery.map((item) => item.id));
  const items: ReceiptMatchDraft[] = Array.isArray(parsed.items) ? parsed.items.map((row: any) => {
    const rawName = String(row?.raw_name || row?.normalized_name || "Receipt item").trim();
    const normalizedName = String(row?.normalized_name || rawName).trim();
    const deterministic = bestGroceryMatch(normalizedName, grocery);
    const aiId = typeof row?.grocery_item_id === "string" && ids.has(row.grocery_item_id) ? row.grocery_item_id : null;
    const aiConfidence = Number.isFinite(Number(row?.confidence)) ? Math.max(0, Math.min(1, Number(row.confidence))) : 0;
    const useAi = aiId && aiConfidence >= Math.max(0.52, deterministic.score - 0.08);
    const groceryItemId = useAi ? aiId : deterministic.score >= 0.42 ? deterministic.best?.id ?? null : null;
    const confidence = useAi ? aiConfidence : deterministic.score;
    return {
      rawName,
      normalizedName,
      quantity: Number.isFinite(Number(row?.quantity)) ? Number(row.quantity) : null,
      lineTotal: Math.max(0, Number(row?.line_total) || 0),
      groceryItemId,
      confidence,
      purchased: Boolean(groceryItemId),
    };
  }).filter((item: ReceiptMatchDraft) => item.rawName && item.lineTotal >= 0) : [];

  const fileName = file instanceof File ? file.name : "receipt.jpg";
  const extension = (fileName.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  let imagePath = `${partyId}/receipts/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await withStorageUploadRetry(async () => {
    imagePath = `${partyId}/receipts/${crypto.randomUUID()}.${extension}`;
    return supabase.storage.from("party-media").upload(imagePath, buffer, { contentType: fileType, upsert: false });
  });

  return {
    ok: true,
    storeName: typeof parsed.store_name === "string" ? parsed.store_name : null,
    purchasedAt: typeof parsed.purchased_at === "string" ? parsed.purchased_at : null,
    subtotal: Number.isFinite(Number(parsed.subtotal)) ? Number(parsed.subtotal) : null,
    tax: Number.isFinite(Number(parsed.tax)) ? Number(parsed.tax) : null,
    total: Number.isFinite(Number(parsed.total)) ? Number(parsed.total) : items.reduce((sum, item) => sum + item.lineTotal, 0),
    imagePath: uploadError ? null : imagePath,
    items,
    grocery,
  };
}

export async function saveReceiptMatches(partyId: string, input: {
  storeName: string | null;
  purchasedAt: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  imagePath: string | null;
  items: ReceiptMatchDraft[];
}) {
  const auth = await requirePartyMember(partyId);
  if (!auth.ok) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: receipt, error } = await supabase.from("receipts").insert({
    party_id: partyId,
    uploaded_by: user.id,
    store_name: input.storeName,
    purchased_at: input.purchasedAt,
    subtotal: input.subtotal,
    tax: input.tax,
    total: input.total,
    image_path: input.imagePath,
  }).select("id").single();
  if (error || !receipt) return { error: error?.message ?? "Could not save receipt." };

  const rows = input.items.map((item) => ({
    receipt_id: receipt.id,
    grocery_item_id: item.groceryItemId,
    raw_name: item.rawName,
    normalized_name: item.normalizedName,
    quantity: item.quantity,
    line_total: item.lineTotal,
    match_confidence: item.confidence,
    purchased: item.purchased,
  }));
  if (rows.length) {
    const { error: itemError } = await supabase.from("receipt_items").insert(rows);
    if (itemError) return { error: itemError.message };
  }

  const matched = new Map<string, number>();
  for (const item of input.items) {
    if (!item.groceryItemId || !item.purchased) continue;
    matched.set(item.groceryItemId, (matched.get(item.groceryItemId) ?? 0) + item.lineTotal);
  }
  for (const [id, amount] of matched) {
    const { data: existing } = await supabase.from("grocery_items").select("actual_cost").eq("id", id).eq("party_id", partyId).maybeSingle();
    await supabase.from("grocery_items").update({
      actual_cost: Number(existing?.actual_cost ?? 0) + amount,
      purchased: true,
      already_owned: false,
    }).eq("id", id).eq("party_id", partyId);
  }

  revalidatePath(`/app/parties/${partyId}/shopping`);
  revalidatePath(`/app/parties/${partyId}/costs`);
  return { error: null, receiptId: receipt.id };
}
