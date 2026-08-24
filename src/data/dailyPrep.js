// Which kitchen modules belong to the daily prep run.
// These ids match content.js exactly.
export const DAILY_PREP_IDS = [
  "hotfood",
  "saladprep",
  "saladbar",
  "backup",
  "marination",
  "tzatziki",
  "chickensalt",
];

// Code to reveal the training videos. Change as you like.
export const VIDEO_CODE = "1234";

const KEY = "rc_daily_prep";

const todayKey = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { date: todayKey(), done: {} };
    const parsed = JSON.parse(raw);
    // New day = fresh checklist
    if (parsed.date !== todayKey()) return { date: todayKey(), done: {} };
    return parsed;
  } catch {
    return { date: todayKey(), done: {} };
  }
}

export function saveProgress(done) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: todayKey(), done }));
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