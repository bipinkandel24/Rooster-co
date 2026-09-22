import { saveInvoice } from "./invoices";
import { putScan } from "./imageStore";

export const emptyDraft = {
  supplier: "", abn: "", invoiceNumber: "", invoiceDate: "",
  subtotal: "", gst: "", total: "", lineItems: [], confidence: "", notes: "",
};

// Turn the AI's JSON into an editable draft
export function toDraft(data, dataUrl) {
  return {
    ...emptyDraft,
    ...data,
    abn: data.abn ?? "",
    invoiceNumber: data.invoiceNumber ?? "",
    invoiceDate: data.invoiceDate ?? "",
    subtotal: data.subtotal ?? "",
    gst: data.gst ?? "",
    total: data.total ?? "",
    lineItems: data.lineItems || [],
    _scanDataUrl: dataUrl,
  };
}

// Save the invoice record plus its scan image
export async function persistDraft(draft) {
  const { _scanDataUrl, ...fields } = draft;
  const num = (v) => (v === "" || v == null ? null : Number(v));

  const entry = saveInvoice({
    ...fields,
    subtotal: num(draft.subtotal),
    gst: num(draft.gst),
    total: num(draft.total),
    hasScan: Boolean(_scanDataUrl),
  });

  if (entry && _scanDataUrl) {
    try {
      await putScan(entry.id, { dataUrl: _scanDataUrl });
    } catch {
      /* the record is still saved even if the image isn't */
    }
  }
  return entry;
}

// Things worth a second look before saving
export function draftIssues(d) {
  const issues = [];
  const n = (v) => (v === "" || v == null ? null : Number(v));
  const sub = n(d.subtotal);
  const gst = n(d.gst);
  const total = n(d.total);

  if (!d.supplier) issues.push("No supplier name");
  if (!d.invoiceDate) issues.push("No invoice date — it'll be filed under today");
  if (total == null) issues.push("No total");
  if (sub != null && gst != null && total != null && Math.abs(sub + gst - total) > 0.05) {
    issues.push(`Subtotal + GST (${(sub + gst).toFixed(2)}) doesn't match the total`);
  }
  if (d.confidence === "low") issues.push("The scan was hard to read");
  return issues;
}