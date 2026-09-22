import React, { useState, useEffect, useRef } from "react";
import {
  Inbox, Loader2, RefreshCw, AlertTriangle, SkipForward, RotateCcw, CheckCircle2,
} from "lucide-react";
import { pdfToImages } from "../utils/pdfPages";
import { makeThumbBase64 } from "../utils/scanFilter";
import { toDraft, persistDraft } from "../data/invoiceDraft";
import InvoiceReviewForm from "./InvoiceReviewForm";

const GAP_MS = 4000;          // pause between AI calls — keeps the free tier happy
const RATE_WAIT_MS = 15000;   // back-off when rate-limited
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Read one image with the AI, retrying politely if rate-limited
async function readOne(dataUrl) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const forAI = await makeThumbBase64(dataUrl);
      const r = await fetch("/api/scan-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: forAI, mediaType: "image/jpeg" }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) return { ok: true, draft: toDraft(d.data, dataUrl) };

      const msg = `${d.detail || ""} ${d.error || ""} ${r.status}`;
      if (/429|RESOURCE_EXHAUSTED|quota|rate/i.test(msg)) {
        await sleep(RATE_WAIT_MS * (attempt + 1));
        continue;
      }
      return { ok: false, error: d.detail || d.error || "Couldn't read this one" };
    } catch (e) {
      if (attempt === 2) return { ok: false, error: e.message };
      await sleep(GAP_MS);
    }
  }
  return { ok: false, error: "Still rate-limited — try this one again shortly" };
}

