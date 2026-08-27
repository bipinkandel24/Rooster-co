import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { to, name, week, body } = req.body || {};
    if (!to || !body) return res.status(400).json({ ok: false });

    await resend.emails.send({
      from: process.env.MAIL_FROM || "Rooster & Co <onboarding@resend.dev>",
      to,
      subject: `Your roster — ${week}`,
      text: body,
      html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.7;color:#2A241D;white-space:pre-wrap">${body}</div>`,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("roster mail error:", e);
    res.status(500).json({ ok: false });
  }
}