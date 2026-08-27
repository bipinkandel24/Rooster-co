import React, { useState, useEffect, useMemo } from "react";
import {
  Sunrise, CheckCircle2, Circle, AlertTriangle, RotateCcw, Send, X, Check,
} from "lucide-react";
import {
  MORNING_SECTIONS, ALL_TASKS, SHIFT, loadMorning, saveMorning,
  todayLabel, isRunningLate,
} from "../data/morningFoh";

export default function MorningFoh({ onBack }) {
  const [state, setState] = useState(() => loadMorning());
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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

  const resetDay = () =>
    setState({ date: new Date().toLocaleDateString("en-CA"), done: {}, by: state.by, finishedAt: null });

  const sectionStats = useMemo(
    () =>
      MORNING_SECTIONS.map((s) => {
        const keys = s.items.map((_, i) => `${s.id}:${i}`);
        const d = keys.filter((k) => state.done[k]).length;
        return { id: s.id, done: d, total: keys.length, pct: (d / keys.length) * 100 };
      }),
    [state.done]
  );

  const submit = async () => {
    if (remaining.length > 0 && !showIncomplete) {
      setShowIncomplete(true);
      return;
    }
    setSending(true);
    try {
      const done = ALL_TASKS.filter((t) => state.done[t.key]).map((t) => t.label);
      const missed = remaining.map((t) => t.label);

      await fetch("/api/send-cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: "Morning FOH Setup",
          staffName: state.by || "Unknown",
          done,
          missed,
          total,
        }),
      });
      setState((p) => ({ ...p, finishedAt: new Date().toISOString() }));
      setSent(true);
      setShowIncomplete(false);
    } catch {
      setState((p) => ({ ...p, finishedAt: new Date().toISOString() }));
      setSent(true);
    } finally {
      setSending(false);
    }
  };

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

      <div className="rc-field" style={{ marginTop: 8 }}>
        <label className="rc-field-label">Completed by</label>
        <input
          className="rc-field-input"
          value={state.by}
          onChange={(e) => setState((p) => ({ ...p, by: e.target.value }))}
          placeholder="Your name"
        />
      </div>

      {sent ? (
        <div className="rc-sent-banner">
          <CheckCircle2 size={16} color="var(--ok-text)" />
          <span>Sent to management. Thanks {state.by || ""}!</span>
        </div>
      ) : (
        <button
          onClick={submit}
          disabled={sending || !state.by.trim()}
          className={`rc-submit-btn ${state.by.trim() && !sending ? "rc-submit-active" : ""}`}
        >
          <Send size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          {sending ? "Sending…" : `Submit (${doneCount}/${total})`}
        </button>
      )}

      <button onClick={resetDay} className="rc-history-clear">
        <RotateCcw size={13} /> Reset today's list
      </button>

      {/* Incomplete reminder */}
      {showIncomplete && (
        <div className="rc-scan-modal" onClick={() => setShowIncomplete(false)}>
          <div className="rc-scan-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="rc-chat-header">
              <div>
                <div className="rc-chat-title">{remaining.length} still to do</div>
                <div className="rc-chat-sub">Tap one to jump back, or submit anyway</div>
              </div>
              <button onClick={() => setShowIncomplete(false)} className="rc-close-btn">
                <X size={16} />
              </button>
            </div>

            <div className="rc-scan-modal-body" style={{ background: "var(--bg-panel)" }}>
              <div className="rc-checklist-items">
                {remaining.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => toggle(t.key)}
                    className="rc-checklist-item"
                  >
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
                Go finish them
              </button>
              <button onClick={submit} className="rc-history-clear">
                Submit incomplete anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}