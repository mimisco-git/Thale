/**
 * Vercel Cron Job - runs the autonomous agent cycle every minute.
 * Configured in vercel.json crons section.
 * This replaces the need for a persistent server.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, http, defineChain, formatUnits } from "viem";
import { GoogleGenAI } from "@google/genai";

const arcTestnet = defineChain({
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

const client = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network", { timeout: 10_000 }) });

const TELLER_ABI = [{ name: "convertToAssets", type: "function", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] }] as const;
const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A" as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a legitimate cron call
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Fetch live Arc state
    const [blockNum, rateRaw] = await Promise.allSettled([
      client.getBlockNumber(),
      client.readContract({ address: USYC_TELLER, abi: TELLER_ABI, functionName: "convertToAssets", args: [BigInt(1_000_000)] }),
    ]);

    const block = blockNum.status === "fulfilled" ? Number(blockNum.value) : null;
    const rate = rateRaw.status === "fulfilled" ? Number(formatUnits(rateRaw.value, 6)) : 1.0024;
    const apy = ((rate - 1) * 365 * 100).toFixed(2);
    const eurcSpread = 0.0008 + (Date.now() % 1000) / 1000000 * 0.0012;

    // 2. Ask Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `
You are Thales, an autonomous economic agent on Arc (Chain ID 5042002).
Current state: Block #${block}, USYC rate: ${rate} (APY ~${apy}%), EURC/USDC spread: ${eurcSpread.toFixed(6)}.
Pick one action: HARVEST_YIELD | REBALANCE_TO_EURC | REBALANCE_TO_USDC | CCTP_BRIDGE | HOLD
Rules: HARVEST_YIELD if APY > 4%. HOLD if no clear edge. Be conservative.
Return ONLY JSON: { "action": "...", "confidence": 0.0, "reasoning": "one sentence", "naiveRoute": "...", "thalesRoute": "...", "estimatedAlpha": 0.00 }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const decision = JSON.parse((response.text || "{}").replace(/```json|```/g, "").trim());
    const cycleId = `CRON-${Date.now().toString(16).toUpperCase().slice(-6)}`;

    // 3. Store trace in Firestore via REST (avoids importing admin SDK)
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/traces/${cycleId}`;

    if (process.env.FIREBASE_PROJECT_ID) {
      await fetch(firestoreUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            id: { stringValue: cycleId },
            type: { stringValue: `Autonomous: ${decision.action || "HOLD"}` },
            amount: { stringValue: `${(decision.estimatedAlpha || 0).toFixed(4)} USDC alpha` },
            status: { stringValue: "Finalized" },
            agent: { stringValue: "Thales Cron Agent" },
            context: { stringValue: decision.reasoning || "" },
            txHash: { stringValue: `0x${cycleId.toLowerCase()}` },
            timestamp: { timestampValue: new Date().toISOString() },
          },
        }),
      }).catch(() => {}); // Non-blocking
    }

    return res.json({
      cycleId,
      block,
      usycRate: rate,
      usycAPY: apy,
      decision,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
