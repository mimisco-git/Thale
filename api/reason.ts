import type { VercelRequest, VercelResponse } from "@vercel/node";

const ARC_RPC = "https://rpc.testnet.arc.network";
const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A";

async function getLiveArcState() {
  try {
    const [blockRes, assetsRes, supplyRes] = await Promise.all([
      fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }) }),
      fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", id: 2, params: [{ to: USYC_TELLER, data: "0x01e1d114" }, "latest"] }) }),
      fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", id: 3, params: [{ to: USYC_TELLER, data: "0x18160ddd" }, "latest"] }) }),
    ]);
    const [bD, aD, sD] = await Promise.all([blockRes.json(), assetsRes.json(), supplyRes.json()]);
    const block = parseInt(bD.result, 16);
    const assets = parseInt(aD.result, 16) / 1_000_000;
    const supply = parseInt(sD.result, 16) / 1_000_000;
    let rate = 1.0024;
    if (supply > 0 && assets > 0) { const r = assets / supply; if (r >= 1.0 && r <= 1.15) rate = r; }
    const apy = ((rate - 1) * 365 * 100).toFixed(2);
    return { block, rate, apy, source: rate !== 1.0024 ? "onchain" : "fallback" };
  } catch {
    return { block: null, rate: 1.0024, apy: "5.20", source: "fallback" };
  }
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are Thales, an autonomous economic reasoning agent on Arc blockchain. Always respond with valid JSON only, no markdown." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`Groq API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0]?.message?.content || "{}";
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { intent, mode = "intent" } = req.body || {};
  if (!intent) return res.status(400).json({ error: "intent is required" });

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    return res.status(500).json({ error: "No AI API key configured. Add GROQ_API_KEY to Vercel env vars." });
  }

  try {
    const { block, rate, apy, source } = await getLiveArcState();

    const isAutonomous = mode === "autonomous";
    const prompt = isAutonomous
      ? `You are Thales, autonomous economic agent on Arc (Chain ID 5042002).
State: Block #${block}, USYC rate: ${rate} (${source}, APY ~${apy}%), EURC/USDC: 1.0821.
Actions: HARVEST_YIELD | REBALANCE_TO_EURC | REBALANCE_TO_USDC | CCTP_BRIDGE | HOLD
Rules: HARVEST_YIELD if APY > 4%. HOLD if no clear edge.
Return JSON: {"action":"HARVEST_YIELD","confidence":0.85,"reasoning":"USYC APY is above threshold, routing idle USDC to Teller","naiveRoute":"USDC sits idle earning 0%","thalesRoute":"Deposit to USYC Teller 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A","estimatedAlpha":12.50,"executionPlan":["Approve USDC","Call Teller deposit","Verify receipt"],"riskNotes":"Low risk, deterministic Arc finality"}`
      : `You are Thales, thinking market participant on Arc (Circle L1, Chain ID 5042002).
LIVE STATE: Block #${block}, USYC rate: ${rate} (${source}, APY ~${apy}%), EURC/USDC: 1.0821.
CONTRACTS: USDC 0x3600000000000000000000000000000000000000, USYC Teller 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A, FxEscrow 0x867650F5eAe8df91445971f14d89fd84F0C9a9f8, CCTP domain 26.
USER INTENT: "${intent}"
Return JSON: {"targetCurrency":"USYC","sourceAmount":1000,"destinationChain":"arc","alphaGenerated":5.20,"fxAlpha":0,"usycYield":5.20,"reasoningTrace":{"strategy":"Route idle USDC to USYC for yield","naiveRoute":"USDC sits idle at 0% APY","thalesRoute":"Deposit via USYC Teller 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A for ${apy}% APY","yieldHarvesting":"Call deposit() on Teller with USDC amount","fxStrategy":"Monitor EURC peg at FxEscrow","finalityEstimate":"Sub-second on Arc block #${block}","telemetry":["Step 1: Approve USDC spend","Step 2: Call Teller deposit()","Step 3: Receive USYC shares","Step 4: Verify on ArcScan"],"contractsUsed":["0x9fdF14c5B14173D74C08Af27AebFf39240dC105A","0x3600000000000000000000000000000000000000"]}}`;

    let text: string;

    // Try Groq first (free, fast), fall back to Gemini
    if (groqKey) {
      try {
        text = await callGroq(prompt, groqKey);
      } catch (groqErr: any) {
        console.warn("[reason] Groq failed, trying Gemini:", groqErr.message);
        if (!geminiKey) throw groqErr;
        text = await callGemini(prompt, geminiKey);
      }
    } else {
      text = await callGemini(prompt, geminiKey!);
    }

    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.json({ ...result, arcBlock: block, usycRate: rate, usycRateSource: source, usycAPY: parseFloat(apy), timestamp: new Date().toISOString() });

  } catch (err: any) {
    console.error("[/api/reason]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
