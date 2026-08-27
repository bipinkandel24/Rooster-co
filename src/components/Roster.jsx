import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Check, Copy, Share2, MessageSquare,
  Trash2, X, AlertTriangle, Users, History, Clock,
} from "lucide-react";
import {
  DAYS, SHIFT_PRESETS, loadRosters, saveRoster, deleteRoster, mondayOf, nextMonday,
  weekLabel, dayDateLabel, shiftHours, staffHours, dayStaff, totalHours,
  fmtTime, fmtHours, rosterText, personText,
} from "../data/roster";

const iso = (d) => d.toLocaleDateString("en-CA");

export default function Roster({ onBack, onSessionExpired }) {
  const [staff, setStaff] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [rosters, setRosters] = useState(() => loadRosters());
  const [current, setCurrent] = useState(() => {
    const key = iso(nextMonday());
    return loadRosters().find((r) => r.weekStart === key) || { weekStart: key, shifts: {}, notes: "" };
  });
  const [editing, setEditing] = useState(null); // { staffId, dayId }
  const [screen, setScreen] = useState("grid"); // grid | share | history
  const [toast, setToast] = useState("");
  const gridRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/staff", { credentials: "same-origin" });
        if (cancelled) return;
        if (r.status === 401) return onSessionExpired?.();
        if (!r.ok) throw new Error();
        const d = await r.json();
        setStaff(Array.isArray(d.staff) ? d.staff : []);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [onSessionExpired]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const shiftWeek = (dir) => {
    const d = new Date(current.weekStart);
    d.setDate(d.getDate() + dir * 7);
    const key = iso(d);
    setCurrent(rosters.find((r) => r.weekStart === key) || { weekStart: key, shifts: {}, notes: "" });
  };

  const setShift = (staffId, dayId, shift) =>
    setCurrent((p) => {
      const days = { ...(p.shifts[staffId] || {}) };
      if (shift) days[dayId] = shift;
      else delete days[dayId];
      return { ...p, shifts: { ...p.shifts, [staffId]: days } };
    });

  const copyLastWeek = () => {
    const d = new Date(current.weekStart);
    d.setDate(d.getDate() - 7);
    const prev = rosters.find((r) => r.weekStart === iso(d));
    if (!prev) return flash("No roster saved for last week.");
    setCurrent((p) => ({ ...p, shifts: JSON.parse(JSON.stringify(prev.shifts || {})) }));
    flash("Copied last week's shifts.");
  };

  const save = () => {
    setRosters(saveRoster(current));
    flash("Roster saved.");
  };

  const total = useMemo(() => totalHours(current), [current]);
  const emptyDays = DAYS.filter((d) => dayStaff(current, d.id).length === 0);

  // --- sharing ---------------------------------------------------------

  const shareText = async () => {
    const text = rosterText(current, staff);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Roster ${weekLabel(current.weekStart)}`, text });
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }
    navigator.clipboard?.writeText(text);
    flash("Roster copied — paste it into your group chat.");
  };

  const textPerson = (p) => {
    const num = String(p.phone || "").replace(/\s/g, "");
    if (!num) return flash(`No mobile on file for ${p.name}.`);
    const sep = /iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?";
    window.location.href = `sms:${num}${sep}body=${encodeURIComponent(personText(current, p))}`;
  };

  const emailEveryone = async () => {
    const withEmail = staff.filter((p) => p.email && current.shifts?.[p.id]);
    if (!withEmail.length) return flash("No staff with an email address on file.");

    let ok = 0;
    for (const p of withEmail) {
      try {
        const r = await fetch("/api/send-roster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: p.email,
            name: p.name,
            week: weekLabel(current.weekStart),
            body: personText(current, p),
          }),
        });
        const d = await r.json();
        if (d.ok) ok++;
      } catch {
        /* keep going */
      }
    }
    flash(`Emailed ${ok} of ${withEmail.length}.`);
  };

  // --- history ---------------------------------------------------------

  if (screen === "history") {
    return (
      <div className="rc-scroll-area">
        <button onClick={() => setScreen("grid")} className="rc-back-btn">← Back</button>
        <div className="rc-detail-heading">
          <div>
            <h2 className="rc-detail-title">Past rosters</h2>
            <div className="rc-stock-unit">{rosters.length} saved</div>
          </div>
        </div>
        <div className="rc-stock-list">
          {rosters.map((r) => (
            <div key={r.weekStart} className="rc-stock-row">
              <button
                onClick={() => { setCurrent(r); setScreen("grid"); }}
                className="rc-stock-info"
                style={{ background: "none", border: "none", textAlign: "left", padding: 0, color: "inherit", cursor: "pointer" }}
              >
                <div className="rc-stock-label">{weekLabel(r.weekStart)}</div>
                <div className="rc-stock-unit">{fmtHours(totalHours(r))} rostered</div>
              </button>
              <button onClick={() => setRosters(deleteRoster(r.weekStart))} className="rc-icon-btn">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- share screen ----------------------------------------------------

  if (screen === "share") {
    return (
      <div className="rc-scroll-area">
        <button onClick={() => setScreen("grid")} className="rc-back-btn">← Back to roster</button>

        <div className="rc-detail-heading">
          <div>
            <h2 className="rc-detail-title">Send the roster</h2>
            <div className="rc-stock-unit">{weekLabel(current.weekStart)}</div>
          </div>
        </div>

        <button onClick={shareText} className="rc-scan-btn">
          <Share2 size={18} />
          <span>Share whole roster</span>
        </button>

        <button onClick={emailEveryone} className="rc-export-btn" style={{ marginBottom: 22 }}>
          <span>Email each person their own shifts</span>
        </button>

        <div className="rc-checklist-heading">Text individually</div>
        <div className="rc-stock-list">
          {staff.map((p) => {
            const h = staffHours(current, p.id);
            return (
              <div key={p.id} className="rc-stock-row">
                <div className="rc-stock-info">
                  <div className="rc-stock-label">{p.name}</div>
                  <div className="rc-stock-unit">
                    {h > 0 ? `${fmtHours(h)} this week` : "No shifts"}
                    {p.phone ? "" : " · no mobile on file"}
                  </div>
                </div>
                <button
                  onClick={() => textPerson(p)}
                  disabled={!p.phone || h === 0}
                  className="rc-icon-btn rc-icon-mail"
                  aria-label={`Text ${p.name}`}
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="rc-checklist-heading" style={{ marginTop: 20 }}>Preview</div>
        <pre className="rc-roster-preview">{rosterText(current, staff)}</pre>

        <button
          onClick={() => { navigator.clipboard?.writeText(rosterText(current, staff)); flash("Copied."); }}
          className="rc-export-btn"
        >
          <Copy size={15} />
          <span>Copy as text</span>
        </button>

        {toast && <div className="rc-toast">{toast}</div>}
      </div>
    );
  }

  // --- main grid -------------------------------------------------------

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <CalendarDays size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Roster</h2>
          <div className="rc-stock-unit">{weekLabel(current.weekStart)}</div>
        </div>
      </div>

      <div className="rc-crop-actions" style={{ marginBottom: 14 }}>
        <button onClick={() => shiftWeek(-1)} className="rc-icon-btn"><ChevronLeft size={16} /></button>
        <span className="rc-stock-unit" style={{ alignSelf: "center", flex: 1, textAlign: "center" }}>
          {weekLabel(current.weekStart)}
        </span>
        <button onClick={() => shiftWeek(1)} className="rc-icon-btn"><ChevronRight size={16} /></button>
      </div>

      <div className="rc-prep-summary">
        <div className="rc-prep-meta">
          <div className="rc-prep-pct">Total rostered hours</div>
          <div className="rc-prep-num" style={{ fontSize: 26 }}>{fmtHours(total)}</div>
        </div>
      </div>

      {emptyDays.length > 0 && (
        <div className="rc-due-banner">
          <AlertTriangle size={15} color="var(--gold)" />
          <span>Nobody rostered on {emptyDays.map((d) => d.label).join(", ")}.</span>
        </div>
      )}

      {loadState === "loading" && (
        <div className="rc-stock-unit" style={{ padding: "8px 2px" }}>Loading staff…</div>
      )}
      {loadState === "error" && (
        <div className="rc-urgent-note">Couldn't load staff. Check your connection.</div>
      )}

      {loadState === "ready" && (
        <>
          <button onClick={copyLastWeek} className="rc-history-toggle">
            <Copy size={15} color="var(--text-2)" />
            <span>Copy last week's shifts</span>
          </button>

          <div className="rc-roster-scroll" ref={gridRef}>
            <table className="rc-roster">
              <thead>
                <tr>
                  <th className="rc-roster-name-col">Staff</th>
                  {DAYS.map((d, i) => (
                    <th key={d.id}>
                      <div>{d.label}</div>
                      <div className="rc-roster-date">{dayDateLabel(current.weekStart, i)}</div>
                    </th>
                  ))}
                  <th>Hrs</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((p) => (
                  <tr key={p.id}>
                    <td className="rc-roster-name-col">{p.name}</td>
                    {DAYS.map((d) => {
                      const s = current.shifts?.[p.id]?.[d.id];
                      return (
                        <td key={d.id}>
                          <button
                            onClick={() => setEditing({ staffId: p.id, dayId: d.id })}
                            className={`rc-roster-cell ${s?.start ? "rc-roster-on" : ""}`}
                          >
                            {s?.start ? (
                              <>
                                <span>{fmtTime(s.start)}</span>
                                <span>{fmtTime(s.end)}</span>
                              </>
                            ) : (
                              <span className="rc-roster-off">·</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="rc-roster-hours">{fmtHours(staffHours(current, p.id))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rc-checklist-heading" style={{ marginTop: 20 }}>
            <Users size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Cover per day
          </div>
          <div className="rc-stock-list">
            {DAYS.map((d, i) => {
              const on = dayStaff(current, d.id);
              return (
                <div key={d.id} className={`rc-stock-row ${on.length === 0 ? "rc-temp-bad" : ""}`}>
                  <div className="rc-stock-info">
                    <div className="rc-stock-label">
                      {d.label} {dayDateLabel(current.weekStart, i)}
                    </div>
                    <div className="rc-stock-unit">
                      {on.length
                        ? on.map((id) => staff.find((s) => s.id === id)?.name).filter(Boolean).join(", ")
                        : "Nobody on"}
                    </div>
                  </div>
                  <div className="rc-qty-value">{on.length}</div>
                </div>
              );
            })}
          </div>

          <button onClick={save} className="rc-submit-btn rc-submit-active">
            <Check size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Save roster
          </button>

          <button onClick={() => setScreen("share")} className="rc-export-btn">
            <Share2 size={15} />
            <span>Send to staff</span>
          </button>

          {rosters.length > 0 && (
            <button onClick={() => setScreen("history")} className="rc-history-toggle" style={{ marginTop: 14 }}>
              <History size={15} color="var(--text-2)" />
              <span>Past rosters ({rosters.length})</span>
              <ChevronRight size={16} color="var(--text-3)" />
            </button>
          )}
        </>
      )}

      {/* Shift editor */}
      {editing && (() => {
        const person = staff.find((s) => s.id === editing.staffId);
        const day = DAYS.find((d) => d.id === editing.dayId);
        const shift = current.shifts?.[editing.staffId]?.[editing.dayId] || {};
        return (
          <div className="rc-scan-modal" onClick={() => setEditing(null)}>
            <div className="rc-scan-modal-inner" onClick={(e) => e.stopPropagation()}>
              <div className="rc-chat-header">
                <div>
                  <div className="rc-chat-title">{person?.name}</div>
                  <div className="rc-chat-sub">{day?.label}</div>
                </div>
                <button onClick={() => setEditing(null)} className="rc-close-btn"><X size={16} /></button>
              </div>

              <div style={{ padding: 16 }}>
                <div className="rc-checklist-heading">Quick shifts</div>
                <div className="rc-preset-row">
                  {SHIFT_PRESETS.map((ps) => (
                    <button
                      key={ps.id}
                      onClick={() => setShift(editing.staffId, editing.dayId, { start: ps.start, end: ps.end })}
                      className="rc-preset-btn"
                    >
                      <span>{ps.label}</span>
                      <span className="rc-preset-time">{fmtTime(ps.start)}–{fmtTime(ps.end)}</span>
                    </button>
                  ))}
                </div>

                <div className="rc-field-row" style={{ marginTop: 16 }}>
                  <div className="rc-field">
                    <label className="rc-field-label">Start</label>
                    <input
                      className="rc-field-input" type="time"
                      value={shift.start || ""}
                      onChange={(e) => setShift(editing.staffId, editing.dayId, { ...shift, start: e.target.value })}
                    />
                  </div>
                  <div className="rc-field">
                    <label className="rc-field-label">Finish</label>
                    <input
                      className="rc-field-input" type="time"
                      value={shift.end || ""}
                      onChange={(e) => setShift(editing.staffId, editing.dayId, { ...shift, end: e.target.value })}
                    />
                  </div>
                </div>

                {shift.start && shift.end && (
                  <div className="rc-sent-banner" style={{ marginBottom: 14 }}>
                    <Clock size={15} color="var(--ok-text)" />
                    <span>{fmtHours(shiftHours(shift))} shift</span>
                  </div>
                )}

                <button onClick={() => setEditing(null)} className="rc-submit-btn rc-submit-active">
                  Done
                </button>
                <button
                  onClick={() => { setShift(editing.staffId, editing.dayId, null); setEditing(null); }}
                  className="rc-history-clear"
                >
                  <Trash2 size={13} /> Day off
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && <div className="rc-toast">{toast}</div>}
    </div>
  );
}