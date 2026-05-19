/**
 * StableFXService.ts
 * Real USYC rate from Arc Teller contract + StableFX RFQ.
 * USYC Teller: 0x9fdF14c5B14173D74C08Af27AebFf39240dC105A
 * FxEscrow: 0x867650F5eAe8df91445971f14d89fd84F0C9a9f8
 */
import { createPublicClient, http, defineChain, formatUnits, parseUnits } from "viem";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", { timeout: 10_000 }),
});

const USYC_TELLER = "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A" as const;
const FX_ESCROW   = "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8" as const;
const USDC        = "0x3600000000000000000000000000000000000000" as const;
const EURC        = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

// ERC-4626 ABI subset for rate reading
const TELLER_ABI = [
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "convertToShares",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

interface USYCRate {
  rate: number;      // USDC per USYC (e.g. 1.0024)
  inverseRate: number; // USYC per USDC (e.g. 0.9976)
  source: "onchain" | "fallback";
  apy: number;       // estimated APY %
  timestamp: string;
}

let rateCache: USYCRate | null = null;
let rateCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute cache

/**
 * Fetch the live USYC/USDC conversion rate from the Arc Teller.
 */
export async function getLiveUSYCRate(): Promise<USYCRate> {
  const now = Date.now();
  if (rateCache && now - rateCacheTime < CACHE_TTL) return rateCache;

  try {
    const ONE_USYC = BigInt(1_000_000); // 1 USYC at 6 decimals
    const assetsRaw = await publicClient.readContract({
      address: USYC_TELLER,
      abi: TELLER_ABI,
      functionName: "convertToAssets",
      args: [ONE_USYC],
    });

    const rate = Number(formatUnits(assetsRaw, 6));
    const inverseRate = 1 / rate;
    // Annualise the daily accretion: rough estimate
    const apy = parseFloat(((rate - 1) * 365 * 100).toFixed(4));

    rateCache = { rate, inverseRate, source: "onchain", apy, timestamp: new Date().toISOString() };
    rateCacheTime = now;
    return rateCache;
  } catch (err) {
    console.warn("[StableFXService] Teller read failed, using fallback:", err);
    const fallback: USYCRate = {
      rate: 1.0024,
      inverseRate: 0.9976,
      source: "fallback",
      apy: 5.2,
      timestamp: new Date().toISOString(),
    };
    rateCache = fallback;
    rateCacheTime = now;
    return fallback;
  }
}

export class StableFXService {
  /**
   * Get a live RFQ quote for USDC -> USYC or USDC <-> EURC.
   */
  async getQuote(usdcAmount: number, from = "USDC", to = "USYC") {
    const { rate, source } = await getLiveUSYCRate();

    let toAmount: number;
    let actualRate: number;

    if (from === "USDC" && to === "USYC") {
      // USDC -> USYC: we get slightly fewer USYC than USDC
      // rate = USDC per USYC, so USYC = USDC / rate
      actualRate = 1 / rate;
      toAmount = usdcAmount * actualRate;
    } else if (from === "USYC" && to === "USDC") {
      actualRate = rate;
      toAmount = usdcAmount * actualRate;
    } else if (from === "EURC" && to === "USDC") {
      // Approx EURC/USDC peg (real rate would come from FxEscrow RFQ)
      actualRate = 1.082;
      toAmount = usdcAmount * actualRate;
    } else if (from === "USDC" && to === "EURC") {
      actualRate = 1 / 1.082;
      toAmount = usdcAmount * actualRate;
    } else {
      actualRate = 1;
      toAmount = usdcAmount;
    }

    const quoteId = `rfq_${Date.now().toString(36)}`;
    return {
      quoteId,
      baseCurrency: from,
      quoteCurrency: to,
      rate: actualRate,
      fromAmount: usdcAmount,
      toAmount: parseFloat(toAmount.toFixed(6)),
      expiresAt: Date.now() + 60_000,
      fee: usdcAmount * 0.0001, // 1 bp platform fee
      fxEscrow: FX_ESCROW,
      source,
    };
  }

  /**
   * Accept a quote (in production, submits to FxEscrow on Arc).
   */
  async acceptQuote(quoteId: string, walletAddress: string) {
    console.log(`[StableFX] Accepting quote ${quoteId} for ${walletAddress}`);
    // Production: walletClient.writeContract({ address: FX_ESCROW, ... })
    return {
      status: "accepted",
      fxEscrow: FX_ESCROW,
      note: "In production: submit to FxEscrow at " + FX_ESCROW,
      timestamp: new Date().toISOString(),
    };
  }
}
