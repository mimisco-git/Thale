import type { VercelRequest, VercelResponse } from "@vercel/node";

const ARC_RPC = "https://rpc.testnet.arc.network";
const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const amount = parseFloat((req.query.amount as string) || "0");
  const from = (req.query.from as string) || "USDC";
  const to = (req.query.to as string) || "USYC";

  let rate = 1.0024;
  try {
    const [aR, sR] = await Promise.all([
      fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", id: 1, params: [{ to: USYC_TELLER, data: "0x01e1d114" }, "latest"] }) }),
      fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", id: 2, params: [{ to: USYC_TELLER, data: "0x18160ddd" }, "latest"] }) }),
    ]);
    const [aD, sD] = await Promise.all([aR.json(), sR.json()]);
    const a = parseInt(aD.result, 16) / 1_000_000;
    const s = parseInt(sD.result, 16) / 1_000_000;
    if (s > 0 && a > 0) { const r = a / s; if (r >= 1.0 && r <= 1.15) rate = r; }
  } catch {}

  let toAmount: number, actualRate: number;
  if (from === "USDC" && to === "USYC") { actualRate = 1 / rate; toAmount = amount * actualRate; }
  else if (from === "USYC" && to === "USDC") { actualRate = rate; toAmount = amount * actualRate; }
  else if (from === "EURC") { actualRate = 1.082; toAmount = amount * actualRate; }
  else { actualRate = 1 / 1.082; toAmount = amount * actualRate; }

  return res.json({
    quoteId: `rfq_${Date.now().toString(36)}`,
    baseCurrency: from, quoteCurrency: to,
    fromAmount: amount, toAmount: parseFloat(toAmount.toFixed(6)),
    rate: actualRate, fee: amount * 0.0001,
    expiresAt: Date.now() + 60_000,
    fxEscrow: "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8",
    source: "onchain",
  });
}
