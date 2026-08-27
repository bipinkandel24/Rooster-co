const KEY = "rc_morning_foh";

export const SHIFT = "9:30 AM – 2:30 PM";
export const TARGET_END = "10:30";

export const MORNING_SECTIONS = [
  {
    id: "fire",
    title: "Fire & Cooking",
    items: [
      "Prepare fire for cooking",
      "Make rice (prep rice cooker)",
      "Ensure all hot food is cooking & timer on",
      "Turn on 3 oil fryers",
      "Turn on grill, hot plate & oven",
      "Check hot foods in oven — move to hot Bain Marie when ready",
      "Make gravy",
    ],
  },
  {
    id: "saladbar",
    title: "Salad Bar",
    items: [
      "Set up salad bar (tomato, lettuce, onion, tzatziki, cheese, bacon)",
      "Put out backup trays as needed",
      "Check tzatziki for HSP in small black tub",
      "Make 8–10 tzatziki ramekins (bought tzatziki)",
      "Spoons in all salads & hot food",
      "Put out salad signage",
      "Sanitise souvlaki / salad bar area before service",
    ],
  },
  {
    id: "prep",
    title: "Food Prep",
    items: [
      "Tray of chicken fillets ready, including backup",
      "Tender flour — milk",
      "Prep — flour, milk, product (chicken, wings, tenders)",
      "Fill chip bay",
      "Bring chip tray out & stock with chips",
      "Restock pita bread & rolls",
    ],
  },
  {
    id: "sauces",
    title: "Sauces & Bottles",
    items: [
      "Refill and clean all sauce bottles",
      "Refill mayo bottles and aioli bottles",
      "Refill / check oil bottles are full × 2",
      "Restock other sauces when necessary",
    ],
  },
  {
    id: "front",
    title: "Front of House Setup",
    items: [
      "Wash / wipe all counters, tables and benches with hot soapy water",
      "Sweep & mop if necessary",
      "Put out outdoor furniture",
      "Restock cutlery tray, takeaway cutlery & serviette dispenser",
      "Prepare cutlery caddies (2 serviettes, 3 forks, 3 knives each)",
      "Put out spoons, tongs, chip scoop",
      "Restock packaging & make up chip boxes",
      "iPad ready for service (product availability for Uber etc.)",
    ],
  },
  {
    id: "cleaning",
    title: "Cleaning & Consumables",
    items: [
      "Bucket for spikes — hot soapy water",
      "Prep jug with hot soapy water for used cutlery",
      "Prep blue chux for cleaning areas",
      "All rubbish bins lined and in place",
      "Refill Windex bottle, dish liquid & paper towel dispenser",
      "Dust top of both Bain Maries if necessary",
      "All floors, benches and tables clean before service",
    ],
  },
];

export const ALL_TASKS = MORNING_SECTIONS.flatMap((s) =>
  s.items.map((label, i) => ({ key: `${s.id}:${i}`, label, section: s.id }))
);

const todayKey = () => new Date().toLocaleDateString("en-CA");

export function loadMorning() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { date: todayKey(), done: {}, by: "", finishedAt: null };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) {
      return { date: todayKey(), done: {}, by: "", finishedAt: null };
    }
    return parsed;
  } catch {
    return { date: todayKey(), done: {}, by: "", finishedAt: null };
  }
}

export function saveMorning(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, date: todayKey() }));
  } catch {
    /* ignore */
  }
}

export function todayLabel() {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Are we past the 10:30 target with work outstanding?
export function isRunningLate() {
  const now = new Date();
  return now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() >= 30);
}