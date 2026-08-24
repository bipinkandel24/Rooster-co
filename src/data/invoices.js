const KEY = "rc_invoices";

export function loadInvoices() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveInvoice(inv) {
  try {
    const entry = { ...inv, id: `${Date.now()}`, savedAt: new Date().toISOString() };
    const next = [entry, ...loadInvoices()];
    localStorage.setItem(KEY, JSON.stringify(next));
    return entry;
  } catch {
    return null;
  }
}

export function deleteInvoice(id) {
  try {
    const next = loadInvoices().filter((i) => i.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadInvoices();
  }
}

export function clearInvoices() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// Monday-based week key, e.g. "2026-08-24"
export function weekOf(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return "Unknown";
  const day = (d.getDay() + 6) % 7; // Mon = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return monday.toLocaleDateString("en-CA");
}

export function weekLabel(key) {
  if (key === "Unknown") return "No date";
  const start = new Date(key);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (x) => x.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
}

export function groupByWeek(list) {
  const map = {};
  list.forEach((inv) => {
    const k = weekOf(inv.invoiceDate);
    (map[k] = map[k] || []).push(inv);
  });
  return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export const money = (n) =>
  typeof n === "number" && !Number.isNaN(n)
    ? n.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "—";