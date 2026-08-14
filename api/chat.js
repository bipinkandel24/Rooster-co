import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.API_KEY });

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages" });
    }

    const trimmed = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000),
    }));

    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 700,
      system: SYSTEM,
      messages: trimmed,
    });

    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    res.json({ text });
  } catch (e) {
    console.error("chat error:", e);
    res.status(500).json({ error: "Assistant unavailable" });
  }
}