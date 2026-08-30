import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { to, image, pdf, filename, supplier, invoiceNumber, invoiceDate, total, note, subject } =
      req.body || {};

    if (!image && !pdf) return res.status(400).json({ ok: false, error: "Nothing to send" });

    // A custom address is only used if it actually looks like one
    const fallback = process.env.ACCOUNTANT_EMAIL || process.env.OWNER_EMAIL;
    const dest = looksLikeEmail(to) ? String(to).trim() : fallback;
    if (!dest) return res.status(500).json({ ok: false, error: "No destination email set" });

    const name = supplier || "Invoice";
    const dateBit = invoiceDate || new Date().toLocaleDateString("en-AU");
    const safe = `${name}-${invoiceNumber || dateBit}`.replace(/[^a-zA-Z0-9-_]/g, "_");

    const lines = [
      supplier ? `Supplier: ${supplier}` : null,
      invoiceNumber ? `Invoice no: ${invoiceNumber}` : null,
      invoiceDate ? `Date: ${invoiceDate}` : null,
      total != null ? `Total: $${Number(total).toFixed(2)} AUD` : null,
      note ? `\n${note}` : null,
      `\n— Sent from the Rooster & Co staff app`,
    ].filter(Boolean);

    const attachments = pdf
      ? [{ filename: filename || "invoices.pdf", content: pdf }]
      : [{ filename: `${safe}.jpg`, content: image }];

    await resend.emails.send({
      from: process.env.MAIL_FROM || "Rooster & Co <onboarding@resend.dev>",
      to: dest,
      subject:
        subject ||
        `Invoice — ${name}${invoiceNumber ? ` #${invoiceNumber}` : ""} — ${dateBit}`,
      text: lines.join("\n"),
      attachments,
    });

    res.json({ ok: true, sentTo: dest });
  } catch (e) {
    console.error("send-scan error:", e);
    res.status(500).json({ ok: false, error: "Couldn't send" });
  }
}