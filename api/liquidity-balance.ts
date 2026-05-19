import type { VercelRequest, VercelResponse } from "@vercel/node";

const ARC_RPC = "https://rpc.testnet.arc.network";
const ETH_RPC = "https://eth.public-rpc.com";
const BASE_RPC = "https://mainnet.base.org";

const USDC_ARC  = "0x3600000000000000000000000000000000000000";
const USDC_ETH  = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USYC      = "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C";
const EURC      = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

async function balanceOf(rpc: string, token: string, address: string): Promise<number> {
  try {
    const addr = address.replace("0x", "").padStart(64, "0");
    const r = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", id: 1, params: [{ to: token, data: `0x70a08231000000000000000000000000${addr}` }, "latest"] }) });
    const d = await r.json();
    return parseInt(d.result || "0x0", 16) / 1_000_000;
  } catch { return 0; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const address = (req.query.address as string) || "0x0000000000000000000000000000000000000000";
  const [arcUsdc, ethUsdc, baseUsdc, usyc, eurc] = await Promise.allSettled([
    balanceOf(ARC_RPC, USDC_ARC, address),
    balanceOf(ETH_RPC, USDC_ETH, address),
    balanceOf(BASE_RPC, USDC_BASE, address),
    balanceOf(ARC_RPC, USYC, address),
    balanceOf(ARC_RPC, EURC, address),
  ]);
  const v = (r: any) => r.status === "fulfilled" ? r.value : 0;
  return res.json({
    totalUSDC: v(arcUsdc) + v(ethUsdc) + v(baseUsdc),
    usdyc: v(usyc), eurc: v(eurc),
    breakdown: [
      { network: "Arc Testnet", balance: v(arcUsdc), currency: "USDC" },
      { network: "Ethereum", balance: v(ethUsdc), currency: "USDC" },
      { network: "Base", balance: v(baseUsdc), currency: "USDC" },
      { network: "Arc Testnet", balance: v(usyc), currency: "USYC" },
      { network: "Arc Testnet", balance: v(eurc), currency: "EURC" },
    ],
  });
}
