import type { VercelRequest, VercelResponse } from "@vercel/node";

const ARC_RPC = "https://rpc.testnet.arc.network";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const r = await fetch(ARC_RPC, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBlockByNumber", params: ["latest", false], id: 1 }) });
    const data = await r.json();
    const block = data.result;
    return res.json({
      number: parseInt(block.number, 16),
      hash: block.hash,
      timestamp: parseInt(block.timestamp, 16),
      txCount: block.transactions?.length || 0,
      explorerUrl: `https://testnet.arcscan.app/block/${parseInt(block.number, 16)}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
