import crypto from "crypto";

// No insecure default. If OTP_SECRET is missing the endpoints refuse to run
// rather than falling back to a shared literal that anyone could forge with.
const SECRET = process.env.OTP_SECRET;

export const OTP_COOKIE = "rc_otp";
export const OTP_TTL_MS = 10 * 60 * 1000;

/** True when the function has everything it needs to sign/verify safely. */
export function otpConfigured() {
  return typeof SECRET === "string" && SECRET.length >= 16;
}

/** Uniformly random 6-digit code from a CSPRNG (not Math.random). */
export function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function sign(email, code, exp) {
  const payload = `${email.toLowerCase()}.${code}.${exp}`;
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Build the opaque cookie value carrying the expiry + signature. */
export function makeToken(email, code, exp) {
  return Buffer.from(`${exp}.${sign(email, code, exp)}`).toString("base64url");
}

/** Parse a cookie value into { exp, sig }, or null if it's malformed. */
export function parseToken(raw) {
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const dot = decoded.indexOf(".");
    if (dot < 1) return null;

    const exp = Number(decoded.slice(0, dot));
    const sig = decoded.slice(dot + 1);
    if (!Number.isFinite(exp) || !/^[0-9a-f]{64}$/.test(sig)) return null;

    return { exp, sig };
  } catch {
    return null;
  }
}

/** Constant-time check of a submitted code against a parsed token. */
export function verifyCode(email, code, token) {
  const expected = sign(email, code, token.exp);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token.sig, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Read a named cookie out of the raw Cookie header. */
export function readCookie(req, name) {
  const header = req.headers.cookie || "";
  const prefix = `${name}=`;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

export function setOtpCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${OTP_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${OTP_TTL_MS / 1000}`
  );
}

export function clearOtpCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${OTP_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}
