import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle, Play, Lock, Unlock, RotateCcw, ChevronDown } from "lucide-react";
import { VIDEO_CODE, loadProgress, saveProgress, todayLabel } from "../data/dailyPrep";
import { getVideoUrl } from "../data/content";

export default function DailyPrep({ mods, onBack, onPlay }) {
  const [progress, setProgress] = useState(() => loadProgress());
  const [codeInput, setCodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("rc_videos") === "1"
  );
  const [showCode, setShowCode] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    saveProgress(progress.done);
  }, [progress]);

  // Flatten every module's items into one list, keeping their origin
  const tasks = mods.flatMap((m) =>
    m.items.map((it, idx) => ({
      key: `${m.id}:${idx}`,
      label: it.label,
      duration: it.duration,
      modId: m.id,
      modTitle: m.title,
      idx,
      color: m.color,
      Icon: m.icon,
    }))
  );

  const doneCount = tasks.filter((t) => progress.done[t.key]).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const toggle = (key) =>
    setProgress((p) => ({
      ...p,
      done: { ...p.done, [key]: !p.done[key] },
    }));

  const resetDay = () => setProgress((p) => ({ ...p, done: {} }));

  const tryUnlock = () => {
    if (codeInput.trim() === VIDEO_CODE) {
      setUnlocked(true);
      sessionStorage.setItem("rc_videos", "1");
      setShowCode(false);
      setCodeInput("");
      setErr("");
    } else {
      setErr("Wrong code.");
    }
  };

  // Group tasks by their source module for readable section headers
  const groups = mods
    .map((m) => ({
      id: m.id,
      title: m.title,
      color: m.color,
      Icon: m.icon,
      items: tasks.filter((t) => t.modId === m.id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div>
          <h2 className="rc-detail-title">Daily Prep</h2>
          <div className="rc-stock-unit">{todayLabel()}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="rc-prep-summary">
        <div className="rc-prep-figure">
          <span className="rc-prep-num">{doneCount}</span>
          <span className="rc-prep-den">/ {tasks.length}</span>
        </div>
        <div className="rc-prep-meta">
          <div className="rc-prep-pct">{pct}% complete</div>
          <div className="rc-progress-bar" style={{ marginBottom: 0 }}>
            <div className="rc-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {pct === 100 && (
        <div className="rc-sent-banner" style={{ marginBottom: 18 }}>
          <CheckCircle2 size={16} color="var(--ok-text)" />
          <span>All prep done for today. Nice work.</span>
        </div>
      )}

      {/* Task groups */}
      {groups.map((g) => {
        const gDone = g.items.filter((t) => progress.done[t.key]).length;
        return (
          <div key={g.id} className="rc-prep-group">
            <div className="rc-prep-group-head">
              <div className="rc-module-icon rc-icon-sm" style={{ background: g.color + "22" }}>
                <g.Icon size={15} color={g.color} />
              </div>
              <span className="rc-prep-group-title">{g.title}</span>
              <span className="rc-prep-group-count">
                {gDone}/{g.items.length}
              </span>
            </div>

            <div className="rc-checklist-items">
              {g.items.map((t) => {
                const isDone = !!progress.done[t.key];
                return (
                  <div key={t.key} className="rc-prep-row">
                    <button onClick={() => toggle(t.key)} className="rc-prep-check">
                      {isDone ? (
                        <CheckCircle2 size={21} color="var(--ok-border)" />
                      ) : (
                        <Circle size={21} color="var(--text-faint)" />
                      )}
                      <span className={isDone ? "rc-item-done" : ""}>{t.label}</span>
                    </button>

                    {unlocked && (
                      <button
                        onClick={() => onPlay(getVideoUrl(t.modId, t.idx), t.label)}
                        className="rc-prep-play"
                        aria-label={`Play ${t.label}`}
                        title="Watch video"
                      >
                        <Play size={13} fill="currentColor" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Video unlock */}
      <div className="rc-prep-footer">
        {unlocked ? (
          <div className="rc-prep-unlocked">
            <Unlock size={14} />
            <span>Training videos visible</span>
            <button
              onClick={() => {
                setUnlocked(false);
                sessionStorage.removeItem("rc_videos");
              }}
              className="rc-switch-btn"
            >
              Hide
            </button>
          </div>
        ) : showCode ? (
          <div className="rc-prep-codebox">
            <div className="rc-field-label">Enter code to show training videos</div>
            <input
              className="rc-field-input"
              type="tel"
              inputMode="numeric"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
              placeholder="Code"
            />
            {err && <div className="rc-gate-err" style={{ marginTop: 8 }}>{err}</div>}
            <button
              onClick={tryUnlock}
              disabled={!codeInput.trim()}
              className={`rc-submit-btn ${codeInput.trim() ? "rc-submit-active" : ""}`}
              style={{ marginTop: 10 }}
            >
              Unlock videos
            </button>
            <button onClick={() => setShowCode(false)} className="rc-switch-btn" style={{ marginTop: 10 }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowCode(true)} className="rc-history-toggle">
            <Lock size={15} color="var(--text-2)" />
            <span>Show training videos</span>
            <ChevronDown size={16} color="var(--text-3)" />
          </button>
        )}

        <button onClick={resetDay} className="rc-history-clear">
          <RotateCcw size={13} /> Reset today's checklist
        </button>
      </div>
    </div>
  );
}