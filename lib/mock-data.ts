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
    image: "/photos/party-04.webp",
    allergy: "Gluten, dairy",
    cost: 24.8,
    status: "Ready",
  },
  {
    id: "charred-chicken",
    title: "Charred lemon chicken",
    course: "Main",
    servings: 12,
    prep: "30 min",
    cook: "45 min",
    image: "/photos/party-01.webp",
    allergy: null,
    cost: 48.2,
    status: "Ready",
  },
  {
    id: "herby-greens",
    title: "Herby greens & tahini",
    course: "Side",
    servings: 12,
    prep: "20 min",
    cook: "10 min",
    image: "/photos/party-04.webp",
    allergy: "Sesame",
    cost: 19.4,
    status: "Review allergy",
  },
  {
    id: "olive-oil-cake",
    title: "Citrus olive oil cake",
    course: "Dessert",
    servings: 12,
    prep: "20 min",
    cook: "50 min",
    image: "/photos/party-08.webp",
    allergy: "Gluten, eggs",
    cost: 17.5,
    status: "Ready",
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
  { id: 1, time: "Thu · 7:00 PM", title: "Make tart dough", detail: "Rest overnight in refrigerator", assignee: "Lukas", level: "Intermediate", done: true, locked: true, duration: 45 },
  { id: 2, time: "Fri · 6:00 PM", title: "Marinate chicken", detail: "Lemon, garlic, oregano — 20 min active", assignee: "Maya", level: "Beginner", done: true, locked: false, duration: 20 },
  { id: 3, time: "Sat · 10:00 AM", title: "Bake olive oil cake", detail: "Must cool before citrus glaze", assignee: "Lukas", level: "Intermediate", done: false, locked: true, duration: 75 },
  { id: 4, time: "Sat · 1:30 PM", title: "Set table & chill wine", detail: "Outdoor table, flowers, candles", assignee: "Ari", level: "Beginner", done: false, locked: false, duration: 45 },
  { id: 5, time: "Sat · 3:00 PM", title: "Blind-bake tart shell", detail: "Oven 375°F · Dependency: chilled dough", assignee: "Maya", level: "Intermediate", done: false, locked: false, duration: 40 },
  { id: 6, time: "Sat · 4:10 PM", title: "Prep greens and tahini", detail: "Hold dressing separately", assignee: "Ari", level: "Beginner", done: false, locked: false, duration: 30 },
  { id: 7, time: "Sat · 5:10 PM", title: "Grill chicken", detail: "Two batches · rest 15 min", assignee: "Lukas", level: "Advanced", done: false, locked: true, duration: 50 },
  { id: 8, time: "Sat · 6:05 PM", title: "Finish tart & plate welcome bite", detail: "Keep main grill zone clear", assignee: "Maya", level: "Intermediate", done: false, locked: false, duration: 35 },
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
