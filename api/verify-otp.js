import { clientIp, rateLimit, rateLimitReset, tooManyRequests } from "./_lib/rateLimit.js";
import {
  OTP_COOKIE,
  clearOtpCookie,
  otpConfigured,
  parseToken,
  readCookie,
  verifyCode,
} from "./_lib/otp.js";
import {
  SESSION_TTL_MS,
  appendCookie,
  makeSession,
  sessionConfigured,
} from "./_lib/session.js";

// Each issued code gets its own small budget of guesses. The counter is keyed
// on the token's signature, so replaying or editing the cookie can't reset it:
// a different cookie is either the same signature (same counter) or fails the
// HMAC check outright. A looser per-IP cap catches someone hammering the
// endpoint with forged cookies.
const PER_TOKEN = { limit: 5, windowSec: 15 * 60 };
const PER_IP = { limit: 30, windowSec: 15 * 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!otpConfigured() || !sessionConfigured()) {
    console.error(
      "verify-otp misconfigured: OTP_SECRET (>=16 chars) and OWNER_EMAIL must be set"
    );
    return res.status(500).json({ ok: false, error: "Login is unavailable right now." });
  }

  const ip = clientIp(req);
  const ipHit = await rateLimit(`verify:ip:${ip}`, PER_IP.limit, PER_IP.windowSec);
  if (!ipHit.allowed) {
    return tooManyRequests(res, ipHit.retryAfter, "Too many attempts. Try again later.");
  }

  const raw = readCookie(req, OTP_COOKIE);
  if (!raw) {
    return res.status(400).json({ ok: false, reason: "expired" });
  }

  const token = parseToken(raw);
  if (!token) {
    clearOtpCookie(res);
    return res.status(400).json({ ok: false, reason: "expired" });
  }

  if (token.exp < Date.now()) {
    clearOtpCookie(res);
    return res.status(400).json({ ok: false, reason: "expired" });
  }

  const tokenKey = `verify:token:${token.sig.slice(0, 32)}`;
  const tokenHit = await rateLimit(tokenKey, PER_TOKEN.limit, PER_TOKEN.windowSec);
  if (!tokenHit.allowed) {
    // Burn the code so the attacker can't keep working on it.
    clearOtpCookie(res);
    return tooManyRequests(
      res,
      tokenHit.retryAfter,
      "Too many incorrect codes. Request a new one."
    );
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();

  if (!verifyCode(email, code, token)) {
    return res.status(401).json({
      ok: false,
      reason: "incorrect",
      attemptsLeft: tokenHit.remaining,
    });
  }

  // Single use: the code is spent whether or not the session is created.
  clearOtpCookie(res);
  await rateLimitReset(tokenKey);
  await rateLimitReset(`verify:ip:${ip}`);

  // Issue the real credential. Owner-only data is served against this cookie,
  // not against a flag the client sets for itself.
  appendCookie(
    res,
    `rc_session=${makeSession(email)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`
  );

  return res.status(200).json({ ok: true });
}
