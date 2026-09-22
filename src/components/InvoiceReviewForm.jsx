import React from "react";
import { FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { money } from "../data/invoices";
import { draftIssues } from "../data/invoiceDraft";

export default function InvoiceReviewForm({
  draft,
  onField,
  onSave,
  onCancel,
  cancelLabel = "← Cancel",
  saveLabel = "Save invoice",
  saving = false,
  top = null,
  extraActions = null,
}) {
  const issues = draftIssues(draft);

  return (
    <div className="rc-scroll-area">
      <button onClick={onCancel} className="rc-back-btn">{cancelLabel}</button>

      <div className="rc-detail-heading">
        <div className="rc-module-icon" style={{ background: "var(--bg-card)" }}>
          <FileText size={19} color="var(--gold)" />
        </div>
        <div>
          <h2 className="rc-detail-title">Check the details</h2>
          <div className="rc-stock-unit">Fix anything that's wrong before saving</div>
        </div>
      </div>

      {top}

      {draft._scanDataUrl && (
        <img src={draft._scanDataUrl} alt="Scanned invoice" className="rc-scan-preview" />
      )}

      {issues.length > 0 && (
        <div className="rc-urgent-note">
          {issues.map((t, i) => (
            <div key={i}>• {t}</div>
          ))}
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
          onChange={(e) => onField("supplier", e.target.value)} />
      </div>

      <div className="rc-field-row">
        <div className="rc-field">
          <label className="rc-field-label">Invoice no.</label>
          <input className="rc-field-input" value={draft.invoiceNumber}
            onChange={(e) => onField("invoiceNumber", e.target.value)} />
        </div>
        <div className="rc-field">
          <label className="rc-field-label">Date</label>
          <input className="rc-field-input" type="date" value={draft.invoiceDate}
            onChange={(e) => onField("invoiceDate", e.target.value)} />
        </div>
      </div>

      <div className="rc-field-row">
        <div className="rc-field">
          <label className="rc-field-label">Subtotal</label>
          <input className="rc-field-input" type="number" step="0.01" value={draft.subtotal}
            onChange={(e) => onField("subtotal", e.target.value)} />
        </div>
        <div className="rc-field">
          <label className="rc-field-label">GST</label>
          <input className="rc-field-input" type="number" step="0.01" value={draft.gst}
            onChange={(e) => onField("gst", e.target.value)} />
        </div>
        <div className="rc-field">
          <label className="rc-field-label">Total</label>
          <input className="rc-field-input" type="number" step="0.01" value={draft.total}
            onChange={(e) => onField("total", e.target.value)} />
        </div>
      </div>

      {draft.lineItems?.length > 0 && (
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

      <button onClick={onSave} disabled={saving} className="rc-submit-btn rc-submit-active">
        {saving ? (
          <Loader2 size={15} className="rc-spin" style={{ verticalAlign: "-2px", marginRight: 6 }} />
        ) : (
          <CheckCircle2 size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        )}
        {saving ? "Saving…" : saveLabel}
      </button>

      {extraActions}
    </div>
  );
}