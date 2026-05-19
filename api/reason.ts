/**
 * /api/reason - Server-side Gemini reasoning endpoint.
 * Keeps GEMINI_API_KEY server-side, never exposed to browser.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import { createPublicClient, http, defineChain, formatUnits } from "viem";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", { timeout: 10_000 }),
});

const TELLER_ABI = [
  { name: "convertToAssets", type: "function", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "totalAssets", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A" as const;

async function getLiveRate() {
  try {
    const [assets, supply] = await Promise.all([
      arcClient.readContract({ address: USYC_TELLER, abi: TELLER_ABI, functionName: "totalAssets" }),
      arcClient.readContract({ address: USYC_TELLER, abi: TELLER_ABI, functionName: "totalSupply" }),
    ]);
    const rate = Number(formatUnits(assets, 6)) / Number(formatUnits(supply, 6));
    return (rate >= 1.0 && rate <= 1.15) ? { rate, source: "onchain" } : { rate: 1.0024, source: "fallback" };
  } catch {
    return { rate: 1.0024, source: "fallback" };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { intent, mode = "intent" } = req.body || {};
  if (!intent) return res.status(400).json({ error: "intent is required" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  try {
    const [blockNum, rateData] = await Promise.allSettled([
      arcClient.getBlockNumber(),
      getLiveRate(),
    ]);

    const block = blockNum.status === "fulfilled" ? Number(blockNum.value) : null;
    const { rate, source } = rateData.status === "fulfilled" ? rateData.value : { rate: 1.0024, source: "fallback" };
    const apy = ((rate - 1) * 365 * 100).toFixed(2);

    const ai = new GoogleGenAI({ apiKey });

    let prompt: string;

    if (mode === "autonomous") {
      // Autonomous agent decision
      prompt = `You are Thales, an autonomous economic agent on Arc (Chain ID 5042002).
Current state: Block #${block}, USYC rate: ${rate} (${source}, APY ~${apy}%), EURC/USDC: 1.0821.
Available actions: HARVEST_YIELD | REBALANCE_TO_EURC | REBALANCE_TO_USDC | CCTP_BRIDGE | HOLD
Rules: HARVEST_YIELD if APY > 4%. HOLD if no clear edge. Be conservative.
Return ONLY JSON:
{
  "action": "HARVEST_YIELD or HOLD or REBALANCE_TO_EURC or REBALANCE_TO_USDC or CCTP_BRIDGE",
  "confidence": 0.0,
  "reasoning": "one sentence",
  "naiveRoute": "what happens without Thales",
  "thalesRoute": "optimized path",
  "estimatedAlpha": 0.00,
  "executionPlan": ["step 1", "step 2"],
  "riskNotes": "key risk"
}`;
    } else {
      // User intent
      prompt = `You are Thales: the first thinking market participant on Arc (Circle's L1 blockchain).
LIVE STATE: Block #${block}, USYC rate: ${rate} (${source}), APY ~${apy}%, EURC/USDC: 1.0821.
CONTRACTS: USDC 0x3600000000000000000000000000000000000000, USYC Teller 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A, FxEscrow 0x867650F5eAe8df91445971f14d89fd84F0C9a9f8, CCTP domain 26.
USER INTENT: "${intent}"
Return ONLY valid JSON:
{
  "targetCurrency": "USDC or USYC or EURC",
  "sourceAmount": 0,
  "destinationChain": "arc",
  "alphaGenerated": 0.00,
  "fxAlpha": 0.00,
  "usycYield": 0.00,
  "reasoningTrace": {
    "strategy": "brief strategy",
    "naiveRoute": "unoptimized path",
    "thalesRoute": "optimized path with contract addresses",
    "yieldHarvesting": "USYC Teller interaction",
    "fxStrategy": "EURC/USDC optimization",
    "finalityEstimate": "sub-second on Arc",
    "telemetry": ["Step 1", "Step 2", "Step 3"],
    "contractsUsed": ["0x...", "0x..."]
  }
}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = (response.text || "{}").replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);

    return res.json({
      ...result,
      arcBlock: block,
      usycRate: rate,
      usycRateSource: source,
      usycAPY: parseFloat(apy),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[/api/reason]", err);
    return res.status(500).json({ error: err.message });
  }
}