export default function InboxQueue({ onBack, onSaved }) {
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const itemsRef = useRef([]);
  const runRef = useRef(0);

  // Single source of truth — ref updates synchronously, state drives the UI
  const commit = (next) => {
    itemsRef.current = next;
    setItems(next);
  };
  const update = (key, patch) =>
    commit(itemsRef.current.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const markRead = async (uid) => {
    try {
      const r = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) setErr(`Couldn't mark the email as read: ${d.detail || d.error || r.status}`);
    } catch (e) {
      setErr(`Couldn't mark the email as read: ${e.message}`);
    }
  };

  // Mark an item finished; once every file from that email is done, mark it read
  const finish = (key, status) => {
    const next = itemsRef.current.map((i) => (i.key === key ? { ...i, status } : i));
    commit(next);
    const it = next.find((i) => i.key === key);
    if (!it) return;
    const siblings = next.filter((i) => i.uid === it.uid);
    if (siblings.every((i) => i.status === "saved" || i.status === "skipped")) {
      markRead(it.uid);
    }
  };

  // ---- fetch + expand ---------------------------------------------------
  const load = async () => {
    runRef.current++;
    setPhase("loading");
    setErr("");
    commit([]);
    try {
      const r = await fetch("/api/inbox", { credentials: "same-origin" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.detail || d.error || "Couldn't read the mailbox");

      const expanded = [];
      for (const it of d.items || []) {
        const base = {
          uid: it.uid,
          index: it.index,
          total: it.total,
          filename: it.filename,
          receivedAt: it.receivedAt,
          status: "queued",
          draft: null,
          error: "",
        };
        if (it.kind === "pdf") {
          try {
            const pages = await pdfToImages(it.data);
            pages.forEach((dataUrl, p) =>
              expanded.push({
                ...base,
                dataUrl,
                page: p + 1,
                pageCount: pages.length,
                key: `${it.uid}-${it.index}-${p}`,
              })
            );
          } catch {
            expanded.push({
              ...base,
              dataUrl: null,
              status: "failed",
              error: "Couldn't open this PDF",
              key: `${it.uid}-${it.index}`,
            });
          }
        } else {
          expanded.push({
            ...base,
            dataUrl: `data:${it.mediaType};base64,${it.data}`,
            key: `${it.uid}-${it.index}`,
          });
        }
      }

      commit(expanded);
      setPhase("ready");
    } catch (e) {
      setErr(e.message);
      setPhase("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ---- background reader — one at a time, ahead of the reviewer --------
  useEffect(() => {
    if (phase !== "ready") return;
    const myRun = runRef.current;
    let cancelled = false;

    (async () => {
      while (!cancelled && runRef.current === myRun) {
        const next = itemsRef.current.find((i) => i.status === "queued");
        if (!next) break;

        update(next.key, { status: "reading" });
        const result = await readOne(next.dataUrl);
        if (cancelled || runRef.current !== myRun) break;

        update(
          next.key,
          result.ok
            ? { status: "ready", draft: result.draft, error: "" }
            : { status: "failed", error: result.error }
        );

        if (itemsRef.current.some((i) => i.status === "queued")) await sleep(GAP_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase]);

  const retry = (key) => {
    update(key, { status: "queued", error: "" });
    // Restart the reader if it had already finished
    setPhase("loading");
    setTimeout(() => setPhase("ready"), 0);
  };

  // ---- derived ---------------------------------------------------------
  const current = items.find((i) => i.status === "ready");
  const readyCount = items.filter((i) => i.status === "ready").length;
  const doneCount = items.filter((i) => i.status === "saved" || i.status === "skipped").length;
  const savedCount = items.filter((i) => i.status === "saved").length;
  const pending = items.filter((i) => i.status === "queued" || i.status === "reading");
  const failed = items.filter((i) => i.status === "failed");
  const position = doneCount + 1;

  const label = (i) =>
    [
      i.filename,
      i.pageCount > 1 ? `page ${i.page}/${i.pageCount}` : null,
    ].filter(Boolean).join(" · ");

  // ---- review screen ---------------------------------------------------
  if (current) {
    const save = async () => {
      setSaving(true);
      const entry = await persistDraft(current.draft);
      setSaving(false);
      if (entry) {
        onSaved?.(entry);
        finish(current.key, "saved");
      } else {
        setErr("Couldn't save — device storage may be full.");
      }
    };

    return (
      <InvoiceReviewForm
        draft={current.draft}
        onField={(k, v) => update(current.key, { draft: { ...current.draft, [k]: v } })}
        onSave={save}
        saving={saving}
        onCancel={onBack}
        cancelLabel="← Stop and go back"
        saveLabel={items.length - doneCount > 1 ? "Save and next" : "Save"}
        top={
          <>
            <div className="rc-inbox-progress">
              <span>
                Invoice {position} of {items.length}
              </span>
              <span className="rc-inbox-ahead">
                {pending.length > 0 ? (
                  <>
                    <Loader2 size={12} className="rc-spin" /> {readyCount - 1} ready ·{" "}
                    {pending.length} reading
                  </>
                ) : (
                  `${readyCount - 1} more ready`
                )}
              </span>
            </div>
            <div className="rc-progress-bar">
              <div
                className="rc-progress-fill"
                style={{ width: `${(doneCount / items.length) * 100}%` }}
              />
            </div>
            <div className="rc-stock-unit" style={{ marginBottom: 12 }}>{label(current)}</div>
            {err && <div className="rc-urgent-note">{err}</div>}
          </>
        }
        extraActions={
          <button onClick={() => finish(current.key, "skipped")} className="rc-history-clear">
            <SkipForward size={13} /> Skip — not an invoice
          </button>
        }
      />
    );
  }

  // ---- everything else -------------------------------------------------
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
            {phase === "loading"
              ? "Checking the mailbox…"
              : items.length
              ? `${doneCount} of ${items.length} done`
              : "Nothing waiting"}
          </div>
        </div>
      </div>

      {err && <div className="rc-urgent-note" style={{ wordBreak: "break-word" }}>{err}</div>}

      {phase === "loading" && (
        <div className="rc-namegate" style={{ minHeight: 180 }}>
          <Loader2 size={24} className="rc-spin" color="var(--gold)" />
          <div className="rc-namegate-sub" style={{ marginTop: 12 }}>
            Fetching attachments…
          </div>
        </div>
      )}

      {/* Waiting for the first (or next) one to be read */}
      {phase === "ready" && pending.length > 0 && (
        <div className="rc-namegate" style={{ minHeight: 180 }}>
          <Loader2 size={24} className="rc-spin" color="var(--gold)" />
          <div className="rc-namegate-title" style={{ marginTop: 12 }}>
            Reading invoice {doneCount + failed.length + 1} of {items.length}
          </div>
          <div className="rc-namegate-sub">It'll open here as soon as it's ready.</div>
        </div>
      )}

      {/* Anything the AI couldn't read */}
      {phase === "ready" && failed.length > 0 && (
        <>
          <div className="rc-checklist-heading" style={{ marginTop: 10 }}>
            Couldn't read
            <span className="rc-checklist-count">{failed.length}</span>
          </div>
          <div className="rc-stock-list">
            {failed.map((i) => (
              <div key={i.key} className="rc-stock-row rc-temp-bad">
                {i.dataUrl && <img src={i.dataUrl} alt="" className="rc-inbox-thumb" />}
                <div className="rc-stock-info">
                  <div className="rc-stock-label">{label(i)}</div>
                  <div className="rc-stock-unit" style={{ wordBreak: "break-word" }}>{i.error}</div>
                </div>
                {i.dataUrl && (
                  <button onClick={() => retry(i.key)} className="rc-icon-btn" aria-label="Retry">
                    <RotateCcw size={15} />
                  </button>
                )}
                <button onClick={() => finish(i.key, "skipped")} className="rc-icon-btn" aria-label="Skip">
                  <SkipForward size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* All finished */}
      {phase === "ready" && items.length > 0 && pending.length === 0 && failed.length === 0 && (
        <div className="rc-namegate" style={{ minHeight: 180 }}>
          <CheckCircle2 size={28} color="var(--ok-border)" />
          <div className="rc-namegate-title" style={{ marginTop: 12 }}>All done</div>
          <div className="rc-namegate-sub">
            {savedCount} saved{doneCount - savedCount ? `, ${doneCount - savedCount} skipped` : ""}.
          </div>
        </div>
      )}

      {phase === "ready" && items.length === 0 && (
        <div className="rc-namegate" style={{ minHeight: 180 }}>
          <div className="rc-namegate-sub" style={{ maxWidth: 300 }}>
            Nothing new. Emails are marked as read once handled and won't appear again.
          </div>
        </div>
      )}

      {phase !== "loading" && pending.length === 0 && (
        <button onClick={load} className="rc-scan-btn" style={{ marginTop: 16 }}>
          <RefreshCw size={18} />
          <span>Check for new invoices</span>
        </button>
      )}

      {phase === "ready" && pending.length > 0 && (
        <div className="rc-due-banner" style={{ marginTop: 14 }}>
          <AlertTriangle size={15} color="var(--gold)" />
          <span>Keep this screen open while it reads — leaving stops the queue.</span>
        </div>
      )}
    </div>
  );
}