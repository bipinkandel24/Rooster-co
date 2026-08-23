const KEY = "rc_temp_log";
const MAX = 400; // roughly 3+ months of daily checks

// Your units — edit to match the shop
export const UNITS = [
  { id: "coolroom", label: "Coolroom", min: 0, max: 5 },
  { id: "fridge1", label: "Front Fridge", min: 0, max: 5 },
  { id: "fridge2", label: "Prep Fridge", min: 0, max: 5 },
  { id: "freezer", label: "Freezer", min: -25, max: -15 },
  { id: "display", label: "Display Cabinet", min: 0, max: 5 },
];

export function loadLog() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntry({ readings, staffName, note }) {
  try {
    const entry = {
      id: `${Date.now()}`,
      at: new Date().toISOString(),
      staffName,
      note: note || "",
      readings, // [{ unitId, label, temp, ok }]
    };
    const next = [entry, ...loadLog()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    return entry;
  } catch {
    return null;
  }
}

export function checkedToday() {
  const today = new Date().toDateString();
  return loadLog().some((e) => new Date(e.at).toDateString() === today);
}

export function inRange(unit, temp) {
  const n = parseFloat(temp);
  if (Number.isNaN(n)) return null;
  return n >= unit.min && n <= unit.max;
}

export function toCSV(log) {
  const rows = [["Date", "Time", "Unit", "Temp (°C)", "In range", "Checked by", "Note"]];
  log.forEach((e) => {
    const d = new Date(e.at);
    e.readings.forEach((r) => {
      rows.push([
        d.toLocaleDateString("en-AU"),
        d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
        r.label,
        r.temp,
        r.ok ? "Yes" : "NO",
        e.staffName,
        e.note.replace(/[\n,]/g, " "),
      ]);
    });
  });
  return rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}

export function fmtWhen(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yday = new Date(today);
  yday.setDate(yday.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  if (same(d, today)) return `Today, ${time}`;
  if (same(d, yday)) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) + `, ${time}`;
}