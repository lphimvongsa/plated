/** Display + price-lookup helpers for ingredient names. */

const ALIASES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\b(evoo|extra[- ]virgin olive oil|extra virgin olive oil)\b/i, canonical: "olive oil" },
  { pattern: /\bfine salt\b/i, canonical: "table salt" },
  { pattern: /\b(black pepper|freshly (?:cracked|ground) pepper|ground pepper)\b/i, canonical: "black pepper" },
  { pattern: /\b(all[- ]purpose flour|ap flour|plain flour)\b/i, canonical: "all purpose flour" },
  { pattern: /\b(garlic cloves?|minced garlic)\b/i, canonical: "garlic" },
  { pattern: /\b(chicken (?:stock|broth)|low[- ]sodium chicken (?:stock|broth))\b/i, canonical: "chicken broth" },
  { pattern: /\b(beef (?:stock|broth))\b/i, canonical: "beef broth" },
  { pattern: /\b(vegetable (?:stock|broth))\b/i, canonical: "vegetable broth" },
  { pattern: /\b(half[- ]and[- ]half|half & half)\b/i, canonical: "half and half" },
  { pattern: /\b(heavy whipping cream|whipping cream)\b/i, canonical: "heavy cream" },
  { pattern: /\b(granulated sugar|white sugar)\b/i, canonical: "sugar" },
  { pattern: /\b(active dry yeast|instant yeast)\b/i, canonical: "yeast" },
  { pattern: /\b(thick[- ]cut bacon|bacon strips?)\b/i, canonical: "bacon" },
  { pattern: /\byukon gold potatoes?\b/i, canonical: "yukon gold potato" },
  { pattern: /\brusset potatoes?\b/i, canonical: "russet potato" },
  { pattern: /\bred potatoes?\b/i, canonical: "red potato" },
  { pattern: /\b(chopped clams|canned clams)\b/i, canonical: "clams" },
];

const PREP_TRAILING =
  /\b(diced|minced|chopped|sliced|cubed|crushed|grated|shredded|peeled|seeded|halved|quartered|softened|melted|room temperature|to taste|for serving|optional|divided|fresh|dried)\b/gi;

/**
 * Canonical lowercase key for price lookup / dedupe.
 * Strips parentheticals, prep descriptors, and maps common aliases.
 */
export function standardizeIngredientKey(raw: string): string {
  let name = raw.trim().toLowerCase();
  name = name.replace(/\([^)]*\)/g, " ");
  name = name.replace(/\[[^\]]*\]/g, " ");
  name = name.replace(/\s+/g, " ").trim();

  for (const { pattern, canonical } of ALIASES) {
    if (pattern.test(name)) return canonical;
  }

  name = name.replace(/^(medium|large|small|fresh|dried|frozen|canned)\s+/i, "");
  name = name.replace(PREP_TRAILING, " ");
  name = name.replace(/[,;]+/g, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/^(of|and|or)\s+/i, "").replace(/\s+(of|and|or)$/i, "");

  return name || raw.trim().toLowerCase();
}

/** Title-case display name from a standardized key. */
export function displayIngredientName(raw: string): string {
  const key = standardizeIngredientKey(raw);
  return key
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (["and", "or", "of", "with"].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

const STEP_VERBS =
  "cook|saute|sauté|sear|bake|roast|simmer|boil|fry|grill|mix|stir|whisk|fold|add|combine|bring|reduce|heat|melt|chop|dice|slice|mince|peel|drain|remove|transfer|pour|ladle|serve|garnish|season|brown|soften|wipe|reserve|set|stir|toss|blend|puree|cover|uncover|taste";

/**
 * Short 2–4 word imperative label for a cooking step ("Sauté bacon").
 */
export function shortStepLabel(description: string, fallbackIndex = 0): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (!text) return `Step ${fallbackIndex + 1}`;

  const firstSentence = text.split(/(?<=[.!?])\s+|;\s+/)[0] ?? text;
  let cleaned = firstSentence
    .replace(/^\d+[\).\]]\s*/, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = cleaned.match(
    new RegExp(
      `^(${STEP_VERBS})\\b(?:\\s+(?:the|a|an|in|to|and))?\\s+([a-z][\\w'-]*)(?:\\s+([a-z][\\w'-]*))?`,
      "i",
    ),
  );
  if (match) {
    const verb = match[1].toLowerCase().replace("saute", "sauté");
    const words = [match[2], match[3]].filter(Boolean).map((w) => w!.toLowerCase());
    // Drop filler object words
    const object = words
      .filter((w) => !["the", "a", "an", "and", "then", "with", "into", "over"].includes(w))
      .slice(0, 2)
      .join(" ");
    const label = object
      ? `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${object}`
      : `${verb.charAt(0).toUpperCase()}${verb.slice(1)}`;
    if (label.length <= 28) return label;
  }

  const words = cleaned
    .replace(/[^a-zA-Z\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  if (!words.length) return `Step ${fallbackIndex + 1}`;
  const fallback = words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join(" ");
  return fallback.length > 28 ? `${fallback.slice(0, 25)}…` : fallback;
}

export function guessIngredientCategory(name: string): string {
  const key = standardizeIngredientKey(name);
  if (/(chicken|beef|pork|bacon|salmon|shrimp|turkey|lamb|sausage|clam)/.test(key)) return "Meat";
  if (/(milk|cream|butter|cheese|yogurt|half and half|egg)/.test(key)) return "Dairy";
  if (/(onion|garlic|potato|tomato|celery|lemon|lime|parsley|cilantro|lettuce|carrot|pepper|herb)/.test(key)) {
    return "Produce";
  }
  if (/(salt|pepper|paprika|oregano|thyme|cumin|chili|spice|bay)/.test(key)) return "Spices";
  if (/(flour|oil|vinegar|broth|stock|sugar|rice|pasta|can|bouillon|sauce|juice)/.test(key)) {
    return "Dry Goods";
  }
  return "Other";
}

/** Title-case a recipe task name; empty → "Cooking". */
export function titleCaseTask(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "Cooking";
  const small = new Set(["and", "or", "the", "a", "an", "of", "to", "for", "in", "on"]);
  return value
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
