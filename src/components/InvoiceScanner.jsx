import React, { useState, useRef } from "react";
import {
  Camera, Loader2, CheckCircle2, AlertTriangle, Trash2, Download,
  ChevronRight, FileText, X, Receipt,
} from "lucide-react";
import {
  loadInvoices, saveInvoice, deleteInvoice, groupByWeek, weekLabel, money,
} from "../data/invoices";

// Shrink a phone photo so it fits inside the serverless payload limit
async function compress(file, maxDim = 1600, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1];
}

const emptyDraft = {
  supplier: "", abn: "", invoiceNumber: "", invoiceDate: "",
  subtotal: "", gst: "", total: "", lineItems: [], confidence: "", notes: "",
};

export default function InvoiceScanner({ onBack }) {
  const [invoices, setInvoices] = useState(() => loadInvoices());
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openWeek, setOpenWeek] = useState(null);
  const fileRef = useRef(null);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const d = await r.json();
    if (!d.ok) throw new Error(d.detail || d.error || "Scan failed");

    setBusy(true);
    setErr("");
    try {
      const image = await compress(file);
      const r = await fetch("/api/scan-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType: "image/jpeg" }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Scan failed");

      setDraft({
        ...emptyDraft,
        ...d.data,
        abn: d.data.abn ?? "",
        invoiceNumber: d.data.invoiceNumber ?? "",
        invoiceDate: d.data.invoiceDate ?? "",
        subtotal: d.data.subtotal ?? "",
        gst: d.data.gst ?? "",
        total: d.data.total ?? "",
        lineItems: d.data.lineItems || [],
      });
    } catch (e) {
      setErr(e.message || "Couldn't read that invoice. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    const entry = saveInvoice({
      ...draft,
      subtotal: draft.subtotal === "" ? null : Number(draft.subtotal),
      gst: draft.gst === "" ? null : Number(draft.gst),
      total: draft.total === "" ? null : Number(draft.total),
    });
    if (entry) setInvoices((p) => [entry, ...p]);
    setDraft(null);
  };

  const remove = (id) => setInvoices(deleteInvoice(id));

  const exportWeek = async (weekKey, rows) => {
    const XLSX = await import("xlsx");

    const summary = rows.map((i) => ({
      Date: i.invoiceDate || "",
      Supplier: i.supplier || "",
      "Invoice No": i.invoiceNumber || "",
      ABN: i.abn || "",
      Subtotal: i.subtotal ?? "",
      GST: i.gst ?? "",
      Total: i.total ?? "",
    }));
    summary.push({
      Date: "", Supplier: "TOTAL", "Invoice No": "", ABN: "",
      Subtotal: rows.reduce((s, i) => s + (i.subtotal || 0), 0),
      GST: rows.reduce((s, i) => s + (i.gst || 0), 0),
      Total: rows.reduce((s, i) => s + (i.total || 0), 0),
    });

    const items = rows.flatMap((i) =>
      (i.lineItems || []).map((li) => ({
        Date: i.invoiceDate || "",
        Supplier: i.supplier || "",
        "Invoice No": i.invoiceNumber || "",
        Description: li.description || "",
        Qty: li.qty ?? "",
        "Unit Price": li.unitPrice ?? "",
        Amount: li.amount ?? "",
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Invoices");
    if (items.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Line Items");
    }
    XLSX.writeFile(wb, `rooster-invoices-week-${weekKey}.xlsx`);
  };

  // ---------- Review screen ----------
  if (draft) {
    const lowConf = draft.confidence === "low";
    return (
      <div className="rc-scroll-area">
        <button onClick={() => setDraft(null)} className="rc-back-btn">← Cancel</button>

        <div className="rc-detail-heading">
          <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
            <FileText size={19} color="var(--gold)" />
          </div>
          <div>
            <h2 className="rc-detail-title">Check the details</h2>
            <div className="rc-stock-unit">Fix anything that's wrong before saving</div>
          </div>
        </div>

        {lowConf && (
          <div className="rc-urgent-note">
            The photo was hard to read — double-check every number against the paper invoice.
          </div>
        )}
        {draft.notes && (
          <div className="rc-due-banner">
            <AlertTriangle size={15} color="var(--gold)" />
            <span>{draft.notes}</span>
          </div>
        )}

        <div className="rc-field">
          <label className="rc-field-label">Supplier</label>
          <input className="rc-field-input" value={draft.supplier}
            onChange={(e) => set("supplier", e.target.value)} />
        </div>

        <div className="rc-field-row">
          <div className="rc-field">
            <label className="rc-field-label">Invoice no.</label>
            <input className="rc-field-input" value={draft.invoiceNumber}
              onChange={(e) => set("invoiceNumber", e.target.value)} />
          </div>
          <div className="rc-field">
            <label className="rc-field-label">Date</label>
            <input className="rc-field-input" type="date" value={draft.invoiceDate}
              onChange={(e) => set("invoiceDate", e.target.value)} />
          </div>
        </div>

        <div className="rc-field-row">
          <div className="rc-field">
            <label className="rc-field-label">Subtotal</label>
            <input className="rc-field-input" type="number" step="0.01" value={draft.subtotal}
              onChange={(e) => set("subtotal", e.target.value)} />
          </div>
          <div className="rc-field">
            <label className="rc-field-label">GST</label>
            <input className="rc-field-input" type="number" step="0.01" value={draft.gst}
              onChange={(e) => set("gst", e.target.value)} />
          </div>
          <div className="rc-field">
            <label className="rc-field-label">Total</label>
            <input className="rc-field-input" type="number" step="0.01" value={draft.total}
              onChange={(e) => set("total", e.target.value)} />
          </div>
        </div>

        {draft.lineItems.length > 0 && (
          <>
            <div className="rc-checklist-heading" style={{ marginTop: 8 }}>
              Line items
              <span className="rc-checklist-count">{draft.lineItems.length}</span>
            </div>
            <div className="rc-stock-list">
              {draft.lineItems.map((li, i) => (
                <div key={i} className="rc-stock-row">
                  <div className="rc-stock-info">
                    <div className="rc-stock-label">{li.description}</div>
                    <div className="rc-stock-unit">
                      {li.qty ? `${li.qty} × ` : ""}{money(li.unitPrice)}
                    </div>
                  </div>
                  <div className="rc-qty-value">{money(li.amount)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={confirm} className="rc-submit-btn rc-submit-active">
          <CheckCircle2 size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Save invoice
        </button>
      </div>
    );
  }

  // ---------- Main list ----------
  const weeks = groupByWeek(invoices);

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <Receipt size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Invoices</h2>
          <div className="rc-stock-unit">{invoices.length} saved</div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={pick}
        style={{ display: "none" }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="rc-scan-btn"
      >
        {busy ? <Loader2 size={20} className="rc-spin" /> : <Camera size={20} />}
        <span>{busy ? "Reading invoice…" : "Scan an invoice"}</span>
      </button>

      {err && (
        <div className="rc-urgent-note" style={{ marginTop: 14 }}>
          {err}
        </div>
      )}

      {weeks.map(([key, rows]) => {
        const total = rows.reduce((s, i) => s + (i.total || 0), 0);
        const open = openWeek === key;
        return (
          <div key={key} className="rc-week-block">
            <button
              onClick={() => setOpenWeek(open ? null : key)}
              className="rc-week-head"
            >
              <div className="rc-stock-info">
                <div className="rc-stock-label">{weekLabel(key)}</div>
                <div className="rc-stock-unit">
                  {rows.length} invoice{rows.length === 1 ? "" : "s"} · {money(total)}
                </div>
              </div>
              <ChevronRight
                size={17}
                color="var(--text-3)"
                style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}
              />
            </button>

            {open && (
              <>
                <div className="rc-stock-list" style={{ marginTop: 8 }}>
                  {rows.map((i) => (
                    <div key={i.id} className="rc-stock-row">
                      <div className="rc-stock-info">
                        <div className="rc-stock-label">{i.supplier || "Unknown supplier"}</div>
                        <div className="rc-stock-unit">
                          {i.invoiceDate || "no date"}
                          {i.invoiceNumber ? ` · #${i.invoiceNumber}` : ""}
                          {i.gst ? ` · GST ${money(i.gst)}` : ""}
                        </div>
                      </div>
                      <div className="rc-qty-value">{money(i.total)}</div>
                      <button onClick={() => remove(i.id)} className="rc-check-btn" aria-label="Delete">
                        <X size={16} color="var(--text-faint)" />
                      </button>
                    </div>
                  ))}
                </div>

                <button onClick={() => exportWeek(key, rows)} className="rc-export-btn">
                  <Download size={15} />
                  <span>Export this week to Excel</span>
                </button>
              </>
            )}
          </div>
        );
      })}

      {invoices.length === 0 && !busy && (
        <div className="rc-namegate" style={{ minHeight: 200 }}>
          <div className="rc-namegate-sub">
            No invoices yet. Photograph one to get started.
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <button
          onClick={() => {
            if (confirm("Delete all saved invoices? Export first if you need them.")) {
              clearInvoices();
              setInvoices([]);
            }
          }}
          className="rc-history-clear"
        >
          <Trash2 size={13} /> Clear all invoices
        </button>
      )}
    </div>
  );
}