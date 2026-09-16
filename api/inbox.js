import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const MAX_MESSAGES = 25;
const MAX_BYTES = 15 * 1024 * 1024; // PDFs run larger than photos

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

const isImage = (t) => /^image\/(jpe?g|png|heic|heif)$/i.test(t || "");
const isPdf = (t) => /^application\/pdf$/i.test(t || "");

export default async function handler(req, res) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return res.status(500).json({ ok: false, error: "Mailbox not configured" });
  }

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

      const uids = await c.search({ seen: false }, { uid: true });
      if (!uids || !uids.length) return res.json({ ok: true, items: [] });

      const take = uids.slice(0, MAX_MESSAGES);
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

        const files = (parsed.attachments || []).filter(
          (a) =>
            a.content &&
            a.size <= MAX_BYTES &&
            (isImage(a.contentType) || isPdf(a.contentType))
        );

        files.forEach((a, idx) => {
          const pdf = isPdf(a.contentType);
          items.push({
            uid: String(msg.uid),
            index: idx,
            total: files.length,
            kind: pdf ? "pdf" : "image",
            filename: a.filename || `scan-${msg.uid}-${idx}.${pdf ? "pdf" : "jpg"}`,
            mediaType: pdf
              ? "application/pdf"
              : /png$/i.test(a.contentType)
              ? "image/png"
              : "image/jpeg",
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