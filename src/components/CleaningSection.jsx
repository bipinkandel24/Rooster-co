import React, { useState } from "react";
import { Sofa, ChefHat, ChevronRight, CheckCircle2, Circle, Send, UserRound } from "lucide-react";

export default function CleaningSection({
  area,            // null | "foh" | "back"
  onOpenArea,
  onBackToAreas,
  names,           // { foh, back }
  onSetName,
  checked,         // { foh: [], back: [] }
  onToggle,
  lists,           // { foh: [], back: [] }
  ownerEmail,
}) {
  const [nameInput, setNameInput] = useState("");
  // Keyed by area so submitting one section doesn't lock the other
  const [sentMap, setSentMap] = useState({});
  const [busyMap, setBusyMap] = useState({});
  const [failedMap, setFailedMap] = useState({});

  const AREAS = [
    { id: "foh", label: "Front of House", sub: "Dining, counter, drinks", Icon: Sofa, color: "#6E8A8A" },
    { id: "back", label: "Back Kitchen", sub: "Grill, fryer, prep, floors", Icon: ChefHat, color: "#C8702A" },
  ];

  // ---------- Area picker ----------
  if (!area) {
    return (
      <div className="rc-scroll-area">
        <div className="rc-checklist-heading">Choose your area</div>
        <div className="rc-stock-list">
          {AREAS.map((a) => {
            const done = (checked[a.id] || []).filter(Boolean).length;
            const total = lists[a.id].length;
            return (
              <button key={a.id} onClick={() => onOpenArea(a.id)} className="rc-supplier-row">
                <div className="rc-module-icon" style={{ background: a.color + "22" }}>
                  <a.Icon size={19} color={a.color} />
                </div>
                <div className="rc-stock-info">
                  <div className="rc-stock-label">
                    {a.label}
                    {sentMap[a.id] && <span className="rc-due-dot" style={{ background: "var(--ok-border)" }} />}
                  </div>
                  <div className="rc-stock-unit">
                    {sentMap[a.id]
                      ? `Submitted by ${names[a.id]}`
                      : names[a.id]
                      ? `${names[a.id]} · ${done}/${total} done`
                      : a.sub}
                  </div>
                </div>
                <ChevronRight size={17} color="var(--text-3)" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const meta = AREAS.find((a) => a.id === area);
  const list = lists[area];
  const marks = checked[area] || [];
  const staffName = names[area];

  // ---------- Name gate for this area ----------
  if (!staffName) {
    return (
      <div className="rc-scroll-area">
        <button onClick={onBackToAreas} className="rc-back-btn">← Both areas</button>

        <div className="rc-namegate">
          <div className="rc-gate-icon" style={{ background: meta.color + "22" }}>
            <UserRound size={22} color={meta.color} />
          </div>
          <div className="rc-namegate-title">{meta.label}</div>
          <div className="rc-namegate-sub">Who's cleaning this area tonight?</div>

          <input
            className="rc-name-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) {
                onSetName(area, nameInput.trim());
                setNameInput("");
              }
            }}
            placeholder="Your name"
            autoComplete="off"
          />

          <button
            onClick={() => {
              if (!nameInput.trim()) return;
              onSetName(area, nameInput.trim());
              setNameInput("");
            }}
            disabled={!nameInput.trim()}
            className={`rc-submit-btn ${nameInput.trim() ? "rc-submit-active" : ""}`}
          >
            Start checklist
          </button>
        </div>
      </div>
    );
  }

  // ---------- Checklist ----------
  const doneCount = marks.filter(Boolean).length;
  const canSubmit = doneCount > 0;

  const sent = !!sentMap[area];
  const busy = !!busyMap[area];
  const failed = !!failedMap[area];

  const signOut = () => {
    onSetName(area, null);
    setSentMap((p) => ({ ...p, [area]: false }));
    setFailedMap((p) => ({ ...p, [area]: false }));
  };

  const submit = async () => {
    if (busy) return;
    setBusyMap((p) => ({ ...p, [area]: true }));
    setFailedMap((p) => ({ ...p, [area]: false }));

    const done = list.filter((_, i) => marks[i]);
    const missed = list.filter((_, i) => !marks[i]);

    try {
      const r = await fetch("/api/send-cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: meta.label,
          staffName,
          done,
          missed,
          total: list.length,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error();
      setSentMap((p) => ({ ...p, [area]: true }));
    } catch {
      setFailedMap((p) => ({ ...p, [area]: true }));
    } finally {
      setBusyMap((p) => ({ ...p, [area]: false }));
    }
  };

  // Fallback if the server send fails — opens the device's mail app instead
  const submitManually = () => {
    const now = new Date();
    const done = list.filter((_, i) => marks[i]);
    const missed = list.filter((_, i) => !marks[i]);

    const body = [
      `${meta.label.toUpperCase()} CLEANING — Rooster & Co`,
      ``,
      `Completed by: ${staffName}`,
      `Progress: ${doneCount} of ${list.length}`,
      ``,
      `DONE (${done.length})`,
      ...done.map((t) => `  [x] ${t}`),
      ...(missed.length
        ? ["", `NOT DONE (${missed.length})`, ...missed.map((t) => `  [ ] ${t}`)]
        : []),
    ].join("\n");

    const subject = `${meta.label} cleaning — ${now.toLocaleDateString("en-AU")} — ${staffName}`;
    window.location.href = `mailto:${ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSentMap((p) => ({ ...p, [area]: true }));
  };

  return (
    <div className="rc-scroll-area">
      <button onClick={onBackToAreas} className="rc-back-btn">← Both areas</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: meta.color + "22" }}>
          <meta.Icon size={19} color={meta.color} />
        </div>
        <div>
          <h2 className="rc-detail-title">{meta.label}</h2>
          <div className="rc-stock-unit">
            {staffName} · {doneCount}/{list.length} done
          </div>
        </div>
      </div>

      <div className="rc-signed-in-row">
        <span>
          Signed in as <strong style={{ color: "var(--text)" }}>{staffName}</strong>
        </span>
        <button onClick={signOut} className="rc-switch-btn">
          Not you?
        </button>
      </div>

      <div className="rc-progress-bar">
        <div
          className="rc-progress-fill"
          style={{ width: `${list.length ? (doneCount / list.length) * 100 : 0}%` }}
        />
      </div>

      <div className="rc-checklist-items">
        {list.map((item, i) => (
          <button key={i} onClick={() => onToggle(area, i)} className="rc-checklist-item">
            {marks[i] ? (
              <CheckCircle2 size={21} color="var(--ok-border)" style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={21} color="var(--text-faint)" style={{ flexShrink: 0 }} />
            )}
            <span className={marks[i] ? "rc-item-done" : ""}>{item}</span>
          </button>
        ))}
      </div>

      {sent ? (
        <>
          <div className="rc-sent-banner">
            <CheckCircle2 size={16} color="var(--ok-text)" />
            <span>{meta.label} sent to management. Thanks {staffName}!</span>
          </div>
          <button onClick={onBackToAreas} className="rc-submit-btn rc-submit-active" style={{ marginTop: 12 }}>
            Back to both areas
          </button>
        </>
      ) : (
        <>
          {failed && (
            <div className="rc-urgent-note">
              Couldn't send automatically. Tap below to send it from your own mail app.
              <button
                onClick={submitManually}
                className="rc-submit-btn rc-submit-active"
                style={{ marginTop: 10 }}
              >
                Send from my mail app
              </button>
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className={`rc-submit-btn ${canSubmit && !busy ? "rc-submit-active" : ""}`}
          >
            <Send size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            {busy ? "Sending…" : `Submit ${meta.label} (${doneCount}/${list.length})`}
          </button>
        </>
      )}

      <div className="rc-chat-disclaimer" style={{ marginTop: 12 }}>
        You can submit whatever you've finished — no need to tick everything.
      </div>
    </div>
  );
}