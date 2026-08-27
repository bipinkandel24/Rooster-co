const KEY = "rc_rosters";
const DEFAULTS = "rc_roster_defaults";

export const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

// Common shifts — tapping one is faster than typing times
export const SHIFT_PRESETS = [
  { id: "open", label: "Open", start: "09:30", end: "14:30" },
  { id: "mid", label: "Mid", start: "11:00", end: "17:00" },
  { id: "night", label: "Night", start: "16:30", end: "21:30" },
  { id: "close", label: "Close", start: "17:00", end: "22:00" },
  { id: "full", label: "Full", start: "10:00", end: "20:00" },
];

export function loadRosters() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoster(roster) {
  try {
    const all = loadRosters().filter((r) => r.weekStart !== roster.weekStart);
    const next = [{ ...roster, savedAt: new Date().toISOString() }, ...all]
      .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
      .slice(0, 104);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRosters();
  }
}

export function deleteRoster(weekStart) {
  try {
    const next = loadRosters().filter((r) => r.weekStart !== weekStart);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRosters();
  }
}

// --- dates -------------------------------------------------------------

export function mondayOf(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function nextMonday() {
  const m = mondayOf();
  m.setDate(m.getDate() + 7);
  return m;
}

export function weekLabel(weekStartISO) {
  const s = new Date(weekStartISO);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const f = (x) => x.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return `${f(s)} – ${f(e)}`;
}

export function dayDate(weekStartISO, dayIndex) {
  const d = new Date(weekStartISO);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

export function dayDateLabel(weekStartISO, dayIndex) {
  return dayDate(weekStartISO, dayIndex).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

// --- hours -------------------------------------------------------------

const toMins = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

export function shiftHours(shift) {
  if (!shift?.start || !shift?.end) return 0;
  const s = toMins(shift.start);
  let e = toMins(shift.end);
  if (s == null || e == null) return 0;
  if (e <= s) e += 24 * 60; // finishes after midnight
  const mins = e - s - (shift.unpaidBreak ? Number(shift.unpaidBreak) : 0);
  return Math.max(0, mins / 60);
}

export function staffHours(roster, staffId) {
  return DAYS.reduce(
    (sum, d) => sum + shiftHours(roster.shifts?.[staffId]?.[d.id]),
    0
  );
}

export function dayStaff(roster, dayId) {
  return Object.entries(roster.shifts || {})
    .filter(([, days]) => days[dayId]?.start)
    .map(([staffId]) => staffId);
}

export function totalHours(roster) {
  return Object.keys(roster.shifts || {}).reduce(
    (sum, id) => sum + staffHours(roster, id),
    0
  );
}

export const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
};

export const fmtHours = (h) =>
  h === 0 ? "—" : `${Number(h).toFixed(h % 1 === 0 ? 0 : 1)}h`;

// Plain-text roster for sharing
export function rosterText(roster, staff) {
  const lines = [`ROOSTER & CO ROSTER`, weekLabel(roster.weekStart), ""];

  staff.forEach((p) => {
    const days = roster.shifts?.[p.id];
    if (!days) return;
    const worked = DAYS.filter((d) => days[d.id]?.start);
    if (!worked.length) return;

    lines.push(`${p.name} — ${fmtHours(staffHours(roster, p.id))}`);
    worked.forEach((d) => {
      const s = days[d.id];
      lines.push(`  ${d.label}: ${fmtTime(s.start)}–${fmtTime(s.end)}`);
    });
    lines.push("");
  });

  lines.push(`Total: ${fmtHours(totalHours(roster))}`);
  return lines.join("\n");
}

export function personText(roster, person) {
  const days = roster.shifts?.[person.id] || {};
  const worked = DAYS.filter((d) => days[d.id]?.start);
  const lines = [
    `Hi ${person.name.split(" ")[0]}, your roster for ${weekLabel(roster.weekStart)}:`,
    "",
  ];
  if (!worked.length) {
    lines.push("No shifts this week.");
  } else {
    worked.forEach((d) => {
      const s = days[d.id];
      lines.push(
        `${d.label} ${dayDateLabel(roster.weekStart, DAYS.findIndex((x) => x.id === d.id))} — ${fmtTime(s.start)} to ${fmtTime(s.end)}`
      );
    });
    lines.push("", `Total: ${fmtHours(staffHours(roster, person.id))}`);
  }
  lines.push("", "— Rooster & Co");
  return lines.join("\n");
}