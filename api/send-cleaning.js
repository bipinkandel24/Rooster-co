import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { area, staffName, done, missed, total } = req.body || {};

    if (!area || !staffName || !Array.isArray(done) || !Array.isArray(missed)) {
      return res.status(400).json({ ok: false, error: "Bad request" });
    }
    if (staffName.length > 60 || done.length + missed.length > 200) {
      return res.status(400).json({ ok: false, error: "Too large" });
    }

    const now = new Date();
    const stamp = now.toLocaleString("en-AU", {
      timeZone: "Australia/Melbourne",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
    });
    const dateShort = now.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" });

    const pct = total ? Math.round((done.length / total) * 100) : 0;
    const complete = missed.length === 0;

    const text = [
      `${area.toUpperCase()} CLEANING — Rooster & Co`,
      ``,
      `Completed by: ${staffName}`,
      `Submitted: ${stamp}`,
      `Progress: ${done.length} of ${total} (${pct}%)`,
      ``,
      `DONE (${done.length})`,
      ...done.map((t) => `  [x] ${t}`),
      ...(missed.length
        ? ["", `NOT DONE (${missed.length})`, ...missed.map((t) => `  [ ] ${t}`)]
        : []),
      ``,
      `— Sent automatically from the Rooster & Co staff app`,
    ].join("\n");

    const html = `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;color:#2A241D">
        <h2 style="margin:0 0 4px;font-size:18px">${area} Cleaning</h2>
        <p style="margin:0 0 16px;color:#6F6656;font-size:13px">Rooster &amp; Co · ${stamp}</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;font-size:14px">
          <tr><td style="padding:4px 0;color:#6F6656">Completed by</td><td style="padding:4px 0;font-weight:600">${staffName}</td></tr>
          <tr><td style="padding:4px 0;color:#6F6656">Progress</td><td style="padding:4px 0;font-weight:600">${done.length} of ${total} (${pct}%)</td></tr>
        </table>

        <div style="background:${complete ? "#E6EEDA" : "#FBF0D8"};border:1px solid ${complete ? "#A9C08A" : "#DFC48A"};border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:18px">
          ${complete ? "All tasks completed." : `${missed.length} task${missed.length === 1 ? "" : "s"} not done.`}
        </div>

        <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6F6656;margin:0 0 8px">Done</h3>
        <ul style="margin:0 0 18px;padding-left:18px;font-size:14px;line-height:1.7">
          ${done.map((t) => `<li>${t}</li>`).join("")}
        </ul>

        ${
          missed.length
            ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#B02F22;margin:0 0 8px">Not done</h3>
               <ul style="margin:0 0 18px;padding-left:18px;font-size:14px;line-height:1.7;color:#B02F22">
                 ${missed.map((t) => `<li>${t}</li>`).join("")}
               </ul>`
            : ""
        }

        <p style="color:#A79D8D;font-size:11px;margin-top:24px">Sent automatically from the Rooster &amp; Co staff app</p>
      </div>`;

    await resend.emails.send({
      from: process.env.MAIL_FROM || "Rooster & Co <onboarding@resend.dev>",
      to: process.env.OWNER_EMAIL,
      subject: `${area} cleaning — ${dateShort} — ${staffName}${complete ? "" : ` (${missed.length} missed)`}`,
      text,
      html,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("cleaning mail error:", e);
    res.status(500).json({ ok: false });
  }
}