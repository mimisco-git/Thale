/**
 * /api/circle-wallet - Creates real Circle Programmable Wallet per user.
 * Uses Circle sandbox API with CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET.
 * Falls back to deterministic address if keys not configured.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const CIRCLE_API = "https://api-sandbox.circle.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId required" });

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  // If Circle keys are configured, create a real wallet
  if (apiKey && entitySecret) {
    try {
      // Create wallet set if needed, then create wallet
      const idempotencyKey = `thales-${userId}-${Date.now()}`;

      // Create a developer-controlled wallet
      const walletRes = await fetch(`${CIRCLE_API}/v1/developer/wallets`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey,
          entitySecretCiphertext: entitySecret,
          wallets: [{
            blockchain: "ARC-TESTNET",
            count: 1,
            metadata: [{ name: `Thales-${userId.slice(0, 8)}`, refId: userId }],
          }],
        }),
      });

      if (walletRes.ok) {
        const data = await walletRes.json();
        const wallet = data?.data?.wallets?.[0];
        if (wallet) {
          return res.json({
            walletId: wallet.id,
            address: wallet.address,
            blockchain: wallet.blockchain,
            state: wallet.state,
            source: "circle-programmable-wallet",
            circleExplorer: `https://developers.circle.com/w3s/docs/programmable-wallets-create-your-first-wallet`,
          });
        }
      }
    } catch (err) {
      console.warn("[circle-wallet] Circle API error, using deterministic fallback:", err);
    }
  }

  // Deterministic fallback - consistent address from userId
  const hash = crypto.createHash("sha256").update(`thales-${userId}`).digest("hex");
  const address = `0x${hash.slice(0, 40)}`;

  return res.json({
    walletId: `thales-${userId.slice(0, 12)}`,
    address,
    blockchain: "ARC-TESTNET",
    state: "LIVE",
    source: "deterministic",
    note: "Add CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET to Vercel env vars for real Circle Programmable Wallets",
    arcExplorer: `https://testnet.arcscan.app/address/${address}`,
  });
}
