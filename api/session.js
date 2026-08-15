import { SESSION_COOKIE, clearSessionCookie, readSession } from "./_lib/session.js";

// Lets the app ask the server whether it is really signed in, instead of
// trusting a sessionStorage flag the user can set themselves.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, private");

  if (req.method === "DELETE") {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true, signedIn: false });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const prefix = `${SESSION_COOKIE}=`;
  const raw = (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));

  const session = raw ? readSession(raw.slice(prefix.length)) : null;
  return res.status(200).json({ ok: true, signedIn: Boolean(session) });
}
