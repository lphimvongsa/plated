export type DurationScalingMode = "fixed" | "quantity" | "batch" | "manual";

const FIXED_TIME_ACTIONS = /\b(bake|roast|simmer|boil|poach|rest|chill|cool|freeze|marinat\w*|proof|rise|preheat|reheat|braise|slow\s*cook|pressure\s*cook|reduce|set|infuse)\b/i;
const BATCH_ACTIONS = /\b(fry|sear|saut[ée]|saute|grill|toast|blanch|brown|char|pan[-\s]?fry|pan[-\s]?cook|blend|puree|purée|process)\b/i;

/**
 * Infer how a cooking task's hands-on duration changes when a recipe is scaled.
 * Users can override this on the timeline. Unknown tasks default to quantity
 * scaling because prep work typically gets longer as ingredient count grows.
 */
export function inferDurationScalingMode(text: string): DurationScalingMode {
  if (FIXED_TIME_ACTIONS.test(text)) return "fixed";
  if (BATCH_ACTIONS.test(text)) return "batch";
  return "quantity";
}

function roundUpToFive(minutes: number) {
  return Math.max(1, Math.ceil(minutes / 5) * 5);
}

/**
 * Recalculate from the recipe's original duration every time, never from the
 * previously scaled value. This prevents compounding when servings change more
 * than once.
 */
export function scaledTaskDurationMinutes(
  baseMinutes: number | null | undefined,
  scaleFactor: number,
  mode: DurationScalingMode,
) {
  const base = Math.max(1, Math.round(baseMinutes ?? 1));
  const scale = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;

  if (mode === "manual" || mode === "fixed" || scale <= 1) return base;

  if (mode === "batch") {
    return roundUpToFive(base * Math.max(1, Math.ceil(scale)));
  }

  // Quantity-heavy prep benefits from some parallelism and repeated motions,
  // so it grows sublinearly rather than 1:1 with servings.
  return roundUpToFive(base * Math.pow(scale, 0.8));
}

export function isDurationScalingMode(value: unknown): value is DurationScalingMode {
  return value === "fixed" || value === "quantity" || value === "batch" || value === "manual";
}
