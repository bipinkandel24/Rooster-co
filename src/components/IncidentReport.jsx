import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Send, ChevronLeft } from "lucide-react";

const TYPES = [
  { id: "injury", label: "Injury or illness", hint: "Someone was hurt or became unwell" },
  { id: "nearmiss", label: "Near miss", hint: "Nobody hurt, but could have been" },
  { id: "hazard", label: "Hazard", hint: "Something unsafe that needs fixing" },
  { id: "equipment", label: "Equipment fault", hint: "Something broken or not working safely" },
  { id: "other", label: "Other", hint: "Anything else worth reporting" },
];

const AREAS = [
  "Kitchen — charcoal / grill",
  "Kitchen — prep bench",
  "Kitchen — fryer",
  "Coolroom / freezer",
  "Front of house",
  "Storage / dry goods",
  "Outside / delivery area",
  "Other",
];

// Where incident reports get texted. Use full international format.
const REPORT_PHONE = "+61400000000";

export default function IncidentReport({ onBack }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    type: "",
    name: "",
    area: "",
    when: "",
    what: "",
    injured: "",
    firstAid: "",
    action: "",
  });
  const [sent, setSent] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isInjury = form.type === "injury";
  const canSubmit = form.type && form.name.trim() && form.area && form.what.trim();

  const send = () => {
    const now = new Date();
    const stamp = now.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    const typeLabel = TYPES.find((t) => t.id === form.type)?.label || form.type;

    const text = [
      `${isInjury ? "⚠️ INJURY" : "⚠️ " + typeLabel.toUpperCase()} — Rooster & Co`,
      `${stamp} · ${form.area}`,
      `By: ${form.name.trim()}`,
      form.when.trim() ? `When: ${form.when.trim()}` : "",
      ``,
      form.what.trim(),
      isInjury && form.injured.trim() ? `\nInjured: ${form.injured.trim()}` : "",
      isInjury && form.firstAid.trim() ? `First aid: ${form.firstAid.trim()}` : "",
      form.action.trim() ? `\nAction taken: ${form.action.trim()}` : "",
    ]
      .filter((l) => l !== "")
      .join("\n");

    const num = REPORT_PHONE.replace(/\s/g, "");
    const sep = /iPhone|iPad|Mac/.test(navigator.userAgent) ? "&" : "?";
    window.location.href = `sms:${num}${sep}body=${encodeURIComponent(text)}`;
    setSent(true);
  };

  // ---------- Confirmation ----------
  if (sent) {
    return (
      <div className="rc-scroll-area">
        <div className="rc-namegate">
          <div className="rc-gate-icon" style={{ background: "#4A5D3A33" }}>
            <CheckCircle2 size={24} color="#A8C48A" />
          </div>
          <div className="rc-namegate-title">Report ready to send</div>
          <div className="rc-namegate-sub" style={{ maxWidth: 300 }}>
            Press send in your Messages app to submit it. If this is urgent, tell your
            supervisor now — don't wait for the message.
          </div>
          <button onClick={onBack} className="rc-submit-btn rc-submit-active">
            Done
          </button>
        </div>
      </div>
    );
  }

  // ---------- Step 1: type ----------
  if (step === 1) {
    return (
      <div className="rc-scroll-area">
        <button onClick={onBack} className="rc-back-btn">← Back</button>

        <div className="rc-detail-heading">
          <div className="rc-module-icon" style={{ background: "#C0392B22" }}>
            <AlertTriangle size={19} color="#C0392B" />
          </div>
          <h2 className="rc-detail-title">Report an Incident</h2>
        </div>

        <div className="rc-urgent-note">
          If someone is seriously hurt, call <strong>000</strong> first and tell your
          supervisor. Fill this in afterwards.
        </div>

        <div className="rc-checklist-heading">What are you reporting?</div>
        <div className="rc-stock-list">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                set("type", t.id);
                setStep(2);
              }}
              className={`rc-supplier-row ${form.type === t.id ? "rc-stock-active" : ""}`}
            >
              <div className="rc-stock-info">
                <div className="rc-stock-label">{t.label}</div>
                <div className="rc-stock-unit">{t.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Step 2: details ----------
  return (
    <div className="rc-scroll-area">
      <button onClick={() => setStep(1)} className="rc-back-btn">
        <ChevronLeft size={14} style={{ verticalAlign: "-2px" }} /> Change type
      </button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "#C0392B22" }}>
          <AlertTriangle size={19} color="#C0392B" />
        </div>
        <div>
          <h2 className="rc-detail-title">
            {TYPES.find((t) => t.id === form.type)?.label}
          </h2>
          <div className="rc-stock-unit">Fill in what you know</div>
        </div>
      </div>

      <div className="rc-field">
        <label className="rc-field-label">Your name *</label>
        <input
          className="rc-field-input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Who is reporting this?"
        />
      </div>

      <div className="rc-field">
        <label className="rc-field-label">Where did it happen? *</label>
        <select className="rc-field-input" value={form.area} onChange={(e) => set("area", e.target.value)}>
          <option value="">Select an area…</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="rc-field">
        <label className="rc-field-label">When did it happen?</label>
        <input
          className="rc-field-input"
          value={form.when}
          onChange={(e) => set("when", e.target.value)}
          placeholder="e.g. today around 6pm, during dinner rush"
        />
      </div>

      <div className="rc-field">
        <label className="rc-field-label">What happened? *</label>
        <textarea
          className="rc-field-input"
          rows={4}
          value={form.what}
          onChange={(e) => set("what", e.target.value)}
          placeholder="Describe it in your own words. What were you doing, what went wrong?"
        />
      </div>

      {isInjury && (
        <>
          <div className="rc-field">
            <label className="rc-field-label">Who was injured, and how?</label>
            <textarea
              className="rc-field-input"
              rows={3}
              value={form.injured}
              onChange={(e) => set("injured", e.target.value)}
              placeholder="Name, and what part of the body / what kind of injury"
            />
          </div>

          <div className="rc-field">
            <label className="rc-field-label">First aid given?</label>
            <textarea
              className="rc-field-input"
              rows={2}
              value={form.firstAid}
              onChange={(e) => set("firstAid", e.target.value)}
              placeholder="What was done, by whom. Did they see a doctor?"
            />
          </div>
        </>
      )}

      <div className="rc-field">
        <label className="rc-field-label">Anything done about it so far?</label>
        <textarea
          className="rc-field-input"
          rows={2}
          value={form.action}
          onChange={(e) => set("action", e.target.value)}
          placeholder="e.g. area cleaned, equipment turned off, sign put up"
        />
      </div>

      <button
        onClick={send}
        disabled={!canSubmit}
        className={`rc-submit-btn ${canSubmit ? "rc-submit-active" : ""}`}
      >
        <Send size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Send report
      </button>

      <div className="rc-chat-disclaimer" style={{ marginTop: 12, marginBottom: 8 }}>
        This opens a text message to management. Tell your supervisor directly as well.
      </div>
    </div>
  );
}