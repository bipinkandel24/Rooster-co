import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const SECRET = process.env.OTP_SECRET || "change-me";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email } = req.body || {};
  if (!email || email.toLowerCase() !== (process.env.OWNER_EMAIL || "").toLowerCase()) {
    return res.status(403).json({ ok: false });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = `${email.toLowerCase()}.${code}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${exp}.${sig}`).toString("base64");

  res.setHeader(
    "Set-Cookie",
    `rc_otp=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  await resend.emails.send({
    from: "Rooster & Co <onboarding@resend.dev>",
    to: email,
    subject: `Your access code: ${code}`,
    text: `Your Rooster & Co ordering portal code is ${code}. It expires in 10 minutes.`,
  });

  res.json({ ok: true });
}