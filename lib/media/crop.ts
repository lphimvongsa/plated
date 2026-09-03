export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCrop(value: unknown): CropRect {
  if (!value || typeof value !== "object") return { ...DEFAULT_CROP };
  const input = value as Partial<CropRect>;
  const width = clamp(Number(input.width) || 1, 0.08, 1);
  const height = clamp(Number(input.height) || 1, 0.08, 1);
  const x = clamp(Number(input.x) || 0, 0, 1 - width);
  const y = clamp(Number(input.y) || 0, 0, 1 - height);
  return { x, y, width, height };
}

export function cropFromJson(value: unknown): CropRect {
  if (typeof value === "string") {
    try {
      return normalizeCrop(JSON.parse(value));
    } catch {
      return { ...DEFAULT_CROP };
    }
  }
  return normalizeCrop(value);
}

export function cropArrayFromJson(value: unknown, count: number): CropRect[] {
  let source: unknown[] = [];
  if (Array.isArray(value)) source = value;
  else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) source = parsed;
    } catch {
      source = [];
    }
  }
  return Array.from({ length: count }, (_, index) => normalizeCrop(source[index]));
}

export function photoCaptionArrayFromJson(value: unknown, count: number): string[] {
  let source: unknown[] = [];
  if (Array.isArray(value)) source = value;
  else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) source = parsed;
    } catch {
      source = [];
    }
  }
  return Array.from({ length: count }, (_, index) => {
    const item = source[index];
    if (!item || typeof item !== "object") return "";
    const caption = (item as { caption?: unknown }).caption;
    return typeof caption === "string" ? caption : "";
  });
}

export function cropArrayWithCaptions(crops: CropRect[], captions: string[]) {
  return crops.map((crop, index) => ({ ...normalizeCrop(crop), caption: String(captions[index] ?? "").slice(0, 120) }));
}
