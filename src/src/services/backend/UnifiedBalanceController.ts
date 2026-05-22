/**
 * UnifiedBalanceController.ts
 * Real multi-chain USDC balance aggregation via viem.
 * Arc + public Ethereum/Base RPCs.
 */
import { createPublicClient, http, defineChain, formatUnits, type Address } from "viem";
import { base, mainnet } from "viem/chains";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

const BALANCE_OF_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Contract addresses per network
const USDC_ADDRESSES = {
  arc:      "0x3600000000000000000000000000000000000000" as Address,
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address, // USDC mainnet
  base:     "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address, // USDC on Base
} as const;

const USYC_ARC   = "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C" as Address;
const EURC_ARC   = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address;

const clients = {
  arc: createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network", { timeout: 8_000 }) }),
  ethereum: createPublicClient({ chain: mainnet, transport: http("https://eth.public-rpc.com", { timeout: 8_000 }) }),
  base: createPublicClient({ chain: base, transport: http("https://mainnet.base.org", { timeout: 8_000 }) }),
};

async function readBalance(client: typeof clients.arc, tokenAddr: Address, userAddr: Address, decimals = 6): Promise<number> {
  try {
    const raw = await client.readContract({
      address: tokenAddr,
      abi: BALANCE_OF_ABI,
      functionName: "balanceOf",
      args: [userAddr],
    });
    return Number(formatUnits(raw, decimals));
  } catch {
    return 0;
  }
}

export class UnifiedBalanceController {
  async getUnifiedBalance(userAddress: string) {
    const addr = (userAddress || "0x0000000000000000000000000000000000000000") as Address;

    const [arcUsdc, ethUsdc, baseUsdc, arcUsyc, arcEurc] = await Promise.allSettled([
      readBalance(clients.arc, USDC_ADDRESSES.arc, addr, 6),
      readBalance(clients.ethereum, USDC_ADDRESSES.ethereum, addr, 6),
      readBalance(clients.base, USDC_ADDRESSES.base, addr, 6),
      readBalance(clients.arc, USYC_ARC, addr, 6),
      readBalance(clients.arc, EURC_ARC, addr, 6),
    ]);

    const arcBal  = arcUsdc.status  === "fulfilled" ? arcUsdc.value  : 0;
    const ethBal  = ethUsdc.status  === "fulfilled" ? ethUsdc.value  : 0;
    const baseBal = baseUsdc.status === "fulfilled" ? baseUsdc.value : 0;
    const usycBal = arcUsyc.status  === "fulfilled" ? arcUsyc.value  : 0;
    const eurcBal = arcEurc.status  === "fulfilled" ? arcEurc.value  : 0;

    return {
      totalUSDC: arcBal + ethBal + baseBal,
      usdyc: usycBal,
      eurc: eurcBal,
      breakdown: [
        { network: "Arc Testnet (5042002)", balance: arcBal,  currency: "USDC" },
        { network: "Ethereum",              balance: ethBal,  currency: "USDC" },
        { network: "Base",                  balance: baseBal, currency: "USDC" },
        { network: "Arc Testnet (USYC)",    balance: usycBal, currency: "USYC" },
        { network: "Arc Testnet (EURC)",    balance: eurcBal, currency: "EURC" },
      ],
    };
  }

  async executeUnifiedTransfer(amount: number, destinationDomain: number, recipient: string) {
    // Production: Use GatewayController.generateBurnIntent() for cross-chain
    // For same-chain: walletClient.writeContract({ address: USDC, functionName: 'transfer', ... })
    return {
      sourceTx: null,
      destTx: null,
      note: "Configure ARC_PRIVATE_KEY to enable on-chain transfers",
      amount,
      destinationDomain,
      recipient,
      status: "requires_private_key",
    };
  }
}
