import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, http, defineChain } from "viem";

const arcTestnet = defineChain({
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});
const client = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network") });

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const block = await client.getBlockNumber();
    return res.json({ status: "ok", arcBlock: Number(block), chainId: 5042002, timestamp: new Date().toISOString() });
  } catch {
    return res.json({ status: "degraded", timestamp: new Date().toISOString() });
  }
}
