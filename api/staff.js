import { requireOwner } from "./_lib/session.js";
import { STAFF } from "./_lib/staffData.js";

// Staff records (personal numbers, emergency contacts, start dates, notes)
// are served only to a signed-in owner. This data used to be imported by
// ManagementPortal and shipped in the client bundle, where anyone could read
// it without ever passing the login.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!requireOwner(req, res)) return;

  // Never let a shared cache hold personal data.
  res.setHeader("Cache-Control", "no-store, private");
  return res.status(200).json({ ok: true, staff: STAFF });
}
