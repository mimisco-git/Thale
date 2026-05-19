import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, http, defineChain, formatUnits } from "viem";

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

// ERC-4626 ABI
const TELLER_ABI = [
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A" as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60");

  try {
    // Try totalAssets/totalSupply ratio first (more reliable for rate)
    const [assetsResult, supplyResult] = await Promise.allSettled([
      client.readContract({ address: USYC_TELLER, abi: TELLER_ABI, functionName: "totalAssets" }),
      client.readContract({ address: USYC_TELLER, abi: TELLER_ABI, functionName: "totalSupply" }),
    ]);

    let rate = 1.0024;
    let source = "fallback";

    if (assetsResult.status === "fulfilled" && supplyResult.status === "fulfilled") {
      const assets = Number(formatUnits(assetsResult.value, 6));
      const supply = Number(formatUnits(supplyResult.value, 6));
      if (supply > 0) {
        const computedRate = assets / supply;
        // Sanity check: USYC rate should be between 1.0 and 1.15 (max ~15% APY realistic)
        if (computedRate >= 1.0 && computedRate <= 1.15) {
          rate = computedRate;
          source = "onchain";
        } else {
          // Rate out of expected range - use conservative fallback
          console.warn(`[USYC] Unexpected rate ${computedRate}, using fallback`);
          source = "fallback-sanity";
        }
      }
    } else {
      // Try convertToAssets as backup
      try {
        const raw = await client.readContract({
          address: USYC_TELLER,
          abi: TELLER_ABI,
          functionName: "convertToAssets",
          args: [BigInt(1_000_000)],
        });
        const computed = Number(formatUnits(raw, 6));
        if (computed >= 1.0 && computed <= 1.15) {
          rate = computed;
          source = "onchain-v2";
        }
      } catch {}
    }

    const apy = parseFloat(((rate - 1) * 365 * 100).toFixed(4));

    return res.json({
      rate,
      inverseRate: parseFloat((1 / rate).toFixed(6)),
      apy,
      source,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.json({
      rate: 1.0024,
      inverseRate: 0.9976,
      apy: 5.2,
      source: "fallback",
      timestamp: new Date().toISOString(),
    });
  }
}
