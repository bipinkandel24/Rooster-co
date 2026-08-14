import crypto from "crypto";

const SECRET = process.env.OTP_SECRET || "change-me";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, code } = req.body || {};

  const raw = (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("rc_otp="));
  if (!raw) return res.json({ ok: false });

  let exp, sig;
  try {
    [exp, sig] = Buffer.from(raw.slice(7), "base64").toString().split(".");
  } catch {
    return res.json({ ok: false });
  }

  if (Number(exp) < Date.now()) return res.json({ ok: false });

  const payload = `${(email || "").toLowerCase()}.${(code || "").trim()}.${exp}`;
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

  if (expected !== sig) return res.json({ ok: false });

  res.setHeader("Set-Cookie", "rc_otp=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  res.json({ ok: true });
}