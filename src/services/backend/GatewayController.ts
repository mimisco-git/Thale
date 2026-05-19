/**
 * GatewayController.ts - Real CCTP + Gateway integration.
 * Uses actual Arc Testnet contract addresses.
 * Chain ID: 5042002 | Domain: 26
 */
import { createPublicClient, createWalletClient, http, defineChain, parseUnits, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import axios from "axios";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

// Official Arc Testnet CCTP contracts
const TOKEN_MESSENGER_V2 = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as const;
const USDC_ADDRESS      = "0x3600000000000000000000000000000000000000" as const;
const GATEWAY_WALLET    = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;
const ARC_EXPLORER      = "https://testnet.arcscan.app";

// CCTP TokenMessengerV2 ABI - depositForBurn
const CCTP_ABI = [
  {
    name: "depositForBurn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount",            type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient",     type: "bytes32" },
      { name: "burnToken",         type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee",            type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [{ name: "nonce", type: "uint64" }],
  },
] as const;

// ERC-20 approve ABI
const APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

function getWalletClient() {
  const pk = process.env.ARC_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) throw new Error("ARC_PRIVATE_KEY not configured");

  const account = privateKeyToAccount(pk);
  return {
    walletClient: createWalletClient({ account, chain: arcTestnet, transport: http("https://rpc.testnet.arc.network") }),
    publicClient: createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network") }),
    account,
  };
}

/**
 * Burn USDC on Arc via CCTP V2 (domain 26 -> destination domain).
 */
export class GatewayController {
  async generateBurnIntent(
    amount: number,
    destinationDomain: number,
    recipientAddress: string
  ) {
    let { walletClient, publicClient, account } = getWalletClient();
    const amountRaw = parseUnits(amount.toString(), 6);

    // Step 1: Approve TokenMessengerV2 to spend USDC
    const approveHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: APPROVE_ABI,
      functionName: "approve",
      args: [TOKEN_MESSENGER_V2, amountRaw],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 10_000 });

    // Step 2: depositForBurn
    const mintRecipientPadded = `0x${recipientAddress.replace("0x", "").padStart(64, "0")}` as `0x${string}`;
    const zeroPadded = `0x${"0".repeat(64)}` as `0x${string}`;

    const burnHash = await walletClient.writeContract({
      address: TOKEN_MESSENGER_V2,
      abi: CCTP_ABI,
      functionName: "depositForBurn",
      args: [
        amountRaw,
        destinationDomain,
        mintRecipientPadded,
        USDC_ADDRESS,
        zeroPadded,       // destinationCaller = any
        BigInt(0),        // maxFee = no limit
        2000,             // minFinalityThreshold
      ],
    });

    return {
      burnTxHash: burnHash,
      intentId: `burn_${Date.now()}`,
      status: "initiated",
      explorerUrl: `${ARC_EXPLORER}/tx/${burnHash}`,
    };
  }

  /**
   * Poll Circle's CCTP Iris attestation API (sandbox).
   */
  async fetchAttestation(messageHash: string) {
    const MAX_ATTEMPTS = 30;
    const POLL_MS = 5_000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const { data } = await axios.get(
          `https://iris-api-sandbox.circle.com/v1/attestations/${messageHash}`,
          { timeout: 10_000 }
        );
        if (data.status === "complete") {
          return { attestation: data.attestation, status: "complete" };
        }
      } catch (err: any) {
        if (err.response?.status !== 404) throw err;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    throw new Error("Attestation timeout after 2.5 minutes");
  }

  async executeDestinationMint(attestation: string, messageBytes: string) {
    // messageTransmitter.receiveMessage(messageBytes, attestation)
    // Requires destination chain client - handled by the recipient network
    return {
      status: "ready_for_mint",
      note: "Submit to MessageTransmitter on destination chain",
      messageBytes,
      attestation,
    };
  }
}
