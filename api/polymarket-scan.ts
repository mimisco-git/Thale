/**
 * Polymarket Scanner - finds +EV bets using Gamma API (public, no auth)
 * Kelly criterion sizing, builder code attribution
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

const GAMMA_API = "https://gamma-api.polymarket.com";

interface Market {
  id: string;
  question: string;
  outcomePrices: string;
  outcomes: string;
  volume: string;
  endDate: string;
  active: boolean;
  closed: boolean;
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

async function fetchActiveMarkets(): Promise<Market[]> {
  const resp = await fetch(
    `${GAMMA_API}/markets?active=true&closed=false&limit=20&order=volume&ascending=false`,
    { headers: { "Accept": "application/json" } }
  );
  if (!resp.ok) throw new Error(`Gamma API ${resp.status}`);
  return resp.json();
}

async function analyzeMarkets(markets: Market[]): Promise<EVBet[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const marketSummary = markets.slice(0, 8).map(m => {
    let prices: number[] = [];
    let outcomes: string[] = [];
    try { prices = JSON.parse(m.outcomePrices); outcomes = JSON.parse(m.outcomes); } catch {}
    return {
      id: m.id,
      question: m.question,
      outcomes: outcomes.map((o, i) => ({ name: o, price: prices[i] || 0 })),
      volume: parseFloat(m.volume || "0"),
      endDate: m.endDate,
    };
  });

  const prompt = `
You are Thales, an autonomous prediction market intelligence agent.
Analyze these live Polymarket markets and find positive expected value (+EV) bets.

MARKETS:
${JSON.stringify(marketSummary, null, 2)}

For each market, estimate the TRUE probability of each outcome based on:
- Current news and geopolitical context (as of May 2026)
- Base rates and historical patterns
- Market efficiency (assume market price is somewhat efficient but may be wrong)

Kelly Criterion formula: f = (bp - q) / b
where b = odds-1, p = your estimated probability, q = 1-p

Only flag bets where |your_probability - market_price| > 0.05 AND your edge > 3%

Return ONLY valid JSON array (empty array if no +EV found):
[
  {
    "marketId": "string",
    "question": "string",
    "outcome": "YES or NO or outcome name",
    "currentPrice": 0.00,
    "geminiProbability": 0.00,
    "edge": 0.00,
    "kellyFraction": 0.00,
    "suggestedSize": 0.00,
    "reasoning": "one clear sentence",
    "confidence": 0.0
  }
]
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = (response.text || "[]").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120"); // cache 2 mins

  try {
    const markets = await fetchActiveMarkets();
    const bets = await analyzeMarkets(markets);

    // Sort by edge descending
    bets.sort((a, b) => b.edge - a.edge);

    return res.json({
      scannedMarkets: markets.length,
      evBets: bets,
      builderCode: process.env.POLYMARKET_BUILDER_CODE || "thales-agora-001",
      timestamp: new Date().toISOString(),
      source: "polymarket-gamma-api",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, evBets: [] });
  }
}
