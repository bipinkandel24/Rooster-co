import React, { useState, useRef } from "react";
import {
  Camera, Loader2, CheckCircle2, AlertTriangle, Trash2, Download,
  ChevronRight, FileText, X, Receipt, Mail, Eye, Send, Image as ImageIcon,
} from "lucide-react";
import {
  loadInvoices, saveInvoice, deleteInvoice, clearInvoices,
  groupByWeek, weekLabel, money,
} from "../data/invoices";
import { makeThumbBase64 } from "../utils/scanFilter";
import { fileToCanvas } from "../utils/perspective";
import { putScan, getScan, deleteScan, clearScans } from "../data/imageStore";
import CropView from "./CropView";

const emptyDraft = {
  supplier: "", abn: "", invoiceNumber: "", invoiceDate: "",
  subtotal: "", gst: "", total: "", lineItems: [], confidence: "", notes: "",
};

export default function InvoiceScanner({ onBack }) {
  const [invoices, setInvoices] = useState(() => loadInvoices());
  const [draft, setDraft] = useState(null);
  const [cropping, setCropping] = useState(null); // source canvas
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openWeek, setOpenWeek] = useState(null);
  const [viewing, setViewing] = useState(null);   // { id, dataUrl, inv }
  const [sendingId, setSendingId] = useState(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);
  const camRef = useRef(null);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  // Step 1 — load the photo and hand it to the cropper
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    try {
      const c = await fileToCanvas(file);
      setCropping(c);
    } catch {
      setErr("Couldn't open that photo.");
    }
  };

  // Step 2 — cropped + enhanced image comes back, send it to be read
  const afterCrop = async (dataUrl) => {
    setCropping(null);
    setBusy(true);
    setErr("");
    try {
      const forAI = await makeThumbBase64(dataUrl);

      const r = await fetch("/api/scan-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: forAI, mediaType: "image/jpeg" }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.detail || d.error || "Scan failed");

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
        _scanDataUrl: dataUrl,
      });
    } catch (e) {
      setErr(e.message || "Couldn't read that invoice. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    const { _scanDataUrl, ...fields } = draft;
    const entry = saveInvoice({
      ...fields,
      subtotal: draft.subtotal === "" ? null : Number(draft.subtotal),
      gst: draft.gst === "" ? null : Number(draft.gst),
      total: draft.total === "" ? null : Number(draft.total),
      hasScan: Boolean(_scanDataUrl),
    });
    if (entry) {
      if (_scanDataUrl) {
        try {
          await putScan(entry.id, { dataUrl: _scanDataUrl });
        } catch {
          /* metadata is still saved even if the image couldn't be stored */
        }
      }
      setInvoices((p) => [entry, ...p]);
    }
    setDraft(null);
  };

  const remove = async (id) => {
    await deleteScan(id).catch(() => {});
    setInvoices(deleteInvoice(id));
  };

  const wipeAll = async () => {
    if (window.confirm("Delete all saved invoices and scans? Export first if you need them.")) {
      await clearScans().catch(() => {});
      clearInvoices();
      setInvoices([]);
    }
  };

  const openScan = async (inv) => {
    try {
      const rec = await getScan(inv.id);
      if (!rec?.dataUrl) {
        setToast("No scan saved for this invoice.");
        setTimeout(() => setToast(""), 4000);
        return;
      }
      setViewing({ id: inv.id, dataUrl: rec.dataUrl, inv });
    } catch {
      setToast("Couldn't open that scan.");
      setTimeout(() => setToast(""), 4000);
    }
  };

  const emailScan = async (inv) => {
    setSendingId(inv.id);
    setToast("");
    try {
      const rec = await getScan(inv.id);
      if (!rec?.dataUrl) throw new Error("No scan saved");

      const r = await fetch("/api/send-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: rec.dataUrl.split(",")[1],
          supplier: inv.supplier,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          total: inv.total,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Send failed");
      setToast(`Sent to ${d.sentTo}`);
    } catch (e) {
      setToast(e.message || "Couldn't send that scan.");
    } finally {
      setSendingId(null);
      setTimeout(() => setToast(""), 4000);
    }
  };

  // Shared export — takes any set of invoices and writes one workbook
  const exportRows = async (rows, filename) => {
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
    XLSX.writeFile(wb, filename);
  };

  const exportWeek = (weekKey, rows) =>
    exportRows(rows, `rooster-invoices-week-${weekKey}.xlsx`);

  const exportAll = () =>
    exportRows(invoices, `rooster-invoices-all-${new Date().toISOString().slice(0, 10)}.xlsx`);

  // ---------- Crop screen ----------
  if (cropping) {
    return (
      <CropView
        canvas={cropping}
        onDone={afterCrop}
        onCancel={() => setCropping(null)}
      />
    );
  }

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

        {draft._scanDataUrl && (
          <img src={draft._scanDataUrl} alt="Scanned invoice" className="rc-scan-preview" />
        )}

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

        <button onClick={saveDraft} className="rc-submit-btn rc-submit-active">
          <CheckCircle2 size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Save invoice
        </button>
      </div>
    );
  }

  // ---------- Main list ----------
  const weeks = groupByWeek(invoices);
  const grandTotal = invoices.reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="rc-scroll-area">
      <button onClick={onBack} className="rc-back-btn">← Back</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <Receipt size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Invoices</h2>
          <div className="rc-stock-unit">
            {invoices.length} saved{invoices.length ? ` · ${money(grandTotal)}` : ""}
          </div>
        </div>
      </div>

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={pick}
        style={{ display: "none" }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={pick}
        style={{ display: "none" }}
      />

      <button
        onClick={() => camRef.current?.click()}
        disabled={busy}
        className="rc-scan-btn"
      >
        {busy ? <Loader2 size={20} className="rc-spin" /> : <Camera size={20} />}
        <span>{busy ? "Reading invoice…" : "Scan an invoice"}</span>
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="rc-history-toggle"
      >
        <ImageIcon size={15} color="var(--text-2)" />
        <span>Choose from photos instead</span>
      </button>

      {err && (
        <div className="rc-urgent-note" style={{ marginTop: 14, wordBreak: "break-word" }}>
          {err}
        </div>
      )}

      {invoices.length > 0 && (
        <button onClick={exportAll} className="rc-export-btn" style={{ marginBottom: 22 }}>
          <Download size={15} />
          <span>
            Export all {invoices.length} invoice{invoices.length === 1 ? "" : "s"} to Excel
          </span>
        </button>
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
                          {i.total != null ? ` · ${money(i.total)}` : ""}
                        </div>
                      </div>

                      {i.hasScan && (
                        <>
                          <button onClick={() => openScan(i)} className="rc-icon-btn" aria-label="View scan">
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => emailScan(i)}
                            disabled={sendingId === i.id}
                            className="rc-icon-btn rc-icon-mail"
                            aria-label="Email scan"
                          >
                            {sendingId === i.id
                              ? <Loader2 size={16} className="rc-spin" />
                              : <Mail size={16} />}
                          </button>
                        </>
                      )}

                      <button onClick={() => remove(i.id)} className="rc-icon-btn" aria-label="Delete">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button onClick={() => exportWeek(key, rows)} className="rc-export-btn">
                  <Download size={15} />
                  <span>Export this week only</span>
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
        <button onClick={wipeAll} className="rc-history-clear">
          <Trash2 size={13} /> Clear all invoices
        </button>
      )}

      {toast && <div className="rc-toast">{toast}</div>}

      {viewing && (
        <div className="rc-scan-modal" onClick={() => setViewing(null)}>
          <div className="rc-scan-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="rc-chat-header">
              <div>
                <div className="rc-chat-title">{viewing.inv.supplier || "Invoice"}</div>
                <div className="rc-chat-sub">
                  {viewing.inv.invoiceDate || "no date"}
                  {viewing.inv.invoiceNumber ? ` · #${viewing.inv.invoiceNumber}` : ""}
                </div>
              </div>
              <button onClick={() => setViewing(null)} className="rc-close-btn" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="rc-scan-modal-body">
              <img src={viewing.dataUrl} alt="Scanned invoice" />
            </div>

            <div style={{ padding: 14 }}>
              <button
                onClick={() => emailScan(viewing.inv)}
                disabled={sendingId === viewing.id}
                className="rc-submit-btn rc-submit-active"
              >
                <Send size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                {sendingId === viewing.id ? "Sending…" : "Email this scan"}
              </button>
              
              <a
                href={viewing.dataUrl}
                download={`invoice-${viewing.inv.invoiceNumber || viewing.id}.jpg`}
                className="rc-portal-link"
              >
                Download image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}