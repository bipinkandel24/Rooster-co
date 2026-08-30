import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { file, filename, mime, subject, body } = req.body || {};
    if (!file || !filename) return res.status(400).json({ ok: false, error: "Nothing to send" });

    const dest = process.env.ACCOUNTANT_EMAIL || process.env.OWNER_EMAIL;
    if (!dest) return res.status(500).json({ ok: false, error: "No destination email set" });

    await resend.emails.send({
      from: process.env.MAIL_FROM || "Rooster & Co <onboarding@resend.dev>",
      to: dest,
      subject: subject || filename,
      text: body || "Attached.",
      attachments: [{ filename, content: file, contentType: mime || "application/octet-stream" }],
    });

    res.json({ ok: true, sentTo: dest });
  } catch (e) {
    console.error("send-file error:", e);
    res.status(500).json({ ok: false, error: "Couldn't send" });
  }
}