/** Round recipe / grocery quantities to 2 decimal places. */
export function roundQuantity(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

/** Grocery / UI display with up to 2 decimals. */
export function formatGroceryQuantity(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.round(n * 100) / 100);
}
