import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const arcTestnet = defineChain({
  id: 5042002, name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, estimatedAlpha, arcBlock } = req.body;
  const pk = process.env.ARC_PRIVATE_KEY as `0x${string}` | undefined;

  if (!pk) {
    return res.json({
      executed: false, action,
      note: "Decision recorded. Add ARC_PRIVATE_KEY in Vercel env vars for on-chain execution.",
      estimatedAlpha, arcBlock, timestamp: new Date().toISOString(),
    });
  }

  try {
    const account = privateKeyToAccount(pk);
    const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http("https://rpc.testnet.arc.network") });
    const publicClient = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network") });

    const txHash = await walletClient.sendTransaction({ to: account.address, value: 0n, data: "0x" });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 15_000, pollingInterval: 250 });

    return res.json({
      executed: true, action, txHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber),
      explorerUrl: `https://testnet.arcscan.app/tx/${receipt.transactionHash}`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, executed: false });
  }
}
