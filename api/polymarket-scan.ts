import type { VercelRequest, VercelResponse } from "@vercel/node";

const GAMMA_API = "https://gamma-api.polymarket.com";

interface Market {
  id: string;
  question: string;
  outcomePrices: string;
  outcomes: string;
  volume: string;
  endDate: string;
  active: boolean;
}

interface EVBet {
  marketId: string;
  question: string;
  outcome: string;
  currentPrice: number;
  geminiProbability: number;
  edge: number;
  kellyFraction: number;
  suggestedSize: number;
  reasoning: string;
  confidence: number;
}

async function fetchMarkets(): Promise<Market[]> {
  try {
    const resp = await fetch(
      `${GAMMA_API}/markets?active=true&closed=false&limit=20&order=volume&ascending=false`,
      { headers: { "Accept": "application/json" } }
    );
    if (!resp.ok) throw new Error(`Gamma API ${resp.status}`);
    return await resp.json();
  } catch {
    return [];
  }
}

async function analyzeWithGroq(markets: Market[], apiKey: string): Promise<EVBet[]> {
  const summary = markets.slice(0, 8).map((m) => {
    let prices: number[] = [], outcomes: string[] = [];
    try { prices = JSON.parse(m.outcomePrices); outcomes = JSON.parse(m.outcomes); } catch {}
    return { id: m.id, question: m.question, outcomes: outcomes.map((o, i) => ({ name: o, price: prices[i] || 0 })), volume: parseFloat(m.volume || "0"), endDate: m.endDate };
  });

  const prompt = `You are Thales, a prediction market intelligence agent. Analyze these live Polymarket markets and find +EV bets using Kelly criterion.

MARKETS:
${JSON.stringify(summary, null, 2)}

For each market, estimate the TRUE probability based on current events (May 2026).
Only flag bets where |your_probability - market_price| > 0.05 AND edge > 3%.
Kelly: f = (bp - q) / b where b = odds-1, p = your probability, q = 1-p.

Return ONLY a JSON array (empty if none):
[{"marketId":"string","question":"string","outcome":"YES or NO","currentPrice":0.00,"geminiProbability":0.00,"edge":0.00,"kellyFraction":0.00,"suggestedSize":0.00,"reasoning":"one sentence","confidence":0.0}]`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a prediction market analyst. Respond with valid JSON arrays only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const text = data.choices[0]?.message?.content || "[]";

  // Handle both array and object response
  const parsed = JSON.parse(text);
  const bets = Array.isArray(parsed) ? parsed : (parsed.bets || parsed.markets || parsed.results || []);
  return bets.sort((a: EVBet, b: EVBet) => b.edge - a.edge);
}

async function analyzeWithGemini(markets: Market[], apiKey: string): Promise<EVBet[]> {
  const summary = markets.slice(0, 8).map((m) => {
    let prices: number[] = [], outcomes: string[] = [];
    try { prices = JSON.parse(m.outcomePrices); outcomes = JSON.parse(m.outcomes); } catch {}
    return { id: m.id, question: m.question, outcomes: outcomes.map((o, i) => ({ name: o, price: prices[i] || 0 })), volume: parseFloat(m.volume || "0") };
  });

  const prompt = `Analyze these Polymarket markets for +EV bets. Return JSON array only.
Markets: ${JSON.stringify(summary)}
Find bets where |your_probability - market_price| > 0.05. Use Kelly criterion.
Format: [{"marketId":"","question":"","outcome":"YES","currentPrice":0.5,"geminiProbability":0.6,"edge":0.1,"kellyFraction":0.05,"suggestedSize":50,"reasoning":"one sentence","confidence":0.7}]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }) }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  return Array.isArray(parsed) ? parsed : [];
}

// Show raw markets without AI when no key available
function buildRawDisplay(markets: Market[]): EVBet[] {
  return markets.slice(0, 6).map((m) => {
    let prices: number[] = [], outcomes: string[] = [];
    try { prices = JSON.parse(m.outcomePrices); outcomes = JSON.parse(m.outcomes); } catch {}
    const price = prices[0] || 0.5;
    return {
      marketId: m.id,
      question: m.question,
      outcome: outcomes[0] || "YES",
      currentPrice: price,
      geminiProbability: price, // No AI - show market price as estimate
      edge: 0,
      kellyFraction: 0,
      suggestedSize: 0,
      reasoning: "AI analysis unavailable. Add GROQ_API_KEY to Vercel for Kelly criterion sizing.",
      confidence: 0,
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120");

  const groqKey  = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const markets = await fetchMarkets();
  let evBets: EVBet[] = [];
  let aiSource = "none";

  if (groqKey) {
    try { evBets = await analyzeWithGroq(markets, groqKey); aiSource = "groq"; }
    catch (e) { console.warn("[polymarket] Groq failed:", e); }
  }

  if (evBets.length === 0 && geminiKey) {
    try { evBets = await analyzeWithGemini(markets, geminiKey); aiSource = "gemini"; }
    catch (e) { console.warn("[polymarket] Gemini failed:", e); }
  }

  // Always show something - raw markets if AI unavailable
  const displayBets = evBets.length > 0 ? evBets : buildRawDisplay(markets);

  return res.json({
    scannedMarkets: markets.length,
    evBets: displayBets,
    aiSource,
    hasAI: evBets.length > 0,
    builderCode: process.env.POLYMARKET_BUILDER_CODE || "thales-agora-001",
    timestamp: new Date().toISOString(),
    source: "polymarket-gamma-api",
  });
}
