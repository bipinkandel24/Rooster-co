import React, { useState, useRef } from "react";
import {
  Camera, Loader2, Trash2, Download, ChevronRight, X, Receipt, Mail, Eye, Send,
  Image as ImageIcon, MailPlus, FileDown, Share2, Inbox,
} from "lucide-react";
import {
  loadInvoices, deleteInvoice, clearInvoices, groupByWeek, weekLabel, money,
} from "../data/invoices";
import { makeThumbBase64 } from "../utils/scanFilter";
import { fileToCanvas } from "../utils/perspective";
import { getScan, deleteScan, clearScans } from "../data/imageStore";
import { toDraft, persistDraft } from "../data/invoiceDraft";
import CropView from "./CropView";
import LiveScanner from "./LiveScanner";
import InboxQueue from "./InboxQueue";
import InvoiceReviewForm from "./InvoiceReviewForm";

export default function InvoiceScanner({ onBack }) {
  const [invoices, setInvoices] = useState(() => loadInvoices());
  const [draft, setDraft] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cropping, setCropping] = useState(null);
  const [inbox, setInbox] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [openWeek, setOpenWeek] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [toast, setToast] = useState("");
  const [building, setBuilding] = useState("");
  const fileRef = useRef(null);

  const flash = (msg, ms = 4000) => {
    setToast(msg);
    setTimeout(() => setToast(""), ms);
  };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    try {
      setCropping(await fileToCanvas(file));
    } catch {
      setErr("Couldn't open that photo.");
    }
  };

  const readScan = async (dataUrl) => {
    setCropping(null);
    setScanning(false);
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
      setDraft(toDraft(d.data, dataUrl));
    } catch (e) {
      setErr(e.message || "Couldn't read that invoice. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    const entry = await persistDraft(draft);
    setSaving(false);
    if (entry) {
      setInvoices((p) => [entry, ...p]);
      setDraft(null);
    } else {
      setErr("Couldn't save — device storage may be full.");
    }
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
      if (!rec?.dataUrl) return flash("No scan saved for this invoice.");
      setViewing({ id: inv.id, dataUrl: rec.dataUrl, inv });
    } catch {
      flash("Couldn't open that scan.");
    }
  };

  const emailScan = async (inv) => {
    setSendingId(inv.id);
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
      flash(`Sent to ${d.sentTo}`);
    } catch (e) {
      flash(e.message || "Couldn't send that scan.");
    } finally {
      setSendingId(null);
    }
  };

  const shareScan = async (inv) => {
    setSendingId(inv.id);
    try {
      const rec = await getScan(inv.id);
      if (!rec?.dataUrl) throw new Error("No scan saved");
      const blob = await (await fetch(rec.dataUrl)).blob();
      const name = `${(inv.supplier || "invoice").replace(/[^a-zA-Z0-9]/g, "_")}-${inv.invoiceNumber || inv.invoiceDate || inv.id}.jpg`;
      const file = new File([blob], name, { type: "image/jpeg" });
      const subject = `Invoice — ${inv.supplier || ""}${inv.invoiceNumber ? ` #${inv.invoiceNumber}` : ""}`;
      const body = [
        inv.supplier ? `Supplier: ${inv.supplier}` : null,
        inv.invoiceNumber ? `Invoice no: ${inv.invoiceNumber}` : null,
        inv.invoiceDate ? `Date: ${inv.invoiceDate}` : null,
        inv.total != null ? `Total: ${money(inv.total)}` : null,
      ].filter(Boolean).join("\n");

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: subject, text: body });
      } else {
        const a = document.createElement("a");
        a.href = rec.dataUrl;
        a.download = name;
        a.click();
        setTimeout(() => {
          window.location.href =
            `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + "\n\n(attach the downloaded image)")}`;
        }, 600);
        flash("Image downloaded — attach it in your mail app.");
      }
    } catch (e) {
      if (e.name !== "AbortError") flash("Couldn't share that scan.");
    } finally {
      setSendingId(null);
    }
  };

  // ---------- PDF ----------
  const buildPdf = async (rows, label) => {
    setBuilding(label);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 8;
      let added = 0;

      for (const inv of rows) {
        if (!inv.hasScan) continue;
        const rec = await getScan(inv.id).catch(() => null);
        if (!rec?.dataUrl) continue;
        const dims = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.width, h: img.height });
          img.onerror = () => resolve(null);
          img.src = rec.dataUrl;
        });
        if (!dims) continue;
        if (added > 0) doc.addPage();

        const maxW = pw - margin * 2;
        const maxH = ph - margin * 2 - 10;
        const scale = Math.min(maxW / dims.w, maxH / dims.h);
        const w = dims.w * scale;
        const h = dims.h * scale;

        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(
          [
            inv.supplier || "Unknown supplier",
            inv.invoiceNumber ? `#${inv.invoiceNumber}` : null,
            inv.invoiceDate || null,
            inv.total != null ? money(inv.total) : null,
          ].filter(Boolean).join("  ·  "),
          margin,
          margin + 4
        );
        doc.addImage(rec.dataUrl, "JPEG", margin + (maxW - w) / 2, margin + 8, w, h);
        added++;
      }

      if (!added) {
        flash("No saved scans to put in a PDF.");
        return null;
      }
      return { doc, count: added };
    } catch {
      flash("Couldn't build the PDF.");
      return null;
    } finally {
      setBuilding("");
    }
  };

  const downloadPdf = async (rows, filename, label) => {
    const built = await buildPdf(rows, label);
    if (built) built.doc.save(filename);
  };

  const sharePdf = async (rows, filename, label) => {
    const built = await buildPdf(rows, label);
    if (!built) return;
    try {
      const file = new File([built.doc.output("blob")], filename, { type: "application/pdf" });
      const title = `Rooster & Co invoices — ${built.count} scans`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        built.doc.save(filename);
        setTimeout(() => {
          window.location.href =
            `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Invoices attached.")}`;
        }, 600);
        flash("PDF downloaded — attach it in your mail app.");
      }
    } catch (e) {
      if (e.name !== "AbortError") flash("Couldn't share the PDF.");
    }
  };

  const emailPdfDirect = async (rows, filename, label, subject) => {
    const built = await buildPdf(rows, label);
    if (!built) return;
    setSendingId(`pdf-${label}`);
    try {
      const r = await fetch("/api/send-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: built.doc.output("datauristring").split(",")[1],
          filename,
          mime: "application/pdf",
          subject,
          body: `${built.count} scanned invoice${built.count === 1 ? "" : "s"} attached.\n\n— Rooster & Co staff app`,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Send failed");
      flash(`PDF sent to ${d.sentTo}`);
    } catch (e) {
      flash(e.message || "Couldn't send the PDF.");
    } finally {
      setSendingId(null);
    }
  };

  // ---------- Excel ----------
  const buildWorkbook = async (rows) => {
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
    if (items.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Line Items");
    return { XLSX, wb };
  };

  const downloadExcel = async (rows, filename) => {
    const { XLSX, wb } = await buildWorkbook(rows);
    XLSX.writeFile(wb, filename);
  };

  const emailExcel = async (rows, filename, label, subject) => {
    setSendingId(`xls-${label}`);
    try {
      const { XLSX, wb } = await buildWorkbook(rows);
      const total = rows.reduce((s, i) => s + (i.total || 0), 0);
      const r = await fetch("/api/send-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: XLSX.write(wb, { bookType: "xlsx", type: "base64" }),
          filename,
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          subject,
          body: `${rows.length} invoice${rows.length === 1 ? "" : "s"} · ${money(total)} total\n\n— Rooster & Co staff app`,
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Send failed");
      flash(`Spreadsheet sent to ${d.sentTo}`);
    } catch (e) {
      flash(e.message || "Couldn't send the spreadsheet.");
    } finally {
      setSendingId(null);
    }
  };

  // ---------- Screens ----------
  if (inbox) {
    return (
      <InboxQueue
        onBack={() => setInbox(false)}
        onSaved={(entry) => setInvoices((p) => [entry, ...p])}
      />
    );
  }

  if (scanning) {
    return (
      <LiveScanner
        onCapture={readScan}
        onCancel={() => setScanning(false)}
        onPickFile={() => {
          setScanning(false);
          setTimeout(() => fileRef.current?.click(), 120);
        }}
      />
    );
  }

  if (cropping) {
    return <CropView canvas={cropping} onDone={readScan} onCancel={() => setCropping(null)} />;
  }

  if (draft) {
    return (
      <InvoiceReviewForm
        draft={draft}
        onField={(k, v) => setDraft((p) => ({ ...p, [k]: v }))}
        onSave={saveDraft}
        saving={saving}
        onCancel={() => setDraft(null)}
        top={err ? <div className="rc-urgent-note">{err}</div> : null}
      />
    );
  }

  // ---------- Main list ----------
  const weeks = groupByWeek(invoices);
  const grandTotal = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const scanCount = invoices.filter((i) => i.hasScan).length;
  const stamp = new Date().toISOString().slice(0, 10);

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

      <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />

      <button onClick={() => setScanning(true)} disabled={busy} className="rc-scan-btn">
        {busy ? <Loader2 size={20} className="rc-spin" /> : <Camera size={20} />}
        <span>{busy ? "Reading invoice…" : "Scan an invoice"}</span>
      </button>

      <button onClick={() => setInbox(true)} disabled={busy} className="rc-history-toggle">
        <Inbox size={15} color="var(--text-2)" />
        <span>Invoices sent by email</span>
        <ChevronRight size={16} color="var(--text-3)" />
      </button>

      <button onClick={() => fileRef.current?.click()} disabled={busy} className="rc-history-toggle">
        <ImageIcon size={15} color="var(--text-2)" />
        <span>Choose from photos instead</span>
      </button>

      {err && (
        <div className="rc-urgent-note" style={{ marginTop: 14, wordBreak: "break-word" }}>{err}</div>
      )}

      {invoices.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="rc-export-pair">
            <button
              onClick={() => downloadExcel(invoices, `rooster-invoices-all-${stamp}.xlsx`)}
              className="rc-export-btn"
            >
              <Download size={15} />
              <span>All to Excel</span>
            </button>
            <button
              onClick={() =>
                emailExcel(invoices, `rooster-invoices-all-${stamp}.xlsx`, "all",
                  `Rooster & Co — all invoices (${invoices.length})`)
              }
              disabled={sendingId === "xls-all"}
              className="rc-export-btn rc-export-mail"
            >
              {sendingId === "xls-all" ? <Loader2 size={15} className="rc-spin" /> : <Mail size={15} />}
              <span>Email</span>
            </button>
          </div>

          {scanCount > 0 && (
            <div className="rc-export-pair">
              <button
                onClick={() => downloadPdf(invoices, `rooster-invoices-all-${stamp}.pdf`, "all")}
                disabled={building === "all"}
                className="rc-pdf-btn"
              >
                {building === "all" ? <Loader2 size={15} className="rc-spin" /> : <FileDown size={15} />}
                <span>{scanCount} scans as PDF</span>
              </button>
              <button
                onClick={() =>
                  emailPdfDirect(invoices, `rooster-invoices-all-${stamp}.pdf`, "all",
                    "Rooster & Co — all scanned invoices")
                }
                disabled={Boolean(building) || sendingId === "pdf-all"}
                className="rc-pdf-btn rc-export-mail"
              >
                {sendingId === "pdf-all" ? <Loader2 size={15} className="rc-spin" /> : <Mail size={15} />}
                <span>Email</span>
              </button>
            </div>
          )}
        </div>
      )}

      {weeks.map(([key, rows]) => {
        const total = rows.reduce((s, i) => s + (i.total || 0), 0);
        const open = openWeek === key;
        const weekScans = rows.filter((i) => i.hasScan).length;
        return (
          <div key={key} className="rc-week-block">
            <button onClick={() => setOpenWeek(open ? null : key)} className="rc-week-head">
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
                            aria-label="Email to the usual address"
                          >
                            {sendingId === i.id ? <Loader2 size={16} className="rc-spin" /> : <Mail size={16} />}
                          </button>
                          <button
                            onClick={() => shareScan(i)}
                            disabled={sendingId === i.id}
                            className="rc-icon-btn rc-icon-mail-alt"
                            aria-label="Share to another address"
                          >
                            <MailPlus size={16} />
                          </button>
                        </>
                      )}
                      <button onClick={() => remove(i.id)} className="rc-icon-btn" aria-label="Delete">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="rc-export-pair">
                  <button
                    onClick={() => downloadExcel(rows, `rooster-invoices-week-${key}.xlsx`)}
                    className="rc-export-btn"
                  >
                    <Download size={15} />
                    <span>Week to Excel</span>
                  </button>
                  <button
                    onClick={() =>
                      emailExcel(rows, `rooster-invoices-week-${key}.xlsx`, key,
                        `Rooster & Co invoices — ${weekLabel(key)}`)
                    }
                    disabled={sendingId === `xls-${key}`}
                    className="rc-export-btn rc-export-mail"
                  >
                    {sendingId === `xls-${key}` ? <Loader2 size={15} className="rc-spin" /> : <Mail size={15} />}
                    <span>Email</span>
                  </button>
                </div>

                {weekScans > 0 && (
                  <>
                    <div className="rc-export-pair">
                      <button
                        onClick={() => downloadPdf(rows, `rooster-invoices-${key}.pdf`, key)}
                        disabled={building === key}
                        className="rc-pdf-btn"
                      >
                        {building === key ? <Loader2 size={15} className="rc-spin" /> : <FileDown size={15} />}
                        <span>{weekScans} scans as PDF</span>
                      </button>
                      <button
                        onClick={() =>
                          emailPdfDirect(rows, `rooster-invoices-${key}.pdf`, key,
                            `Rooster & Co scans — ${weekLabel(key)}`)
                        }
                        disabled={Boolean(building) || sendingId === `pdf-${key}`}
                        className="rc-pdf-btn rc-export-mail"
                      >
                        {sendingId === `pdf-${key}` ? <Loader2 size={15} className="rc-spin" /> : <Mail size={15} />}
                        <span>Email</span>
                      </button>
                    </div>
                    <button
                      onClick={() => sharePdf(rows, `rooster-invoices-${key}.pdf`, key)}
                      disabled={Boolean(building)}
                      className="rc-icon-mail-alt-btn"
                    >
                      <Share2 size={15} />
                      <span>Share PDF to someone else</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}

      {invoices.length === 0 && !busy && (
        <div className="rc-namegate" style={{ minHeight: 200 }}>
          <div className="rc-namegate-sub">No invoices yet. Scan one, or check the email inbox.</div>
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
                {sendingId === viewing.id ? "Sending…" : "Email to the usual address"}
              </button>
              <button onClick={() => shareScan(viewing.inv)} className="rc-icon-mail-alt-btn">
                <Share2 size={15} />
                <span>Share — Gmail, WhatsApp, anywhere</span>
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