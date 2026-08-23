// Shared rate limiting for the Rooster & Co API functions.
//
// Uses Upstash Redis over its REST API when UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set, so counters are shared across every
// serverless instance. Without those vars it falls back to a per-instance
// in-memory counter — weaker under load (each Vercel instance counts
// separately) but still blocks the simple single-source attack.

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// ---- in-memory fallback ---------------------------------------------------

const memory = new Map();
const MEMORY_MAX_KEYS = 5000;

function sweepMemory(now) {
  for (const [k, v] of memory) {
    if (v.resetAt <= now) memory.delete(k);
  }
  // Hard cap so a flood of unique keys can't grow the map without bound.
  if (memory.size > MEMORY_MAX_KEYS) {
    const excess = memory.size - MEMORY_MAX_KEYS;
    let i = 0;
    for (const k of memory.keys()) {
      if (i++ >= excess) break;
      memory.delete(k);
    }
  }
}

function memoryHit(key, limit, windowSec) {
  const now = Date.now();
  sweepMemory(now);

  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSec * 1000;
    memory.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfter };
  }
  return { allowed: true, remaining: limit - existing.count, retryAfter: 0 };
}

// ---- Upstash Redis --------------------------------------------------------

async function redisHit(key, limit, windowSec) {
  // Pipeline: INCR then EXPIRE ... NX (only sets a TTL on the first hit, so
  // the window is fixed from the first request rather than sliding forward).
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
      ["TTL", key],
    ]),
  });

  if (!res.ok) throw new Error(`upstash ${res.status}`);

  const out = await res.json();
  const count = Number(out[0]?.result ?? 0);
  const ttl = Number(out[2]?.result ?? windowSec);
  const retryAfter = ttl > 0 ? ttl : windowSec;

  if (count > limit) {
    return { allowed: false, remaining: 0, retryAfter };
  }
  return { allowed: true, remaining: Math.max(0, limit - count), retryAfter: 0 };
}

// ---- public API -----------------------------------------------------------

/**
 * Count one request against `key`. Returns { allowed, remaining, retryAfter }.
 * Fails closed: if the Redis backend errors we deny the request rather than
 * letting an outage silently disable the limiter.
 */
export async function rateLimit(key, limit, windowSec) {
  const scoped = `rc:rl:${key}`;
  if (!USE_REDIS) return memoryHit(scoped, limit, windowSec);

  try {
    return await redisHit(scoped, limit, windowSec);
  } catch (e) {
    console.error("rateLimit backend error:", e);
    return { allowed: false, remaining: 0, retryAfter: 60 };
  }
}

/** Clear a counter, e.g. after a successful login. */
export async function rateLimitReset(key) {
  const scoped = `rc:rl:${key}`;
  if (!USE_REDIS) {
    memory.delete(scoped);
    return;
  }
  try {
    await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(scoped)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
  } catch (e) {
    console.error("rateLimitReset error:", e);
  }
}

/** Best-effort client IP. Vercel sets x-forwarded-for at the edge. */
export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) return String(fwd[0]).trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

/** Send a 429 with a Retry-After header. */
export function tooManyRequests(res, retryAfter, message) {
  res.setHeader("Retry-After", String(Math.max(1, retryAfter || 60)));
  return res.status(429).json({
    ok: false,
    error: message || "Too many attempts. Please wait and try again.",
  });
}
