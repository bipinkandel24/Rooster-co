const SESSIONS = "rc_stocktake_sessions";
const DRAFT = "rc_stocktake_draft";

export function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  try {
    const entry = { ...session, id: `${Date.now()}`, at: new Date().toISOString() };
    const next = [entry, ...loadSessions()].slice(0, 60);
    localStorage.setItem(SESSIONS, JSON.stringify(next));
    return entry;
  } catch {
    return null;
  }
}

export function deleteSession(id) {
  try {
    const next = loadSessions().filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS, JSON.stringify(next));
    return next;
  } catch {
    return loadSessions();
  }
}

// Draft — a stocktake takes a while, so progress is saved as you count
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT);
  } catch {
    /* ignore */
  }
}

export const money = (n) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "—";

export function sessionValue(counts, items) {
  return items.reduce((sum, it) => {
    const q = Number(counts[it.id]);
    return sum + (Number.isFinite(q) ? q * (it.cost || 0) : 0);
  }, 0);
}

export function countedCount(counts, items) {
  return items.filter((it) => {
    const v = counts[it.id];
    return v !== undefined && v !== "" && v !== null;
  }).length;
}

// Usage between two stocktakes: opening + purchased − closing
export function buildVariance(current, previous, items, purchases = {}) {
  return items.map((it) => {
    const closing = Number(current.counts[it.id]);
    const opening = previous ? Number(previous.counts[it.id]) : NaN;
    const bought = Number(purchases[it.id]) || 0;

    const hasBoth = Number.isFinite(closing) && Number.isFinite(opening);
    const used = hasBoth ? opening + bought - closing : null;

    return {
      ...it,
      opening: Number.isFinite(opening) ? opening : null,
      bought,
      closing: Number.isFinite(closing) ? closing : null,
      used,
      usedValue: used != null ? used * (it.cost || 0) : null,
      value: Number.isFinite(closing) ? closing * (it.cost || 0) : null,
      belowPar: Number.isFinite(closing) && it.par ? closing < it.par : false,
      negative: used != null && used < 0,
    };
  });
}

export function fmtWhen(iso) {
  const d = new Date(iso);
  const today = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  if (same(d, today)) return `Today, ${time}`;
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}