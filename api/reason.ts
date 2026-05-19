import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

const ARC_RPC = "https://rpc.testnet.arc.network";
const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A";

async function getLiveArcState() {
  try {
    // Get block number
    const blockRes = await fetch(ARC_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    });
    const blockData = await blockRes.json();
    const block = parseInt(blockData.result, 16);

    // Get USYC rate via eth_call (convertToAssets(1000000))
    const callRes = await fetch(ARC_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", method: "eth_call", id: 2,
        params: [{
          to: USYC_TELLER,
          // convertToAssets(uint256) selector = 0x07a2d13a, arg = 1000000 (0xF4240) padded
          data: "0x07a2d13a00000000000000000000000000000000000000000000000000000000000f4240",
        }, "latest"],
      }),
    });
    const callData = await callRes.json();
    const rawRate = parseInt(callData.result, 16);
    const rate = rawRate / 1_000_000;
    const validRate = rate >= 1.0 && rate <= 1.15 ? rate : 1.0024;
    const apy = ((validRate - 1) * 365 * 100).toFixed(2);

    return { block, rate: validRate, apy, source: rate >= 1.0 && rate <= 1.15 ? "onchain" : "fallback" };
  } catch {
    return { block: null, rate: 1.0024, apy: "5.20", source: "fallback" };
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
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured in Vercel" });

  try {
    const { block, rate, apy, source } = await getLiveArcState();

    const ai = new GoogleGenAI({ apiKey });

    const isAutonomous = mode === "autonomous";
    const prompt = isAutonomous ? `
You are Thales, an autonomous economic agent on Arc (Chain ID 5042002).
State: Block #${block}, USYC rate: ${rate} (${source}, APY ~${apy}%), EURC/USDC: 1.0821.
Actions: HARVEST_YIELD | REBALANCE_TO_EURC | REBALANCE_TO_USDC | CCTP_BRIDGE | HOLD
Rules: HARVEST_YIELD if APY > 4%. HOLD if no clear edge.
Return ONLY JSON: {"action":"HARVEST_YIELD","confidence":0.85,"reasoning":"one sentence","naiveRoute":"idle USDC","thalesRoute":"USYC Teller deposit","estimatedAlpha":12.50,"executionPlan":["Step 1","Step 2"],"riskNotes":"low risk"}` : `
You are Thales, the first thinking market participant on Arc (Circle L1, Chain ID 5042002).
LIVE: Block #${block}, USYC rate: ${rate} (${source}, APY ~${apy}%), EURC/USDC: 1.0821.
CONTRACTS: USDC 0x3600000000000000000000000000000000000000, USYC Teller 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A, FxEscrow 0x867650F5eAe8df91445971f14d89fd84F0C9a9f8.
USER INTENT: "${intent}"
Return ONLY JSON: {"targetCurrency":"USYC","sourceAmount":1000,"destinationChain":"arc","alphaGenerated":5.20,"fxAlpha":0,"usycYield":5.20,"reasoningTrace":{"strategy":"brief","naiveRoute":"idle","thalesRoute":"optimized with contracts","yieldHarvesting":"Teller deposit","fxStrategy":"peg monitor","finalityEstimate":"sub-second","telemetry":["Step 1","Step 2","Step 3"],"contractsUsed":["0x9fdF..."]}}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = (response.text || "{}").replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);

    return res.json({ ...result, arcBlock: block, usycRate: rate, usycRateSource: source, usycAPY: parseFloat(apy), timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[/api/reason]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
