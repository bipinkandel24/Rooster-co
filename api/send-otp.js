import { Resend } from "resend";
import { clientIp, rateLimit, tooManyRequests } from "./_lib/rateLimit.js";
import {
  OTP_TTL_MS,
  generateCode,
  makeToken,
  otpConfigured,
  setOtpCookie,
} from "./_lib/otp.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "").toLowerCase();

// A code can be requested 5 times per 15 min from one IP, and the owner's
// inbox can't be sent more than 5 codes per 15 min no matter where the
// requests come from.
const PER_IP = { limit: 5, windowSec: 15 * 60 };
const PER_EMAIL = { limit: 5, windowSec: 15 * 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!otpConfigured() || !RESEND_API_KEY || !OWNER_EMAIL) {
    console.error(
      "send-otp misconfigured: OTP_SECRET (>=16 chars), RESEND_API_KEY and OWNER_EMAIL must all be set"
    );
    return res.status(500).json({ ok: false, error: "Login is unavailable right now." });
  }

  const ip = clientIp(req);
  const ipHit = await rateLimit(`send:ip:${ip}`, PER_IP.limit, PER_IP.windowSec);
  if (!ipHit.allowed) {
    return tooManyRequests(res, ipHit.retryAfter, "Too many code requests. Try again later.");
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || email !== OWNER_EMAIL) {
    return res.status(403).json({ ok: false, error: "That email isn't authorised." });
  }

  const emailHit = await rateLimit(`send:email:${email}`, PER_EMAIL.limit, PER_EMAIL.windowSec);
  if (!emailHit.allowed) {
    return tooManyRequests(res, emailHit.retryAfter, "Too many code requests. Try again later.");
  }

  const code = generateCode();
  const exp = Date.now() + OTP_TTL_MS;

  try {
    await new Resend(RESEND_API_KEY).emails.send({
      from: "Rooster & Co <onboarding@resend.dev>",
      to: email,
      subject: "Your Rooster & Co access code",
      text: `Your Rooster & Co ordering portal code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    });
  } catch (e) {
    console.error("send-otp email error:", e);
    return res.status(502).json({ ok: false, error: "Couldn't send the code. Try again." });
  }

  // Only hand out the token once the code is actually on its way.
  setOtpCookie(res, makeToken(email, code, exp));
  return res.status(200).json({ ok: true, expiresAt: exp });
}
