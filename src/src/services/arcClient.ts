/**
 * arcClient.ts
 * Real viem client configured for Arc Testnet (Chain ID 5042002).
 * All addresses sourced from https://docs.arc.network/arc/references/contract-addresses
 */
import { createPublicClient, http, defineChain, formatUnits, type Address } from "viem";

// Arc Testnet - official details from Arc docs
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

// Public read client (no private key required)
export const arcPublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", {
    timeout: 10_000,
    retryCount: 3,
  }),
});

// ---- Official Arc Testnet Contract Addresses ----
export const ARC_CONTRACTS = {
  // Stablecoins
  USDC:  "0x3600000000000000000000000000000000000000" as Address,
  EURC:  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address,
  USYC:  "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C" as Address,

  // USYC infrastructure
  USYC_TELLER:       "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A" as Address,
  USYC_ENTITLEMENTS: "0xcc205224862c7641930c87679e98999d23c26113" as Address,

  // CCTP V2 (Arc domain = 26)
  CCTP_TOKEN_MESSENGER:    "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as Address,
  CCTP_MESSAGE_TRANSMITTER:"0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as Address,
  CCTP_TOKEN_MINTER:       "0xb43db544E2c27092c107639Ad201b3dEfAbcF192" as Address,

  // Gateway
  GATEWAY_WALLET: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as Address,
  GATEWAY_MINTER: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B" as Address,

  // StableFX
  FX_ESCROW: "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8" as Address,

  // Common
  MULTICALL3: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,
  PERMIT2:    "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
} as const;

export const ARC_DOMAIN = 26; // CCTP domain ID for Arc
export const ARC_EXPLORER = "https://testnet.arcscan.app";

// Minimal ERC-20 ABI
const ERC20_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint8" }] },
  { name: "symbol", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "string" }] },
] as const;

// ERC-4626 subset (USYC Teller implements this interface)
const ERC4626_ABI = [
  { name: "convertToAssets", type: "function", stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "convertToShares", type: "function", stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

/**
 * Fetch the latest Arc block with real data.
 */
export async function getLatestArcBlock() {
  try {
    const block = await arcPublicClient.getBlock({ blockTag: "latest" });
    return {
      number: Number(block.number),
      hash: block.hash as string,
      timestamp: Number(block.timestamp),
      txCount: block.transactions.length,
      gasUsed: Number(block.gasUsed),
    };
  } catch (err) {
    console.error("[arcClient] getLatestArcBlock:", err);
    return null;
  }
}

/**
 * Get USDC balance for an address (ERC-20, 6 decimals).
 */
export async function getUSDCBalance(address: Address): Promise<number> {
  try {
    const raw = await arcPublicClient.readContract({
      address: ARC_CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return Number(formatUnits(raw, 6));
  } catch (err) {
    console.error("[arcClient] getUSDCBalance:", err);
    return 0;
  }
}

/**
 * Get USYC balance for an address (6 decimals).
 */
export async function getUSYCBalance(address: Address): Promise<number> {
  try {
    const raw = await arcPublicClient.readContract({
      address: ARC_CONTRACTS.USYC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return Number(formatUnits(raw, 6));
  } catch (err) {
    console.error("[arcClient] getUSYCBalance:", err);
    return 0;
  }
}

/**
 * Get EURC balance for an address (6 decimals).
 */
export async function getEURCBalance(address: Address): Promise<number> {
  try {
    const raw = await arcPublicClient.readContract({
      address: ARC_CONTRACTS.EURC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return Number(formatUnits(raw, 6));
  } catch (err) {
    console.error("[arcClient] getEURCBalance:", err);
    return 0;
  }
}

/**
 * Read the live USDC/USYC conversion rate from the USYC Teller.
 * Returns how much USDC 1_000_000 USYC (1 USYC at 6 decimals) is worth.
 * Falls back to a known approximate rate (5.2% annualised) if Teller unavailable.
 */
export async function getLiveUSYCRate(): Promise<{ rate: number; source: "onchain" | "fallback" }> {
  try {
    const ONE_USYC = BigInt(1_000_000); // 1 USYC at 6 decimals
    const assetsRaw = await arcPublicClient.readContract({
      address: ARC_CONTRACTS.USYC_TELLER,
      abi: ERC4626_ABI,
      functionName: "convertToAssets",
      args: [ONE_USYC],
    });
    const rate = Number(formatUnits(assetsRaw, 6)); // USDC per USYC
    return { rate, source: "onchain" };
  } catch (err) {
    console.warn("[arcClient] Teller read failed, using fallback rate:", err);
    // ~5.2% APY => daily accrual makes 1 USYC slightly > 1 USDC
    return { rate: 1.0024, source: "fallback" };
  }
}

/**
 * Poll for a transaction receipt on Arc (sub-second finality).
 */
export async function waitForArcFinality(txHash: `0x${string}`) {
  const start = Date.now();
  const receipt = await arcPublicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 15_000,
    pollingInterval: 250, // Arc is fast
  });
  return {
    txHash: receipt.transactionHash,
    blockNumber: Number(receipt.blockNumber),
    confirmed: receipt.status === "success",
    finalityMs: Date.now() - start,
    explorerUrl: `${ARC_EXPLORER}/tx/${receipt.transactionHash}`,
  };
}

/**
 * Get multiple recent blocks for the Sequencer display.
 */
export async function getRecentArcBlocks(count = 5) {
  try {
    const latest = await arcPublicClient.getBlockNumber();
    const promises = [];
    for (let i = 0; i < count; i++) {
      const blockNum = latest - BigInt(i);
      if (blockNum < 0n) break;
      promises.push(
        arcPublicClient.getBlock({ blockNumber: blockNum }).catch(() => null)
      );
    }
    const blocks = await Promise.all(promises);
    return blocks
      .filter(Boolean)
      .map((b) => ({
        number: Number(b!.number),
        hash: b!.hash as string,
        timestamp: Number(b!.timestamp),
        txCount: b!.transactions.length,
      }));
  } catch (err) {
    console.error("[arcClient] getRecentArcBlocks:", err);
    return [];
  }
}
