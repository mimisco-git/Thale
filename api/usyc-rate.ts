import type { VercelRequest, VercelResponse } from "@vercel/node";

const ARC_RPC = "https://rpc.testnet.arc.network";
const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60");

  try {
    // totalAssets() selector = 0x01e1d114
    // totalSupply() selector = 0x18160ddd
    const [assetsRes, supplyRes] = await Promise.all([
      fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", id: 1, params: [{ to: USYC_TELLER, data: "0x01e1d114" }, "latest"] }) }),
      fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", id: 2, params: [{ to: USYC_TELLER, data: "0x18160ddd" }, "latest"] }) }),
    ]);

    const [assetsData, supplyData] = await Promise.all([assetsRes.json(), supplyRes.json()]);
    const assets = parseInt(assetsData.result, 16) / 1_000_000;
    const supply = parseInt(supplyData.result, 16) / 1_000_000;

    let rate = 1.0024;
    let source = "fallback";

    if (supply > 0 && assets > 0) {
      const computed = assets / supply;
      if (computed >= 1.0 && computed <= 1.15) {
        rate = computed;
        source = "onchain";
      }
    }

    const apy = parseFloat(((rate - 1) * 365 * 100).toFixed(4));
    return res.json({ rate, inverseRate: parseFloat((1 / rate).toFixed(6)), apy, source, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.json({ rate: 1.0024, inverseRate: 0.9976, apy: 5.2, source: "fallback", timestamp: new Date().toISOString() });
  }
}
