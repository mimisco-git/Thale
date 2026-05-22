import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const results: any = { groq: null, gemini: null };

  // Test Groq
  if (groqKey) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "Say OK" }],
          max_tokens: 5,
        }),
      });
      const d = await r.json();
      results.groq = { ok: r.ok, response: d.choices?.[0]?.message?.content, keyPrefix: groqKey.slice(0, 8) + "..." };
    } catch (e: any) {
      results.groq = { ok: false, error: e.message };
    }
  } else {
    results.groq = { ok: false, error: "GROQ_API_KEY not set" };
  }

  // Test Gemini
  if (geminiKey) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
      });
      const d = await r.json();
      results.gemini = { ok: r.ok, response: d.candidates?.[0]?.content?.parts?.[0]?.text, keyPrefix: geminiKey.slice(0, 8) + "..." };
    } catch (e: any) {
      results.gemini = { ok: false, error: e.message };
    }
  } else {
    results.gemini = { ok: false, error: "GEMINI_API_KEY not set" };
  }

  const anyOk = results.groq?.ok || results.gemini?.ok;
  return res.status(anyOk ? 200 : 500).json({ ok: anyOk, results });
}
