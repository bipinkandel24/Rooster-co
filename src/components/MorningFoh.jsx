import React, { useState, useEffect, useMemo } from "react";
import {
  Sunrise, CheckCircle2, Circle, AlertTriangle, RotateCcw, X, Check, ListChecks,
} from "lucide-react";
import {
  MORNING_SECTIONS, ALL_TASKS, SHIFT, loadMorning, saveMorning,
  todayLabel, isRunningLate,
} from "../data/morningFoh";

export default function MorningFoh({ onBack }) {
  const [state, setState] = useState(() => loadMorning());
  const [showIncomplete, setShowIncomplete] = useState(false);

  useEffect(() => {
    saveMorning(state);
  }, [state]);

  const doneCount = ALL_TASKS.filter((t) => state.done[t.key]).length;
  const total = ALL_TASKS.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const remaining = ALL_TASKS.filter((t) => !state.done[t.key]);
  const late = isRunningLate() && remaining.length > 0;

  const toggle = (key) =>
    setState((p) => ({ ...p, done: { ...p.done, [key]: !p.done[key] } }));

  const resetDay = () => {
    if (doneCount > 0 && !window.confirm("Clear all ticks and start the list again?")) return;
    setState({
      date: new Date().toLocaleDateString("en-CA"),
      done: {},
      by: "",
      finishedAt: null,
    });
    setShowIncomplete(false);
  };

  const sectionStats = useMemo(
    () =>
      MORNING_SECTIONS.map((s) => {
        const keys = s.items.map((_, i) => `${s.id}:${i}`);
        const d = keys.filter((k) => state.done[k]).length;
        return { id: s.id, done: d, total: keys.length, pct: (d / keys.length) * 100 };
      }),
    [state.done]
  );

  // Circular progress ring
  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <Sunrise size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Morning Setup</h2>
          <div className="rc-stock-unit">{todayLabel()} · {SHIFT}</div>
        </div>
      </div>

      {/* Ring + section bars */}
      <div className="rc-morning-hero">
        <svg width="112" height="112" viewBox="0 0 112 112" className="rc-ring">
          <circle cx="56" cy="56" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle
            cx="56" cy="56" r={R} fill="none"
            stroke={pct === 100 ? "var(--ok-border)" : "var(--accent)"}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (C * pct) / 100}
            transform="rotate(-90 56 56)"
            style={{ transition: "stroke-dashoffset .4s ease" }}
          />
          <text x="56" y="52" textAnchor="middle" className="rc-ring-num">{pct}%</text>
          <text x="56" y="70" textAnchor="middle" className="rc-ring-sub">
            {doneCount}/{total}
          </text>
        </svg>

        <div className="rc-morning-bars">
          {sectionStats.map((s) => {
            const meta = MORNING_SECTIONS.find((m) => m.id === s.id);
            return (
              <div key={s.id} className="rc-morning-bar-row">
                <span className="rc-morning-bar-label">{meta.title}</span>
                <div className="rc-morning-bar">
                  <div
                    className="rc-morning-bar-fill"
                    style={{
                      width: `${s.pct}%`,
                      background: s.pct === 100 ? "var(--ok-border)" : "var(--accent)",
                    }}
                  />
                </div>
                <span className="rc-morning-bar-count">{s.done}/{s.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {pct === 100 ? (
        <div className="rc-sent-banner" style={{ marginBottom: 18 }}>
          <CheckCircle2 size={16} color="var(--ok-text)" />
          <span>Everything done. Ready for service.</span>
        </div>
      ) : late ? (
        <div className="rc-urgent-note">
          <strong>Past 10:30</strong> — {remaining.length} task
          {remaining.length === 1 ? "" : "s"} still outstanding. Service starts soon.
        </div>
      ) : (
        <div className="rc-due-banner">
          <AlertTriangle size={15} color="var(--gold)" />
          <span>{remaining.length} to go before 10:30.</span>
        </div>
      )}

      {remaining.length > 0 && (
        <button onClick={() => setShowIncomplete(true)} className="rc-history-toggle">
          <ListChecks size={15} color="var(--text-2)" />
          <span>Show what's left ({remaining.length})</span>
        </button>
      )}

      {/* Sections */}
      {MORNING_SECTIONS.map((s) => {
        const stat = sectionStats.find((x) => x.id === s.id);
        return (
          <div key={s.id} className="rc-prep-group">
            <div className="rc-prep-group-head">
              <span className="rc-prep-group-title">{s.title}</span>
              <span className="rc-prep-group-count">
                {stat.done}/{stat.total}
              </span>
            </div>
            <div className="rc-checklist-items">
              {s.items.map((label, i) => {
                const key = `${s.id}:${i}`;
                const isDone = !!state.done[key];
                return (
                  <button key={key} onClick={() => toggle(key)} className="rc-checklist-item">
                    {isDone ? (
                      <CheckCircle2 size={21} color="var(--ok-border)" style={{ flexShrink: 0 }} />
                    ) : (
                      <Circle size={21} color="var(--text-faint)" style={{ flexShrink: 0 }} />
                    )}
                    <span className={isDone ? "rc-item-done" : ""}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        onClick={resetDay}
        className={`rc-submit-btn ${doneCount > 0 ? "rc-submit-active" : ""}`}
        disabled={doneCount === 0}
      >
        <RotateCcw size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Reset list
      </button>

      <div className="rc-chat-disclaimer" style={{ marginTop: 12 }}>
        The list clears itself each morning.
      </div>

      {/* What's outstanding */}
      {showIncomplete && (
        <div className="rc-scan-modal" onClick={() => setShowIncomplete(false)}>
          <div className="rc-scan-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="rc-chat-header">
              <div>
                <div className="rc-chat-title">{remaining.length} still to do</div>
                <div className="rc-chat-sub">Tap to tick them off here</div>
              </div>
              <button onClick={() => setShowIncomplete(false)} className="rc-close-btn">
                <X size={16} />
              </button>
            </div>

            <div className="rc-scan-modal-body" style={{ background: "var(--bg-panel)" }}>
              <div className="rc-checklist-items">
                {remaining.map((t) => (
                  <button key={t.key} onClick={() => toggle(t.key)} className="rc-checklist-item">
                    <Circle size={20} color="var(--danger-soft)" style={{ flexShrink: 0 }} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: 14 }}>
              <button
                onClick={() => setShowIncomplete(false)}
                className="rc-submit-btn rc-submit-active"
              >
                <Check size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}