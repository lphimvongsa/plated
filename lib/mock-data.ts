export const party = {
  id: "summer-table",
  name: "The Last Light Supper",
  date: "Saturday, August 22",
  time: "6:30 PM",
  location: "Lukas' backyard · Providence, RI",
  theme: "Late-summer garden party",
  cuisine: "Mediterranean-inspired",
  service: "Family style",
  guests: 12,
  attending: 8,
  maybe: 2,
  invited: 14,
  collaborators: ["LP", "MJ", "AS"],
};

export const recipes = [
  {
    id: "tomato-tart",
    title: "Heirloom tomato tart",
    course: "Welcome bite",
    servings: 12,
    prep: "25 min",
    cook: "35 min",
    prep_minutes: 25,
    cook_minutes: 35,
    image: "/photos/party-04.webp",
    allergy: "Gluten, dairy",
    cost: 24.8,
    status: "Ready",
    description:
      "A flaky pastry tart finished with crème fraîche, ripe heirloom tomatoes, and a scatter of basil. Ideal as a welcome bite while the grill heats up.",
    ingredients: [
      { name: "All-purpose flour", quantity: "2", unit: "cups", note: null },
      { name: "Cold butter", quantity: "12", unit: "tbsp", note: "cubed" },
      { name: "Crème fraîche", quantity: "1", unit: "cup", note: null },
      { name: "Heirloom tomatoes", quantity: "4", unit: "medium", note: "sliced" },
      { name: "Fresh basil", quantity: "1", unit: "handful", note: null },
    ],
    instructions: [
      "Make and chill the pastry dough for at least 30 minutes.",
      "Blind-bake the shell at 375°F until lightly golden.",
      "Spread crème fraîche, arrange tomatoes, and bake until set.",
      "Finish with basil, flaky salt, and a drizzle of olive oil.",
    ],
  },
  {
    id: "charred-chicken",
    title: "Charred lemon chicken",
    course: "Main",
    servings: 12,
    prep: "30 min",
    cook: "45 min",
    prep_minutes: 30,
    cook_minutes: 45,
    image: "/photos/party-01.webp",
    allergy: null,
    cost: 48.2,
    status: "Ready",
    description:
      "Bone-in thighs marinated with lemon, garlic, and oregano, then grilled until the skin blisters and the pan juices run bright.",
    ingredients: [
      { name: "Bone-in chicken thighs", quantity: "7", unit: "lb", note: null },
      { name: "Lemons", quantity: "4", unit: null, note: "zested and juiced" },
      { name: "Garlic", quantity: "8", unit: "cloves", note: "crushed" },
      { name: "Dried oregano", quantity: "2", unit: "tbsp", note: null },
      { name: "Olive oil", quantity: "1/2", unit: "cup", note: null },
    ],
    instructions: [
      "Whisk marinade and coat the chicken for at least 1 hour.",
      "Grill in two batches over medium-high heat.",
      "Rest 15 minutes, then finish with pan juices and lemon.",
    ],
  },
  {
    id: "herby-greens",
    title: "Herby greens & tahini",
    course: "Side",
    servings: 12,
    prep: "20 min",
    cook: "10 min",
    prep_minutes: 20,
    cook_minutes: 10,
    image: "/photos/party-04.webp",
    allergy: "Sesame",
    cost: 19.4,
    status: "Review allergy",
    description:
      "Charred greens dressed in lemony tahini with toasted seeds. Fresh, sharp, and ready to cut through the richer dishes.",
    ingredients: [
      { name: "Mixed hardy greens", quantity: "2", unit: "lb", note: null },
      { name: "Tahini", quantity: "1/2", unit: "cup", note: null },
      { name: "Lemons", quantity: "2", unit: null, note: "juiced" },
      { name: "Toasted seeds", quantity: "1/3", unit: "cup", note: null },
      { name: "Garlic", quantity: "1", unit: "clove", note: null },
    ],
    instructions: [
      "Char greens quickly in a hot pan or on the grill.",
      "Whisk tahini with lemon, garlic, and cold water until pourable.",
      "Dress greens just before serving and finish with seeds.",
    ],
  },
  {
    id: "olive-oil-cake",
    title: "Citrus olive oil cake",
    course: "Dessert",
    servings: 12,
    prep: "20 min",
    cook: "50 min",
    prep_minutes: 20,
    cook_minutes: 50,
    image: "/photos/party-08.webp",
    allergy: "Gluten, eggs",
    cost: 17.5,
    status: "Ready",
    description:
      "A tender olive oil cake scented with citrus, cooled completely, then finished with berries and softly whipped cream.",
    ingredients: [
      { name: "All-purpose flour", quantity: "2", unit: "cups", note: null },
      { name: "Extra-virgin olive oil", quantity: "1", unit: "cup", note: null },
      { name: "Eggs", quantity: "3", unit: "large", note: null },
      { name: "Sugar", quantity: "1", unit: "cup", note: null },
      { name: "Citrus zest", quantity: "2", unit: "tbsp", note: "orange + lemon" },
      { name: "Berries", quantity: "2", unit: "cups", note: "for serving" },
    ],
    instructions: [
      "Whisk wet ingredients, fold in dry, and pour into a lined pan.",
      "Bake at 350°F until a tester comes out clean.",
      "Cool fully before glazing or plating with cream and berries.",
    ],
  },
];

