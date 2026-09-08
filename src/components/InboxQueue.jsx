import React, { useState, useEffect } from "react";
import {
  Inbox, Loader2, RefreshCw, ChevronRight, X, AlertTriangle, CheckCircle2, SkipForward,
} from "lucide-react";

export default function InboxQueue({ onProcess, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [err, setErr] = useState("");
  const [workingIdx, setWorkingIdx] = useState(null);

  const fetchInbox = async () => {
    setState("loading");
    setErr("");
    try {
      const r = await fetch("/api/inbox", { credentials: "same-origin" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.detail || d.error || "Couldn't read the mailbox");
      setItems(d.items || []);
      setState("ready");
    } catch (e) {
      setErr(e.message);
      setState("error");
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const markRead = async (uid) => {
    try {
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
    } catch {
      /* not fatal — it'll just show again next time */
    }
  };

  const openItem = async (item, idx) => {
    setWorkingIdx(idx);
    const dataUrl = `data:${item.mediaType};base64,${item.data}`;
    // Hand it to the scanner's normal read + review flow
    await onProcess(dataUrl, {
      onSaved: () => markRead(item.uid),
      label: item.filename,
    });
    setWorkingIdx(null);
  };

  const skip = async (item) => {
    await markRead(item.uid);
    setItems((p) => p.filter((x) => !(x.uid === item.uid && x.index === item.index)));
  };

  const fmtWhen = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + `, ${time}`;
  };

  const kb = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <Inbox size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Scanned by email</h2>
          <div className="rc-stock-unit">
            {state === "ready"
              ? `${items.length} waiting`
              : state === "loading"
              ? "Checking the mailbox…"
              : "Invoices sent from the office scanner"}
          </div>
        </div>
      </div>

      <button onClick={fetchInbox} disabled={state === "loading"} className="rc-scan-btn">
        {state === "loading" ? <Loader2 size={18} className="rc-spin" /> : <RefreshCw size={18} />}
        <span>{state === "loading" ? "Checking…" : "Check for new invoices"}</span>
      </button>

      {state === "error" && (
        <div className="rc-urgent-note" style={{ wordBreak: "break-word" }}>
          {err}
        </div>
      )}

      {state === "ready" && items.length === 0 && (
        <div className="rc-namegate" style={{ minHeight: 180 }}>
          <div className="rc-namegate-sub" style={{ maxWidth: 300 }}>
            Nothing new. Anything already reviewed is marked as read and won't
            appear again.
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="rc-due-banner">
            <AlertTriangle size={15} color="var(--gold)" />
            <span>Open each one to read it and check the numbers before saving.</span>
          </div>

          <div className="rc-stock-list">
            {items.map((item, idx) => (
              <div key={`${item.uid}-${item.index}`} className="rc-stock-row">
                <img
                  src={`data:${item.mediaType};base64,${item.data}`}
                  alt=""
                  className="rc-inbox-thumb"
                />
                <div className="rc-stock-info">
                  <div className="rc-stock-label">{item.filename}</div>
                  <div className="rc-stock-unit">
                    {fmtWhen(item.receivedAt)} · {kb(item.size)}
                  </div>
                </div>
                <button
                  onClick={() => skip(item)}
                  className="rc-icon-btn"
                  aria-label="Skip"
                  title="Skip — mark as read without saving"
                >
                  <SkipForward size={15} />
                </button>
                <button
                  onClick={() => openItem(item, idx)}
                  disabled={workingIdx !== null}
                  className="rc-icon-btn rc-icon-mail"
                  aria-label="Read this invoice"
                >
                  {workingIdx === idx ? (
                    <Loader2 size={16} className="rc-spin" />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}