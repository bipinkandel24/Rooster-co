const PROMPT = `You are reading a supplier invoice for an Australian restaurant (Rooster & Co, Balwyn North VIC).

Extract the details and respond with ONLY a JSON object, no markdown fences, no preamble:

{
  "supplier": "business name on the invoice",
  "abn": "ABN if shown, else null",
  "invoiceNumber": "invoice/docket number, else null",
  "invoiceDate": "YYYY-MM-DD, else null",
  "dueDate": "YYYY-MM-DD, else null",
  "subtotal": number or null,
  "gst": number or null,
  "total": number or null,
  "currency": "AUD",
  "lineItems": [
    { "description": "item", "qty": number or null, "unitPrice": number or null, "amount": number or null }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": "anything unclear or unreadable, else null"
}

Rules:
- Numbers must be plain numbers, no dollar signs or commas.
- Australian dates are usually DD/MM/YYYY — convert carefully.
- GST in Australia is 10%. If only a total is shown and it says "includes GST", gst = total / 11.
- If a field genuinely isn't on the invoice, use null. Never guess or invent a value.
- Set confidence to "low" if the image is blurry, cropped, or you're unsure about the totals.
- Include every line item you can read.`;

// Tried in order — if the first has been renamed or isn't available on your
// key, the next one is attempted before giving up.
const MODELS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.6-flash"];

async function callGemini(model, key, image, mediaType) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mediaType || "image/jpeg", data: image } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const body = await r.text();
  return { ok: r.ok, status: r.status, body };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { image, mediaType } = req.body || {};
    if (!image) return res.status(400).json({ ok: false, error: "No image" });

    const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({
        ok: false,
        error: "Missing API key",
        detail: "Neither API_KEY nor GEMINI_API_KEY is set in this environment.",
      });
    }

    let last = null;
    let good = null;

    for (const model of MODELS) {
      const attempt = await callGemini(model, key, image, mediaType);
      if (attempt.ok) {
        good = attempt;
        break;
      }
      last = { model, status: attempt.status, body: attempt.body };
      console.error(`gemini error [${model}] ${attempt.status}:`, attempt.body);
      // A bad key or disabled API won't be fixed by trying another model
      if (attempt.status === 400 || attempt.status === 403) break;
    }

    if (!good) {
      return res.status(500).json({
        ok: false,
        error: "Scan failed",
        detail: last ? `${last.model} → ${last.status}: ${last.body}` : "No response",
      });
    }

    const j = JSON.parse(good.body);

    const blocked = j.promptFeedback?.blockReason;
    if (blocked) {
      return res.status(422).json({ ok: false, error: "Scan blocked", detail: blocked });
    }

    const text = (j.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    if (!text) {
      return res.status(422).json({
        ok: false,
        error: "Empty response",
        detail: JSON.stringify(j).slice(0, 500),
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(422).json({
        ok: false,
        error: "Couldn't read that invoice",
        detail: text.slice(0, 300),
      });
    }

    res.json({ ok: true, data });
  } catch (e) {
    console.error("scan error:", e);
    res.status(500).json({ ok: false, error: "Scan failed", detail: String(e).slice(0, 300) });
  }
}