import React, { useState } from "react";
import { Sparkles } from "lucide-react";

export default function NameGate({ onContinue }) {
  const [name, setName] = useState("");
  return (
    <div className="rc-namegate">
      <Sparkles size={28} color="#E3A94A" style={{ marginBottom: 12 }} />
      <p className="rc-namegate-title">Who's doing the clean tonight?</p>
      <p className="rc-namegate-sub">Enter your name before starting the checklist.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="rc-name-input"
      />
      <button
        onClick={() => name.trim() && onContinue(name.trim())}
        disabled={!name.trim()}
        className={`rc-submit-btn ${name.trim() ? "rc-submit-active" : ""}`}
      >
        Start cleaning checklist
      </button>
    </div>
  );
}
