export const MAJOR_ALLERGENS = [
  "milk",
  "egg",
  "fish",
  "shellfish",
  "tree nuts",
  "peanut",
  "wheat",
  "soy",
  "sesame",
  "gluten",
] as const;

const DISPLAY: Record<string, string> = {
  milk: "Milk / Dairy",
  egg: "Egg",
  fish: "Fish",
  shellfish: "Crustacean Shellfish",
  "tree nuts": "Tree Nuts",
  peanut: "Peanut",
  wheat: "Wheat",
  soy: "Soy",
  sesame: "Sesame",
  gluten: "Gluten",
};

const RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "milk", patterns: [/\bmilk\b/i, /\bbutter\b/i, /\bcream\b/i, /\bcheese\b/i, /\byog(?:urt|hurt)\b/i, /\bwhey\b/i, /\bcasein\b/i, /\bghee\b/i, /\bparmesan\b/i, /\bmozzarella\b/i, /\bcheddar\b/i] },
  { tag: "egg", patterns: [/\beggs?\b/i, /\bmayonnaise\b/i, /\bmayo\b/i, /\bmeringue\b/i] },
  { tag: "fish", patterns: [/\bsalmon\b/i, /\btuna\b/i, /\bcod\b/i, /\banchov(?:y|ies)\b/i, /\bsardine/i, /\bfish sauce\b/i, /\btrout\b/i, /\bhalibut\b/i] },
  { tag: "shellfish", patterns: [/\bshrimp\b/i, /\bprawn/i, /\bcrab\b/i, /\blobster\b/i, /\bcrayfish\b/i, /\bcrawfish\b/i] },
  { tag: "tree nuts", patterns: [/\balmond/i, /\bcashew/i, /\bwalnut/i, /\bpecan/i, /\bpistachio/i, /\bhazelnut/i, /\bmacadamia/i, /\bbrazil nut/i, /\bpine nut/i] },
  { tag: "peanut", patterns: [/\bpeanut/i, /\bgroundnut/i] },
  { tag: "wheat", patterns: [/\bwheat\b/i, /\bflour\b/i, /\bbread\b/i, /\bpasta\b/i, /\bcouscous\b/i, /\bseitan\b/i, /\bsoy sauce\b/i] },
  { tag: "gluten", patterns: [/\bwheat\b/i, /\bflour\b/i, /\bbread\b/i, /\bpasta\b/i, /\bcouscous\b/i, /\bseitan\b/i, /\bbarley\b/i, /\brye\b/i, /\bsoy sauce\b/i] },
  { tag: "soy", patterns: [/\bsoy\b/i, /\btofu\b/i, /\btempeh\b/i, /\bmiso\b/i, /\bedamame\b/i, /\btamari\b/i, /\bsoy sauce\b/i] },
  { tag: "sesame", patterns: [/\bsesame\b/i, /\btahini\b/i] },
];

export function normalizeAllergenTag(value: string) {
  const cleaned = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (/dairy|lactose|milk/.test(cleaned)) return "milk";
  if (/egg/.test(cleaned)) return "egg";
  if (/shellfish|crustacean|shrimp|crab|lobster/.test(cleaned)) return "shellfish";
  if (/tree nut|almond|cashew|walnut|pecan|pistachio|hazelnut/.test(cleaned)) return "tree nuts";
  if (/peanut/.test(cleaned)) return "peanut";
  if (/wheat/.test(cleaned)) return "wheat";
  if (/gluten/.test(cleaned)) return "gluten";
  if (/soy/.test(cleaned)) return "soy";
  if (/sesame/.test(cleaned)) return "sesame";
  if (/fish/.test(cleaned)) return "fish";
  return cleaned;
}

export function allergenDisplayName(value: string) {
  const key = normalizeAllergenTag(value);
  return DISPLAY[key] ?? key.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function inferAllergensFromIngredient(name: string, existing: string[] = []) {
  const tags = new Set(existing.map(normalizeAllergenTag).filter(Boolean));
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(name))) tags.add(rule.tag);
  }
  return Array.from(tags);
}

export function aggregateRecipeAllergens(ingredients: Array<{ name: string; allergen_tags?: string[] }>, existing: string[] = []) {
  const tags = new Set(existing.map(normalizeAllergenTag).filter(Boolean));
  for (const ingredient of ingredients) {
    inferAllergensFromIngredient(ingredient.name, ingredient.allergen_tags ?? []).forEach((tag) => tags.add(tag));
  }
  return Array.from(tags);
}
