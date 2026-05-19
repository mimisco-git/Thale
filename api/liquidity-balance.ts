import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createPublicClient, http, defineChain, formatUnits, type Address } from "viem";
import { base, mainnet } from "viem/chains";

const arcTestnet = defineChain({ id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 }, rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } }, testnet: true });
const BALANCE_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] }] as const;
const clients = {
  arc: createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network", { timeout: 8_000 }) }),
  ethereum: createPublicClient({ chain: mainnet, transport: http("https://eth.public-rpc.com", { timeout: 8_000 }) }),
  base: createPublicClient({ chain: base, transport: http("https://mainnet.base.org", { timeout: 8_000 }) }),
};
const ADDRS = {
  USDC_ARC: "0x3600000000000000000000000000000000000000" as Address,
  USDC_ETH: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
  USDC_BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
  USYC: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C" as Address,
  EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as Address,
};

async function bal(c: any, addr: Address, user: Address) {
  try { return Number(formatUnits(await c.readContract({ address: addr, abi: BALANCE_ABI, functionName: "balanceOf", args: [user] }), 6)); } catch { return 0; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const address = (req.query.address as string || "0x0000000000000000000000000000000000000000") as Address;
  const [arcUsdc, ethUsdc, baseUsdc, usyc, eurc] = await Promise.allSettled([
    bal(clients.arc, ADDRS.USDC_ARC, address),
    bal(clients.ethereum, ADDRS.USDC_ETH, address),
    bal(clients.base, ADDRS.USDC_BASE, address),
    bal(clients.arc, ADDRS.USYC, address),
    bal(clients.arc, ADDRS.EURC, address),
  ]);
  const v = (r: any) => r.status === "fulfilled" ? r.value : 0;
  return res.json({
    totalUSDC: v(arcUsdc) + v(ethUsdc) + v(baseUsdc),
    usdyc: v(usyc), eurc: v(eurc),
    breakdown: [
      { network: "Arc Testnet", balance: v(arcUsdc), currency: "USDC" },
      { network: "Ethereum", balance: v(ethUsdc), currency: "USDC" },
      { network: "Base", balance: v(baseUsdc), currency: "USDC" },
      { network: "Arc Testnet", balance: v(usyc), currency: "USYC" },
      { network: "Arc Testnet", balance: v(eurc), currency: "EURC" },
    ],
  });
}
