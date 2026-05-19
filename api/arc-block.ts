import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, http, defineChain } from "viem";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

const client = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", { timeout: 10_000 }),
});

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const blockNum = await client.getBlockNumber();
    const block = await client.getBlock({ blockNumber: blockNum });
    return res.json({
      number: Number(block.number),
      hash: block.hash,
      timestamp: Number(block.timestamp),
      txCount: block.transactions.length,
      explorerUrl: `https://testnet.arcscan.app/block/${Number(block.number)}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
