import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ ok: false, error: "GEMINI_API_KEY not set in Vercel env vars" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say OK in one word.",
    });
    return res.json({
      ok: true,
      response: response.text,
      keyPrefix: apiKey.slice(0, 8) + "...",
    });
  } catch (err: any) {
    return res.json({
      ok: false,
      error: err.message,
      keyPrefix: apiKey.slice(0, 8) + "...",
    });
  }
}
