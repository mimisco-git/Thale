/**
 * TransactionMonitor.ts - Real viem finality monitoring on Arc Testnet.
 * Polls https://rpc.testnet.arc.network every 250ms (Arc is sub-second).
 */
import { createPublicClient, http, defineChain } from "viem";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  testnet: true,
});

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", { timeout: 15_000 }),
});

const ARC_EXPLORER = "https://testnet.arcscan.app";

export class TransactionMonitor {
  /**
   * Wait for a transaction to finalize on Arc.
   * Arc has deterministic sub-second finality.
   */
  async waitForFinality(txHash: string) {
    const hash = txHash as `0x${string}`;
    const start = Date.now();

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 15_000,
        pollingInterval: 250, // Arc is fast - poll every 250ms
      });

      const finalityMs = Date.now() - start;

      return {
        txHash: receipt.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        confirmed: receipt.status === "success",
        finalityMs,
        explorerUrl: `${ARC_EXPLORER}/tx/${receipt.transactionHash}`,
        network: "Arc Testnet (5042002)",
      };
    } catch (err) {
      const elapsed = Date.now() - start;
      throw new Error(`Finality timeout after ${elapsed}ms: ${err}`);
    }
  }

  /**
   * Get the current Arc block number.
   */
  async getCurrentBlock() {
    const blockNum = await publicClient.getBlockNumber();
    const block = await publicClient.getBlock({ blockNumber: blockNum });
    return {
      number: Number(block.number),
      hash: block.hash,
      timestamp: Number(block.timestamp),
      txCount: block.transactions.length,
      explorerUrl: `${ARC_EXPLORER}/block/${Number(block.number)}`,
    };
  }

  /**
   * Get transaction details.
   */
  async getTransaction(txHash: string) {
    try {
      const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        blockNumber: Number(tx.blockNumber ?? 0),
        explorerUrl: `${ARC_EXPLORER}/tx/${tx.hash}`,
      };
    } catch {
      return null;
    }
  }
}
