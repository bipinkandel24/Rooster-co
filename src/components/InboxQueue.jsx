import React, { useState, useEffect } from "react";
import {
  Inbox, Loader2, RefreshCw, ChevronRight, AlertTriangle, SkipForward, FileText,
} from "lucide-react";
import { pdfToImages } from "../utils/pdfPages";

export default function InboxQueue({ onProcess, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [err, setErr] = useState("");
  const [workingKey, setWorkingKey] = useState(null);

  const fetchInbox = async () => {
    setState("loading");
    setErr("");
    try {
      const r = await fetch("/api/inbox", { credentials: "same-origin" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.detail || d.error || "Couldn't read the mailbox");

      // Expand each PDF into one entry per page
      const expanded = [];
      for (const it of d.items || []) {
        if (it.kind === "pdf") {
          try {
            const pages = await pdfToImages(it.data);
            pages.forEach((dataUrl, p) => {
              expanded.push({
                ...it,
                data: null,
                dataUrl,
                page: p + 1,
                pageCount: pages.length,
                key: `${it.uid}-${it.index}-${p}`,
              });
            });
          } catch {
            expanded.push({
              ...it,
              data: null,
              dataUrl: null,
              broken: true,
              key: `${it.uid}-${it.index}`,
            });
          }
        } else {
          expanded.push({
            ...it,
            dataUrl: `data:${it.mediaType};base64,${it.data}`,
            data: null,
            key: `${it.uid}-${it.index}`,
          });
        }
      }

      setItems(expanded);
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

  // Only mark the email read once every page and attachment from it is done
  const finishItem = (item) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.key !== item.key);
      if (!next.some((x) => x.uid === item.uid)) markRead(item.uid);
      return next;
    });
  };

  const openItem = async (item) => {
    if (!item.dataUrl) return;
    setWorkingKey(item.key);
    await onProcess(item.dataUrl, {
      onSaved: () => finishItem(item),
      label: item.filename,
    });
    setWorkingKey(null);
  };

  const fmtWhen = (iso) => {
    const d = new Date(iso);
    const today = new Date();
    const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + `, ${time}`;
  };

  const emailCount = new Set(items.map((i) => i.uid)).size;

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
              ? items.length
                ? `${items.length} waiting across ${emailCount} email${emailCount === 1 ? "" : "s"}`
                : "Nothing waiting"
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
        <div className="rc-urgent-note" style={{ wordBreak: "break-word" }}>{err}</div>
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
            {items.map((item) => (
              <div key={item.key} className="rc-stock-row">
                {item.dataUrl ? (
                  <img src={item.dataUrl} alt="" className="rc-inbox-thumb" />
                ) : (
                  <div className="rc-inbox-thumb rc-inbox-broken">
                    <FileText size={18} color="var(--text-faint)" />
                  </div>
                )}

                <div className="rc-stock-info">
                  <div className="rc-stock-label">{item.filename}</div>
                  <div className="rc-stock-unit">
                    {item.broken
                      ? "Couldn't read this PDF"
                      : `${fmtWhen(item.receivedAt)}${
                          item.pageCount > 1 ? ` · page ${item.page} of ${item.pageCount}` : ""
                        }${item.total > 1 ? ` · file ${item.index + 1} of ${item.total}` : ""}`}
                  </div>
                </div>

                <button
                  onClick={() => finishItem(item)}
                  disabled={workingKey !== null}
                  className="rc-icon-btn"
                  aria-label="Skip"
                  title="Skip — remove without saving"
                >
                  <SkipForward size={15} />
                </button>

                <button
                  onClick={() => openItem(item)}
                  disabled={workingKey !== null || !item.dataUrl}
                  className="rc-icon-btn rc-icon-mail"
                  aria-label="Read this invoice"
                >
                  {workingKey === item.key ? (
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