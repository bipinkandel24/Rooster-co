import { ALL_TASKS, loadMorning } from "./morningFoh";
import { loadProgress } from "./dailyPrep";
import { checkedToday, loadLog, UNITS, inRange } from "./tempLog";
import { SUPPLIERS, dueToday } from "./suppliers";

export function todayLabel() {
  return new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 16) return "Good afternoon";
  return "Good evening";
}

// Morning setup progress
export function morningStatus() {
  const state = loadMorning();
  const done = ALL_TASKS.filter((t) => state.done[t.key]).length;
  const total = ALL_TASKS.length;
  const now = new Date();
  const late = (now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() >= 30)) && done < total;

  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    complete: done === total,
    late,
  };
}

// Daily prep progress — needs the module list passed in
export function prepStatus(prepMods) {
  const progress = loadProgress();
  const keys = prepMods.flatMap((m) => m.items.map((_, i) => `${m.id}:${i}`));
  const done = keys.filter((k) => progress.done[k]).length;
  return {
    done,
    total: keys.length,
    pct: keys.length ? Math.round((done / keys.length) * 100) : 0,
    complete: keys.length > 0 && done === keys.length,
  };
}

// Temperature log
export function tempStatus() {
  const done = checkedToday();
  if (!done) return { done: false, issues: [] };

  const today = new Date().toDateString();
  const entry = loadLog().find((e) => new Date(e.at).toDateString() === today);
  const issues = (entry?.readings || []).filter((r) => !r.ok).map((r) => r.label);
  return { done: true, issues, by: entry?.staffName };
}

// Suppliers to order from today
export function orderStatus() {
  const ids = dueToday();
  return ids
    .map((id) => SUPPLIERS.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ id: s.id, name: s.name, cutoff: s.cutoff }));
}

// Anything that needs attention right now, worst first
export function alerts(prepMods) {
  const out = [];
  const m = morningStatus();
  const t = tempStatus();

  if (t.done && t.issues.length) {
    out.push({
      tone: "bad",
      text: `${t.issues.join(", ")} out of temperature range — tell your supervisor.`,
    });
  }
  if (m.late) {
    out.push({
      tone: "bad",
      text: `Morning setup not finished — ${m.total - m.done} task${m.total - m.done === 1 ? "" : "s"} left.`,
    });
  }
  if (!t.done && new Date().getHours() >= 11) {
    out.push({ tone: "warn", text: "Fridge temperatures haven't been logged today." });
  }
  return out;
}