export const shoppingGroups = [
  {
    name: "Produce",
    items: [
      { id: 1, name: "Heirloom tomatoes", amount: "8 medium", price: 18, have: false },
      { id: 2, name: "Lemons", amount: "9", price: 7.2, have: false },
      { id: 3, name: "Flat-leaf parsley", amount: "3 bunches", price: 8.1, have: false },
      { id: 4, name: "Garlic", amount: "2 heads", price: 2.4, have: true },
    ],
  },
  {
    name: "Meat & seafood",
    items: [
      { id: 5, name: "Bone-in chicken thighs", amount: "7 lb", price: 34.3, have: false },
    ],
  },
  {
    name: "Dairy & eggs",
    items: [
      { id: 6, name: "Butter", amount: "1.5 lb", price: 9.8, have: false },
      { id: 7, name: "Eggs", amount: "1 dozen", price: 6.4, have: true },
      { id: 8, name: "Crème fraîche", amount: "16 oz", price: 8.9, have: false },
    ],
  },
  {
    name: "Pantry & bakery",
    items: [
      { id: 9, name: "All-purpose flour", amount: "5 cups", price: 4.8, have: true },
      { id: 10, name: "Tahini", amount: "1 jar", price: 7.5, have: false },
      { id: 11, name: "Extra-virgin olive oil", amount: "3 cups", price: 18, have: true },
    ],
  },
];

export const timelineTasks = [
  { id: 1, time: "Thu · 7:00 PM", title: "Make tart dough", detail: "Rest overnight in refrigerator", assignee: "Lukas", level: "Intermediate", done: true, locked: true },
  { id: 2, time: "Fri · 6:00 PM", title: "Marinate chicken", detail: "Lemon, garlic, oregano — 20 min active", assignee: "Maya", level: "Beginner", done: true, locked: false },
  { id: 3, time: "Sat · 10:00 AM", title: "Bake olive oil cake", detail: "Must cool before citrus glaze", assignee: "Lukas", level: "Intermediate", done: false, locked: true },
  { id: 4, time: "Sat · 1:30 PM", title: "Set table & chill wine", detail: "Outdoor table, flowers, candles", assignee: "Ari", level: "Beginner", done: false, locked: false },
  { id: 5, time: "Sat · 3:00 PM", title: "Blind-bake tart shell", detail: "Oven 375°F · Dependency: chilled dough", assignee: "Maya", level: "Intermediate", done: false, locked: false },
  { id: 6, time: "Sat · 4:10 PM", title: "Prep greens and tahini", detail: "Hold dressing separately", assignee: "Ari", level: "Beginner", done: false, locked: false },
  { id: 7, time: "Sat · 5:10 PM", title: "Grill chicken", detail: "Two batches · rest 15 min", assignee: "Lukas", level: "Advanced", done: false, locked: true },
  { id: 8, time: "Sat · 6:05 PM", title: "Finish tart & plate welcome bite", detail: "Keep main grill zone clear", assignee: "Maya", level: "Intermediate", done: false, locked: false },
];

export const guests = [
  { id: 1, name: "Maya Johnson", email: "maya@example.com", status: "Attending", allergies: "None", plus: 0 },
  { id: 2, name: "Ari Shah", email: "ari@example.com", status: "Attending", allergies: "Sesame", plus: 0 },
  { id: 3, name: "Eli Brooks", email: "eli@example.com", status: "Maybe", allergies: "None", plus: 1 },
  { id: 4, name: "Nina Chen", email: "nina@example.com", status: "Attending", allergies: "Gluten", plus: 0 },
  { id: 5, name: "Sam Rivera", email: "sam@example.com", status: "No response", allergies: "—", plus: 0 },
  { id: 6, name: "Jordan Lee", email: "jordan@example.com", status: "Not attending", allergies: "Shellfish", plus: 0 },
];

export const pantryStaples = [
  "Kosher salt", "Black pepper", "Olive oil", "Neutral oil", "Red wine vinegar", "Soy sauce", "Honey", "Flour", "Sugar", "Garlic", "Dried oregano", "Chili flakes"
];
