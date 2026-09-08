import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const MAX_ATTACHMENTS = 25;
const MAX_BYTES = 8 * 1024 * 1024; // skip anything unreasonably large

function client() {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
  });
}

export default async function handler(req, res) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return res.status(500).json({ ok: false, error: "Mailbox not configured" });
  }

  // GET  — list unread invoice attachments
  // POST — mark a message as read once it's been saved
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const c = client();

  try {
    await c.connect();
    const lock = await c.getMailboxLock("INBOX");

    try {
      if (req.method === "POST") {
        const { uid } = req.body || {};
        if (!uid) return res.status(400).json({ ok: false, error: "No uid" });
        await c.messageFlagsAdd({ uid: String(uid) }, ["\\Seen"], { uid: true });
        return res.json({ ok: true });
      }

      // Unread messages only — read ones are treated as already handled
      const uids = await c.search({ seen: false }, { uid: true });
      if (!uids || !uids.length) return res.json({ ok: true, items: [] });

      // Oldest first, capped
      const take = uids.slice(0, MAX_ATTACHMENTS);
      const items = [];

      for await (const msg of c.fetch(
        { uid: take.join(",") },
        { uid: true, envelope: true, source: true },
        { uid: true }
      )) {
        let parsed;
        try {
          parsed = await simpleParser(msg.source);
        } catch {
          continue;
        }

        const images = (parsed.attachments || []).filter(
          (a) =>
            a.content &&
            a.size <= MAX_BYTES &&
            /^image\/(jpe?g|png|heic|heif)$/i.test(a.contentType || "")
        );

        images.forEach((a, idx) => {
          items.push({
            uid: String(msg.uid),
            index: idx,
            filename: a.filename || `scan-${msg.uid}-${idx}.jpg`,
            mediaType: /png$/i.test(a.contentType) ? "image/png" : "image/jpeg",
            receivedAt: (parsed.date || msg.envelope?.date || new Date()).toISOString(),
            from: parsed.from?.text || msg.envelope?.from?.[0]?.address || "",
            subject: parsed.subject || msg.envelope?.subject || "",
            size: a.size,
            data: a.content.toString("base64"),
          });
        });
      }

      return res.json({ ok: true, items });
    } finally {
      lock.release();
    }
  } catch (e) {
    console.error("inbox error:", e);
    return res.status(500).json({
      ok: false,
      error: "Couldn't read the mailbox",
      detail: String(e.message).slice(0, 200),
    });
  } finally {
    try {
      await c.logout();
    } catch {
      /* ignore */
    }
  }
}