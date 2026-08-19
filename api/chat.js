import { GoogleGenerativeAI } from "@google/generative-ai";
import { clientIp, rateLimit, tooManyRequests } from "./_lib/rateLimit.js";

const API_KEY = process.env.API_KEY;

// The assistant is deliberately open to all staff — no login mid-shift. Gemini's
// free tier means abuse costs availability rather than money, but the caps below
// are still what keeps the endpoint usable for actual staff.
const PER_IP_BURST = { limit: 60, windowSec: 10 * 60 };
const PER_IP_DAILY = { limit: 600, windowSec: 24 * 60 * 60 };

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_TOTAL_CHARS = 12000;

const SYSTEM = `You are the Rooster & Co kitchen assistant, helping staff at a gluten-free charcoal chicken and souvlaki shop in Balwyn North, Melbourne.

You help with:
- Questions about the shop's training material: kitchen procedures, food safety, cleaning routines, and workplace safety.
- General cooking technique and food safety questions (temperatures, storage, cross-contamination, allergens).

Important context:
- The shop is gluten free — take allergen and cross-contamination questions seriously.
- Follow Australian food safety standards (FSANZ). Danger zone is 5°C to 60°C. Chicken must reach 75°C internal.
- For anything about a specific staff member's pay, roster, or employment, tell them to speak to Nick or Sharifa.
- For an injury, hazard, or incident, tell them to report it to their supervisor immediately and point them to the Help & Support module.

Style: short, practical, plain English. Staff are often busy mid-shift. Two or three sentences is usually enough. Use a numbered list only for actual step-by-step procedures. Never invent a shop-specific rule you weren't told — if you don't know how Rooster & Co does something, say so and suggest they ask their supervisor.

Politely decline anything unrelated to the kitchen, food, or the workplace.`;

/** Accept only well-formed {role, content} pairs with string content. */
function normalizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const trimmed = raw.slice(-MAX_MESSAGES);
  const out = [];
  let total = 0;

  for (const m of trimmed) {
    if (!m || typeof m.content !== "string") return null;

    const content = m.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (content === "") continue;

    total += content.length;
    if (total > MAX_TOTAL_CHARS) return null;

    out.push({ role: m.role === "assistant" ? "assistant" : "user", content });
  }

  // The API requires the conversation to start with a user turn.
  while (out.length > 0 && out[0].role === "assistant") out.shift();

  return out.length > 0 ? out : null;
}

/** Gemini uses {role: "user"|"model", parts: [{text}]} instead of {role, content}. */
function toGeminiHistory(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!API_KEY) {
    console.error("chat misconfigured: API_KEY is not set");
    return res.status(500).json({ error: "Assistant unavailable" });
  }

  const ip = clientIp(req);
  const burst = await rateLimit(`chat:burst:${ip}`, PER_IP_BURST.limit, PER_IP_BURST.windowSec);
  if (!burst.allowed) {
    return tooManyRequests(res, burst.retryAfter, "The assistant is busy. Try again shortly.");
  }
  const daily = await rateLimit(`chat:daily:${ip}`, PER_IP_DAILY.limit, PER_IP_DAILY.windowSec);
  if (!daily.allowed) {
    return tooManyRequests(res, daily.retryAfter, "Daily assistant limit reached.");
  }

  const messages = normalizeMessages(req.body?.messages);
  if (!messages) {
    return res.status(400).json({ error: "No messages" });
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM,
      generationConfig: { maxOutputTokens: 700 },
    });

    const history = toGeminiHistory(messages);
    // The last turn is the new prompt; everything before it is prior context.
    const latest = history.pop();

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latest.parts[0].text);

    const text = result.response.text();

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ text });
  } catch (e) {
    // Log server-side; never return the provider error to the client, since it
    // can carry request details and key metadata.
    console.error("chat error:", e);
    return res.status(502).json({ error: "Assistant unavailable" });
  }
}