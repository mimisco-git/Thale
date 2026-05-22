import type { VercelRequest, VercelResponse } from "@vercel/node";

const GAMMA_API = "https://gamma-api.polymarket.com";

async function fetchActiveMarkets() {
  const res = await fetch(
    `${GAMMA_API}/markets?active=true&closed=false&limit=20&order=volume&ascending=false`,
    { headers: { "Accept": "application/json" } }
  );
  if (!res.ok) throw new Error(`Gamma API ${res.status}`);
  return res.json();
}

async function analyzeWithGroq(markets: any[], apiKey: string) {
  const summary = markets.slice(0, 8).map((m: any) => {
    let prices: number[] = [], outcomes: string[] = [];
    try { prices = JSON.parse(m.outcomePrices); outcomes = JSON.parse(m.outcomes); } catch {}
    return { id: m.id, question: m.question, outcomes: outcomes.map((o, i) => ({ name: o, price: prices[i] || 0 })), volume: parseFloat(m.volume || "0") };
  });

  const prompt = `You are Thales, a prediction market intelligence agent.
Analyze these live Polymarket markets and find +EV bets using Kelly criterion.
Only flag bets where |your_probability - market_price| > 0.05 AND edge > 3%.

MARKETS: ${JSON.stringify(summary)}

Return JSON array (empty if no +EV): [{"marketId":"string","question":"string","outcome":"YES or NO","currentPrice":0.00,"geminiProbability":0.00,"edge":0.00,"kellyFraction":0.00,"suggestedSize":0.00,"reasoning":"one sentence","confidence":0.0}]`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a prediction market analyst. Always respond with valid JSON array only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "[]";

  // Groq returns json_object so we need to extract the array
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  // Handle both {bets: [...]} and [...] formats
  return Array.isArray(parsed) ? parsed : (parsed.bets || parsed.markets || parsed.opportunities || []);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120");

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.json({ scannedMarkets: 0, evBets: [], error: "GROQ_API_KEY not configured", timestamp: new Date().toISOString() });
  }

  try {
    const markets = await fetchActiveMarkets();
    const bets = await analyzeWithGroq(markets, groqKey);
    bets.sort((a: any, b: any) => (b.edge || 0) - (a.edge || 0));

    return res.json({
      scannedMarkets: markets.length,
      evBets: bets.slice(0, 8),
      builderCode: "thales-agora-001",
      timestamp: new Date().toISOString(),
      source: "polymarket-gamma-api + groq-llama3",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, evBets: [], scannedMarkets: 0 });
  }
}
