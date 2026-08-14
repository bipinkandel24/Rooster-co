const KEY = "rc_order_history";
const MAX = 60;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrder({ supplierId, supplierName, items, extra }) {
  try {
    const entry = {
      id: `${Date.now()}`,
      at: new Date().toISOString(),
      supplierId,
      supplierName,
      items, // [{ name, unit, qty }]
      extra: extra || "",
    };
    const next = [entry, ...loadHistory()].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    return entry;
  } catch {
    return null;
  }
}

export function lastOrderFor(supplierId) {
  return loadHistory().find((o) => o.supplierId === supplierId) || null;
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
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
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}