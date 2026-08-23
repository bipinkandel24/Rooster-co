import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

const SUGGESTIONS = [
  "What temp should chicken be cooked to?",
  "How do I avoid gluten cross-contamination?",
  "How long can cooked food sit out?",
];

// Proactive prompts shown beside the bubble before the chat is opened
const TEASERS = [
  "Hi! Ask me anything about food safety, prep or cleaning.",
  "Not sure how to do something? I can walk you through it.",
];

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [teasers, setTeasers] = useState([]);
  const [everOpened, setEverOpened] = useState(false);
  const endRef = useRef(null);

  // Reveal the teasers a moment after load so they animate in
  useEffect(() => {
    const t = setTimeout(() => setTeasers(TEASERS.map((_, i) => i)), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, busy]);

  const dismissTeaser = (i) => setTeasers((p) => p.filter((x) => x !== i));

  const openChat = () => {
    setOpen(true);
    setEverOpened(true);
    setTeasers([]);
  };

  const ask = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;

    const next = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: d.text || "Sorry, I couldn't answer that. Try asking your supervisor.",
        },
      ]);
    } catch {
      setMsgs([
        ...next,
        { role: "assistant", content: "I'm offline right now. Check your connection and try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Collapsed: bubble + teasers ----------
  if (!open) {
    return (
      <div className="rc-chat-dock">
        {teasers.map((i) => (
          <div key={i} className="rc-teaser">
            <MessageCircle size={17} className="rc-teaser-icon" />
            <button className="rc-teaser-text" onClick={openChat}>
              {TEASERS[i]}
            </button>
            <button className="rc-teaser-x" onClick={() => dismissTeaser(i)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        ))}

        <button onClick={openChat} className="rc-chat-bubble" aria-label="Ask the kitchen assistant">
          <MessageCircle size={22} />
          {!everOpened && teasers.length > 0 && (
            <span className="rc-chat-badge">{teasers.length}</span>
          )}
        </button>
      </div>
    );
  }

  // ---------- Expanded: full chat ----------
  return (
    <div className="rc-chat-panel">
      <div className="rc-chat-header">
        <div>
          <div className="rc-chat-title">Kitchen Assistant</div>
          <div className="rc-chat-sub">Ask about food safety, prep or cleaning</div>
        </div>
        <button onClick={() => setOpen(false)} className="rc-close-btn" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="rc-chat-body">
        {msgs.length === 0 && (
          <div className="rc-chat-empty">
            <div className="rc-chat-empty-title">How can I help?</div>
            <div className="rc-chat-empty-sub">Ask about food safety, prep or cleaning</div>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rc-chat-chip">
                {s}
              </button>
            ))}
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "rc-msg rc-msg-user" : "rc-msg rc-msg-bot"}>
            <div className="rc-msg-label">{m.role === "user" ? "You" : "Assistant"}</div>
            <div className="rc-msg-text">{m.content}</div>
          </div>
        ))}

        {busy && (
          <div className="rc-msg-loading">
            <Loader2 size={15} className="rc-spin" />
            <span>Thinking…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="rc-chat-input-row">
        <div className="rc-chat-composer">
          <textarea
            className="rc-chat-input"
            placeholder="Ask a question…"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            disabled={busy}
          />
          <button onClick={() => ask()} disabled={busy || !input.trim()} className="rc-chat-send" aria-label="Send">
            <Send size={15} />
          </button>
        </div>
        <div className="rc-chat-disclaimer">Double-check anything critical with your supervisor.</div>
      </div>
    </div>
  );
}