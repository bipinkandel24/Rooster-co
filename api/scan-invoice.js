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

const MODEL = "gemini-2.0-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { image, mediaType } = req.body || {};
    if (!image) return res.status(400).json({ ok: false, error: "No image" });

    const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ ok: false, error: "Missing API key" });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
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

    if (!r.ok) {
      console.error("gemini error:", await r.text());
      return res.status(500).json({ ok: false, error: "Scan failed" });
    }

    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(422).json({ ok: false, error: "Couldn't read that invoice" });
    }

    res.json({ ok: true, data });
  } catch (e) {
    console.error("scan error:", e);
    res.status(500).json({ ok: false, error: "Scan failed" });
  }
}