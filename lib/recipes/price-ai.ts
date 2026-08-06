import "server-only";

type AiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function getAiConfig(): AiConfig | null {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  };
}

export type EstimatedPrice = {
  price_per_unit: number;
  unit: string;
};

/**
 * Ask the model for a rough USD grocery unit price for a standardized ingredient.
 * Returns null when AI is not configured or the response is unusable.
 */
export async function estimateIngredientPriceWithAi(
  canonicalName: string,
  preferredUnit: string | null,
): Promise<EstimatedPrice | null> {
  const config = getAiConfig();
  if (!config) return null;

  const unitHint = preferredUnit?.trim() || "each";
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You estimate typical US grocery unit prices in USD for recipe costing. Return ONLY JSON: {"price_per_unit": number, "unit": string}. Use common retail prices, not restaurant. Prefer the requested unit exactly when possible — especially oz or g for weight. Also accept cup, tbsp, tsp, lb, kg, ml, l. price_per_unit must be > 0.',
        },
        {
          role: "user",
          content: JSON.stringify({
            ingredient: canonicalName,
            preferred_unit: unitHint,
          }),
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { price_per_unit?: unknown; unit?: unknown };
    const price = Number(parsed.price_per_unit);
    const unit = typeof parsed.unit === "string" && parsed.unit.trim() ? parsed.unit.trim().toLowerCase() : unitHint;
    if (!Number.isFinite(price) || price <= 0) return null;
    return { price_per_unit: Math.round(price * 10000) / 10000, unit };
  } catch {
    return null;
  }
}
