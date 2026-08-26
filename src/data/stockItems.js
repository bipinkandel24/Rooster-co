import { SUPPLIERS } from "./suppliers";

const KEY = "rc_stock_items";

// Count by supplier — the below-par list then becomes that supplier's order
export const GROUPS = SUPPLIERS.map((s) => ({ id: s.id, label: s.name }));

// Built from the Rooster & Co supplier stocktake sheet.
// unit = how you COUNT it. cost = what one of those units costs.
// par = 0 means "don't flag" — set these in the item editor as you go.
const DEFAULT_ITEMS = [
  // ---------------- CADELL ----------------
  { id: "cad-amcheese", name: "American Cheese", supplier: "cadel", unit: "tin", cost: 32.95, par: 0 },
  { id: "cad-bacon", name: "Bacon", supplier: "cadel", unit: "pack", cost: 35.95, par: 0 },
  { id: "cad-bbq", name: "BBQ Sauce", supplier: "cadel", unit: "unit", cost: 18.35, par: 0 },
  { id: "cad-bbqsprinkle", name: "BBQ Sprinkle", supplier: "cadel", unit: "bucket", cost: 63.95, par: 0 },
  { id: "cad-beetroot", name: "Beetroot", supplier: "cadel", unit: "box", cost: 18.25, par: 0 },
  { id: "cad-lemon", name: "Bottled Lemon", supplier: "cadel", unit: "bottle", cost: 4.55, par: 0 },
  { id: "cad-booster", name: "Chicken Booster", supplier: "cadel", unit: "bucket", cost: 160.0, par: 0 },
  { id: "cad-gravy", name: "Chicken Gravy", supplier: "cadel", unit: "box", cost: 110.0, par: 0 },
  { id: "cad-chickensalt", name: "Chicken Salt", supplier: "cadel", unit: "bag", cost: 43.9, par: 0 },
  { id: "cad-chilliflakes", name: "Chilli Flakes", supplier: "cadel", unit: "bag", cost: 14.0, par: 0 },
  { id: "cad-chillipowder", name: "Chilli Powder", supplier: "cadel", unit: "bag", cost: 11.0, par: 0 },
  { id: "cad-chips", name: "Chips", supplier: "cadel", unit: "box", cost: 41.95, par: 0 },
  { id: "cad-corn", name: "Corn", supplier: "cadel", unit: "box", cost: 10.5, par: 0 },
  { id: "cad-cream", name: "Cream", supplier: "cadel", unit: "box", cost: 38.5, par: 0 },
  { id: "cad-dimsims", name: "Dim Sims", supplier: "cadel", unit: "box", cost: 54.75, par: 0 },
  { id: "cad-fetta", name: "Fetta", supplier: "cadel", unit: "tin", cost: 115.0, par: 0 },
  { id: "cad-flour", name: "Flour", supplier: "cadel", unit: "bag", cost: 15.6, par: 0 },
  { id: "cad-aioli", name: "Garlic Aioli", supplier: "cadel", unit: "tub", cost: 16.65, par: 0 },
  { id: "cad-haloumi", name: "Haloumi", supplier: "cadel", unit: "tub", cost: 37.95, par: 0 },
  { id: "cad-hotchilli", name: "Hot Chilli", supplier: "cadel", unit: "unit", cost: 19.7, par: 0 },
  { id: "cad-koreanbbq", name: "Korean BBQ", supplier: "cadel", unit: "unit", cost: 15.35, par: 0 },
  { id: "cad-rice", name: "Long Grain Rice", supplier: "cadel", unit: "bag", cost: 26.9, par: 0 },
  { id: "cad-milk", name: "Milk", supplier: "cadel", unit: "unit", cost: 2.2, par: 0 },
  { id: "cad-mixedherbs", name: "Mixed Herbs", supplier: "cadel", unit: "bag", cost: 11.0, par: 0 },
  { id: "cad-mustard", name: "Mustard", supplier: "cadel", unit: "unit", cost: 21.25, par: 0 },
  { id: "cad-nuggets", name: "Nuggets", supplier: "cadel", unit: "box", cost: 13.35, par: 0 },
  { id: "cad-olives", name: "Olives", supplier: "cadel", unit: "tin", cost: 81.65, par: 0 },
  { id: "cad-oregano", name: "Oregano", supplier: "cadel", unit: "bag", cost: 10.0, par: 0 },
  { id: "cad-paprika", name: "Paprika", supplier: "cadel", unit: "bag", cost: 105.0, par: 0 },
  { id: "cad-pasta", name: "Pasta", supplier: "cadel", unit: "bag", cost: 13.8, par: 0 },
  { id: "cad-pepper", name: "Pepper", supplier: "cadel", unit: "bag", cost: 19.95, par: 0 },
  { id: "cad-periperi", name: "Peri Peri", supplier: "cadel", unit: "unit", cost: 19.7, par: 0 },
  { id: "cad-pesto", name: "Pesto", supplier: "cadel", unit: "tub", cost: 21.9, par: 0 },
  { id: "cad-potatocakes", name: "Potato Cakes", supplier: "cadel", unit: "box", cost: 14.0, par: 0 },
  { id: "cad-salt", name: "Salt", supplier: "cadel", unit: "bag", cost: 15.4, par: 0 },
  { id: "cad-parmesan", name: "Shaved Parmesan", supplier: "cadel", unit: "bag", cost: 19.95, par: 0 },
  { id: "cad-shreddedtasty", name: "Shredded Tasty", supplier: "cadel", unit: "bag", cost: 23.5, par: 0 },
  { id: "cad-sundried", name: "Sundried Tomato", supplier: "cadel", unit: "tub", cost: 23.4, par: 0 },
  { id: "cad-sweetchilli", name: "Sweet Chilli", supplier: "cadel", unit: "unit", cost: 31.85, par: 0 },
  { id: "cad-tarama", name: "Tarama", supplier: "cadel", unit: "tub", cost: 23.75, par: 0 },
  { id: "cad-tomatosauce", name: "Tomato Sauce", supplier: "cadel", unit: "unit", cost: 16.85, par: 0 },
  { id: "cad-tzatziki", name: "Tzatziki 2kg", supplier: "cadel", unit: "tub", cost: 21.25, par: 0 },
  { id: "cad-vegoil", name: "Vegetable Oil", supplier: "cadel", unit: "drum", cost: 53.15, par: 0 },
  { id: "cad-vinegar", name: "Vinegar", supplier: "cadel", unit: "drum", cost: 17.5, par: 0 },
  { id: "cad-walnuts", name: "Walnuts", supplier: "cadel", unit: "bag", cost: 18.7, par: 0 },
  { id: "cad-yogurt", name: "Yogurt", supplier: "cadel", unit: "tub", cost: 41.75, par: 0 },

  // ---------------- TUROSI ----------------
  { id: "tur-chicken", name: "Box of Chicken", supplier: "turosi", unit: "box", cost: 72.0, par: 0 },

  // ---------------- OROSO ----------------
  { id: "oro-gyro", name: "Chicken Gyro", supplier: "oroso", unit: "kg", cost: 9.5, par: 0 },
  { id: "oro-fillets", name: "Fillets", supplier: "oroso", unit: "kg", cost: 13.0, par: 0 },
  { id: "oro-lambgyro", name: "Lamb Gyro", supplier: "oroso", unit: "kg", cost: 18.0, par: 0 },
  { id: "oro-ribs", name: "Ribs", supplier: "oroso", unit: "kg", cost: 6.5, par: 0 },
  { id: "oro-tenders", name: "Tenders", supplier: "oroso", unit: "kg", cost: 10.0, par: 0 },

  // ---------------- BIVIANO ----------------
  { id: "biv-cucumbers", name: "Cucumbers", supplier: "biviano", unit: "bag", cost: 24.0, par: 0 },
  { id: "biv-potatoes", name: "Potatoes", supplier: "biviano", unit: "bag", cost: 22.0, par: 0 },
  { id: "biv-celery", name: "Celery", supplier: "biviano", unit: "bunch", cost: 3.5, par: 0 },
  { id: "biv-coleslaw", name: "Coleslaw", supplier: "biviano", unit: "kg", cost: 9.95, par: 0 },
  { id: "biv-onion", name: "Onion", supplier: "biviano", unit: "kg", cost: 6.0, par: 0 },
  { id: "biv-pumpkin", name: "Pumpkin", supplier: "biviano", unit: "kg", cost: 6.5, par: 0 },
  { id: "biv-sweetpotato", name: "Sweet Potatoes", supplier: "biviano", unit: "kg", cost: 4.95, par: 0 },
  { id: "biv-tomatoes", name: "Tomatoes", supplier: "biviano", unit: "box", cost: 40.0, par: 0 },
  { id: "biv-zucchini", name: "Zucchini", supplier: "biviano", unit: "kg", cost: 6.0, par: 0 },

  // ---------------- 8 FOODS ----------------
  { id: "8f-provencale", name: "Provencale", supplier: "8foods", unit: "box", cost: 40.0, par: 0 },
  { id: "8f-mayo", name: "Mayo", supplier: "8foods", unit: "box", cost: 35.0, par: 0 },

  // ---------------- CHARCOAL ----------------
  { id: "chr-bag15", name: "Charcoal Bag 15kg", supplier: "charcoal", unit: "bag", cost: 24.0, par: 0 },
  { id: "chr-bag20", name: "Charcoal Bag 20kg", supplier: "charcoal", unit: "bag", cost: 33.0, par: 0 },

  // ---------------- MR PITA ----------------
  { id: "pit-17cm", name: "Pitta 17cm", supplier: "mrpita", unit: "box", cost: 29.4, par: 0 },
  { id: "pit-21cm", name: "Pitta 21cm", supplier: "mrpita", unit: "box", cost: 23.5, par: 0 },
  { id: "pit-milkbuns", name: "Milk Buns", supplier: "mrpita", unit: "packet", cost: 5.0, par: 0 },

  // ---------------- LOTUS ----------------
  { id: "lot-plasticbags", name: "Large Plastic Bags", supplier: "lotus", unit: "box", cost: 30.0, par: 0 },
  { id: "lot-cutlery", name: "Cutlery", supplier: "lotus", unit: "box", cost: 38.0, par: 0 },
  { id: "lot-gloves", name: "Gloves", supplier: "lotus", unit: "box", cost: 34.0, par: 0 },
  { id: "lot-foilcontainer", name: "Foil Containers", supplier: "lotus", unit: "box", cost: 65.0, par: 0 },
  { id: "lot-bowl1000", name: "Food Bowl 1000ml", supplier: "lotus", unit: "box", cost: 62.0, par: 0 },
  { id: "lot-bowl500", name: "Food Bowl 500ml", supplier: "lotus", unit: "box", cost: 48.0, par: 0 },
  { id: "lot-bowl750", name: "Food Bowl 750ml", supplier: "lotus", unit: "box", cost: 54.0, par: 0 },
  { id: "lot-handtowels", name: "Hand Towels", supplier: "lotus", unit: "box", cost: 35.0, par: 0 },
  { id: "lot-lids", name: "Lids", supplier: "lotus", unit: "box", cost: 41.0, par: 0 },
  { id: "lot-spf", name: "SPF", supplier: "lotus", unit: "box", cost: 52.0, par: 0 },
  { id: "lot-spj", name: "SPJ", supplier: "lotus", unit: "box", cost: 36.0, par: 0 },
  { id: "lot-spl", name: "SPL", supplier: "lotus", unit: "box", cost: 48.0, par: 0 },
  { id: "lot-sps", name: "SPS", supplier: "lotus", unit: "box", cost: 50.0, par: 0 },
  { id: "lot-sugarcane88", name: "Sugarcane 8x8", supplier: "lotus", unit: "box", cost: 50.0, par: 0 },
  { id: "lot-sugarcane99", name: "Sugarcane 9x9", supplier: "lotus", unit: "box", cost: 49.0, par: 0 },
  { id: "lot-sugarcane993", name: "Sugarcane 9x9x3", supplier: "lotus", unit: "box", cost: 52.0, par: 0 },
  { id: "lot-burgerbox", name: "Sugarcane Burger Box", supplier: "lotus", unit: "box", cost: 44.0, par: 0 },
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