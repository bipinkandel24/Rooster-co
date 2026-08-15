import crypto from "crypto";

// Owner sessions. Signed with the same secret as the OTP codes but under a
// distinct label, so a session token can never be replayed as an OTP token
// (or vice versa) even though both are HMACs over the same key.
const SECRET = process.env.OTP_SECRET;
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "").toLowerCase();
const LABEL = "rc-session-v1:";

export const SESSION_COOKIE = "rc_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function sessionConfigured() {
  return typeof SECRET === "string" && SECRET.length >= 16 && OWNER_EMAIL.length > 0;
}

function sign(body) {
  return crypto.createHmac("sha256", SECRET).update(LABEL + body).digest("hex");
}

/** Build a signed session token for an email, valid for SESSION_TTL_MS. */
export function makeSession(email, now = Date.now()) {
  const exp = now + SESSION_TTL_MS;
  const body = Buffer.from(`${email.toLowerCase()}|${exp}`, "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/**
 * Validate a session token. Returns { email, exp } or null.
 * Checks the signature in constant time before trusting any field.
 */
export function readSession(token) {
  if (typeof token !== "string") return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(sig)) return null;

  const expected = Buffer.from(sign(body), "hex");
  const given = Buffer.from(sig, "hex");
  if (expected.length !== given.length) return null;
  if (!crypto.timingSafeEqual(expected, given)) return null;

  let decoded;
  try {
    decoded = Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const sep = decoded.lastIndexOf("|");
  if (sep < 1) return null;

  const email = decoded.slice(0, sep);
  const exp = Number(decoded.slice(sep + 1));
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  // A session only counts if it still names the current owner.
  if (email !== OWNER_EMAIL) return null;

  return { email, exp };
}

export function setSessionCookie(res, token) {
  appendCookie(
    res,
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`
  );
}

export function clearSessionCookie(res) {
  appendCookie(res, `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

/** Add a Set-Cookie without clobbering one another handler already set. */
export function appendCookie(res, cookie) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) res.setHeader("Set-Cookie", cookie);
  else if (Array.isArray(existing)) res.setHeader("Set-Cookie", [...existing, cookie]);
  else res.setHeader("Set-Cookie", [existing, cookie]);
}

function readCookie(req, name) {
  const prefix = `${name}=`;
  const match = (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

/**
 * Gate for owner-only endpoints. Returns the session, or null after having
 * already written the 401/500 response — callers just return on null.
 */
export function requireOwner(req, res) {
  if (!sessionConfigured()) {
    console.error("session misconfigured: OTP_SECRET (>=16 chars) and OWNER_EMAIL must be set");
    res.status(500).json({ ok: false, error: "Unavailable" });
    return null;
  }

  const session = readSession(readCookie(req, SESSION_COOKIE));
  if (!session) {
    res.status(401).json({ ok: false, error: "Not signed in" });
    return null;
  }
  return session;
}
