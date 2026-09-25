import { loadSessions, sessionValue } from "./stocktake";
import { loadInvoices } from "./invoices";
import { loadItems } from "./stockItems";

const KEY = "rc_pnl_weeks";

export function loadWeeks() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWeek(week) {
  try {
    const all = loadWeeks().filter((w) => w.weekStart !== week.weekStart);
    const next = [{ ...week, savedAt: new Date().toISOString() }, ...all]
      .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
      .slice(0, 120);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadWeeks();
  }
}

export function deleteWeek(weekStart) {
  try {
    const next = loadWeeks().filter((w) => w.weekStart !== weekStart);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadWeeks();
  }
}

// --- date helpers -------------------------------------------------------

const iso = (d) => d.toLocaleDateString("en-CA");

export function mondayOf(date = new Date()) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekBounds(weekStartISO) {
  const start = new Date(weekStartISO);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function weekLabel(weekStartISO) {
  const { start, end } = weekBounds(weekStartISO);
  const f = (x) => x.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
}

export function lastNWeeks(n = 12) {
  const out = [];
  const m = mondayOf();
  for (let i = 0; i < n; i++) {
    const d = new Date(m);
    d.setDate(d.getDate() - i * 7);
    out.push(iso(d));
  }
  return out;
}

// --- pulling figures out of the app ------------------------------------

// Closing stock = the last stocktake that falls inside the week.
// Opening stock = the last one before the week began.
export function stockForWeek(weekStartISO) {
  const { start, end } = weekBounds(weekStartISO);
  const items = loadItems();
  const sessions = loadSessions();

  const inWeek = sessions
    .filter((s) => {
      const d = new Date(s.at);
      return d >= start && d <= end;
    })
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  const before = sessions
    .filter((s) => new Date(s.at) < start)
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  const val = (s) => (s ? sessionValue(s.counts, s.itemsSnapshot || items) : null);

  return {
    closing: val(inWeek[0]),
    closingAt: inWeek[0]?.at || null,
    opening: val(before[0]),
    openingAt: before[0]?.at || null,
  };
}

// Group the week's invoices by supplier name as scanned — no fixed list,
// so a one-off supplier appears as its own line rather than vanishing.
export function purchasesForWeek(weekStartISO) {
  const { start, end } = weekBounds(weekStartISO);
  const invoices = loadInvoices();

  const byKey = {};
  let undated = 0;

  invoices.forEach((inv) => {
    const when = inv.invoiceDate ? new Date(inv.invoiceDate) : null;
    if (!when || Number.isNaN(when.getTime())) {
      undated++;
      return;
    }
    if (when < start || when > end) return;

    const amount = Number(inv.total);
    if (!Number.isFinite(amount)) return;

    const name = (inv.supplier || "Unknown supplier").trim();
    const key = name.toLowerCase();

    if (!byKey[key]) byKey[key] = { key, name, amount: 0, count: 0 };
    byKey[key].amount += amount;
    byKey[key].count += 1;
  });

  const lines = Object.values(byKey).sort((a, b) => b.amount - a.amount);
  const total = lines.reduce((s, l) => s + l.amount, 0);

  return { lines, total, undated };
}

// --- the maths ----------------------------------------------------------

export function calculate(week) {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const sales = num(week.sales);
  const opening = num(week.opening);
  const closing = num(week.closing);
  const purchases = (week.lines || []).reduce((s, l) => s + num(l.amount), 0);
  const labour = num(week.labour);
  const fixed = num(week.fixed);

  const cogs = opening + purchases - closing;
  const gross = sales - cogs;
  const operating = sales - cogs - labour;
  const net = operating - fixed;

  const pct = (x) => (sales > 0 ? (x / sales) * 100 : 0);

  return {
    sales,
    opening,
    closing,
    purchases,
    labour,
    fixed,
    cogs,
    cogsPct: pct(cogs),
    gross,
    grossPct: pct(gross),
    operating,
    net,
    netPct: pct(net),
    primeCostPct: pct(cogs + labour),
  };
}

export const money = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
    : "—";

export const money2 = (n) =>
  Number.isFinite(Number(n))
    ? Number(n).toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "—";

export const pct1 = (n) => `${Number(n || 0).toFixed(1)}%`;

// Rough industry benchmarks for a QSR — used only to colour the numbers
export function health(calc) {
  return {
    cogs: calc.cogsPct === 0 ? "none" : calc.cogsPct <= 32 ? "good" : calc.cogsPct <= 38 ? "ok" : "bad",
    prime: calc.primeCostPct === 0 ? "none" : calc.primeCostPct <= 60 ? "good" : calc.primeCostPct <= 68 ? "ok" : "bad",
  };
}