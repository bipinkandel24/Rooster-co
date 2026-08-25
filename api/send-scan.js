import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { to, image, supplier, invoiceNumber, invoiceDate, total, note } = req.body || {};
    if (!image) return res.status(400).json({ ok: false, error: "No image" });

    const dest = to || process.env.ACCOUNTANT_EMAIL || process.env.OWNER_EMAIL;
    if (!dest) return res.status(500).json({ ok: false, error: "No destination email set" });

    const name = supplier || "Invoice";
    const dateBit = invoiceDate || new Date().toLocaleDateString("en-AU");
    const safe = `${name}-${invoiceNumber || dateBit}`.replace(/[^a-zA-Z0-9-_]/g, "_");

    const lines = [
      `Supplier: ${supplier || "—"}`,
      `Invoice no: ${invoiceNumber || "—"}`,
      `Date: ${invoiceDate || "—"}`,
      total != null ? `Total: $${Number(total).toFixed(2)} AUD` : null,
      note ? `\nNote: ${note}` : null,
      `\n— Sent from the Rooster & Co staff app`,
    ].filter(Boolean);

    await resend.emails.send({
      from: process.env.MAIL_FROM || "Rooster & Co <onboarding@resend.dev>",
      to: dest,
      subject: `Invoice — ${name}${invoiceNumber ? ` #${invoiceNumber}` : ""} — ${dateBit}`,
      text: lines.join("\n"),
      attachments: [{ filename: `${safe}.jpg`, content: image }],
    });

    res.json({ ok: true, sentTo: dest });
  } catch (e) {
    console.error("send-scan error:", e);
    res.status(500).json({ ok: false, error: "Couldn't send" });
  }
}