import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, http, defineChain, formatUnits } from "viem";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

const client = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network") });
const TELLER_ABI = [{ name: "convertToAssets", type: "function", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] }] as const;
const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A" as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const amount = parseFloat((req.query.amount as string) || "0");
  const from = (req.query.from as string) || "USDC";
  const to = (req.query.to as string) || "USYC";

  let rate = 1.0024;
  let source = "fallback";
  try {
    const raw = await client.readContract({ address: USYC_TELLER, abi: TELLER_ABI, functionName: "convertToAssets", args: [BigInt(1_000_000)] });
    rate = Number(formatUnits(raw, 6));
    source = "onchain";
  } catch {}

  let toAmount: number;
  let actualRate: number;
  if (from === "USDC" && to === "USYC") { actualRate = 1 / rate; toAmount = amount * actualRate; }
  else if (from === "USYC" && to === "USDC") { actualRate = rate; toAmount = amount * actualRate; }
  else if (from === "EURC" && to === "USDC") { actualRate = 1.082; toAmount = amount * actualRate; }
  else { actualRate = 1 / 1.082; toAmount = amount * actualRate; }

  return res.json({
    quoteId: `rfq_${Date.now().toString(36)}`,
    baseCurrency: from, quoteCurrency: to,
    fromAmount: amount, toAmount: parseFloat(toAmount.toFixed(6)),
    rate: actualRate, fee: amount * 0.0001,
    expiresAt: Date.now() + 60_000,
    fxEscrow: "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8",
    source,
  });
}
