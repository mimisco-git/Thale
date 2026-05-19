import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.json({ note: "Traction tracked live in Firestore client-side", chainId: 5042002, arcRpc: "https://rpc.testnet.arc.network" });
}
