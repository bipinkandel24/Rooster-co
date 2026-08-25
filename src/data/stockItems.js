import { SUPPLIERS } from "./suppliers";

const KEY = "rc_stock_items";

// Count by supplier — the below-par list then becomes that supplier's order
export const GROUPS = SUPPLIERS.map((s) => ({ id: s.id, label: s.name }));

const DEFAULT_ITEMS = [
  // Cadel
  { id: "chips", name: "Chips (McCain Fast Fry)", supplier: "cadel", unit: "box", cost: 34, par: 8 },
  { id: "pita", name: "Gluten free pita bread", supplier: "cadel", unit: "pack", cost: 9, par: 20 },
  { id: "cream", name: "Thick cream", supplier: "cadel", unit: "box", cost: 24, par: 1 },
  { id: "shredcheese", name: "Shredded cheese", supplier: "cadel", unit: "bag", cost: 14, par: 6 },
  { id: "parmesan", name: "Parmesan", supplier: "cadel", unit: "bag", cost: 18, par: 2 },
  { id: "halloumi", name: "Halloumi", supplier: "cadel", unit: "5kg tub", cost: 62, par: 2 },
  { id: "fetta", name: "Fetta", supplier: "cadel", unit: "large tin", cost: 38, par: 2 },
  { id: "yogurt", name: "Yogurt", supplier: "cadel", unit: "10kg tub", cost: 42, par: 2 },
  { id: "bacon", name: "Bacon short", supplier: "cadel", unit: "2.5kg", cost: 32, par: 2 },
  { id: "nuggets", name: "Nuggets", supplier: "cadel", unit: "box", cost: 45, par: 2 },
  { id: "dimsims", name: "Dim sims", supplier: "cadel", unit: "box", cost: 40, par: 2 },
  { id: "potatocakes", name: "Potato cakes", supplier: "cadel", unit: "box", cost: 32, par: 2 },
  { id: "olives", name: "Kalamata olives", supplier: "cadel", unit: "20kg tin", cost: 78, par: 1 },
  { id: "penne", name: "Penne", supplier: "cadel", unit: "bag", cost: 12, par: 2 },
  { id: "rice", name: "Rice", supplier: "cadel", unit: "10kg bag", cost: 22, par: 2 },
  { id: "oil", name: "Veg oil", supplier: "cadel", unit: "20kg drum", cost: 48, par: 3 },
  { id: "flour", name: "Flour", supplier: "cadel", unit: "bag", cost: 18, par: 2 },
  { id: "booster", name: "Chicken booster", supplier: "cadel", unit: "30kg bucket", cost: 95, par: 1 },
  { id: "bbqsprinkle", name: "BBQ sprinkle", supplier: "cadel", unit: "10kg bucket", cost: 60, par: 1 },

  // Biviano
  { id: "lettuce", name: "Iceberg lettuce", supplier: "biviano", unit: "box", cost: 28, par: 1 },
  { id: "tomato", name: "Tomatoes", supplier: "biviano", unit: "box", cost: 35, par: 1 },
  { id: "cucumber", name: "Cucumber", supplier: "biviano", unit: "bag", cost: 18, par: 2 },
  { id: "potatoes", name: "Peeled potatoes", supplier: "biviano", unit: "bag", cost: 22, par: 2 },
  { id: "carrots", name: "Carrots", supplier: "biviano", unit: "kg", cost: 2.5, par: 15 },
  { id: "onionred", name: "Red onions", supplier: "biviano", unit: "kg", cost: 3.5, par: 10 },
  { id: "capsred", name: "Red capsicum", supplier: "biviano", unit: "kg", cost: 8, par: 5 },
  { id: "garlic", name: "Peeled garlic", supplier: "biviano", unit: "bag", cost: 20, par: 1 },
  { id: "celery", name: "Celery", supplier: "biviano", unit: "bunch", cost: 4, par: 3 },

  // Turosi
  { id: "chicken", name: "Chicken (raw)", supplier: "turosi", unit: "kg", cost: 7.5, par: 60 },

  // Mr Pita
  { id: "wraps", name: "Wraps", supplier: "mrpita", unit: "pack", cost: 8, par: 15 },

  // 8 Foods
  { id: "mayo", name: "Mayo", supplier: "8foods", unit: "box", cost: 55, par: 2 },
  { id: "provencale", name: "GF Provençale", supplier: "8foods", unit: "box", cost: 48, par: 4 },

  // Honey Dee
  { id: "louks", name: "Loukoumades", supplier: "honeydee", unit: "box", cost: 55, par: 3 },

  // Lotus
  { id: "boxes", name: "Packaging / boxes", supplier: "lotus", unit: "pack", cost: 42, par: 6 },

  // Coke / Schweppes
  { id: "coke", name: "Coke range", supplier: "coke", unit: "case", cost: 28, par: 8 },
  { id: "schweppes", name: "Schweppes range", supplier: "schweppes", unit: "case", cost: 26, par: 5 },

  // Charcoal
  { id: "charcoal", name: "Charcoal", supplier: "charcoal", unit: "bag", cost: 26, par: 12 },

  // T Towels
  { id: "ttowels", name: "T-towels", supplier: "ttowels", unit: "bundle", cost: 25, par: 2 },
];

export function loadItems() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ITEMS;
  } catch {
    return DEFAULT_ITEMS;
  }
}

export function saveItems(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function resetItems() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return DEFAULT_ITEMS;
}