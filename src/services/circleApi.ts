/**
 * circleApi.ts
 * Client-side wrapper that calls the backend /api/* endpoints,
 * which in turn call Circle APIs with protected keys server-side.
 *
 * All methods gracefully degrade when Circle keys are not configured.
 */

const API_BASE = typeof window !== "undefined" ? "" : "http://localhost:3000";

export interface WalletInfo {
  walletId: string;
  address: string;
  status: string;
  source: "circle" | "deterministic";
}

export interface CCTPBurnResult {
  burnTxHash: string;
  messageHash: string;
  intentId: string;
  status: string;
  explorerUrl: string;
}

export interface AttestationResult {
  status: "pending" | "complete" | "error";
  attestation?: string;
}

export interface FXQuote {
  quoteId: string;
  baseCurrency: string;
  quoteCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  expiresAt: number;
  fee: number;
  source: "stablefx" | "calculated";
}

export interface UnifiedBalance {
  total: number;
  networks: {
    arc: number;
    ethereum: number;
    base: number;
  };
  usdyc: number;
  eurc: number;
}

/**
 * Create or retrieve a Circle wallet for a user.
 * Uses deterministic address derived from userId if Circle API unavailable.
 */
export async function getOrCreateWallet(userId: string): Promise<WalletInfo> {
  try {
    const res = await fetch(`${API_BASE}/api/circle/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[circleApi] Circle wallet unavailable, using deterministic address:", err);
    // Deterministic address from userId (for demo without Circle key)
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
    const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return {
      walletId: `demo-${userId.slice(0, 8)}`,
      address: `0x${hex.slice(0, 40)}`,
      status: "active",
      source: "deterministic",
    };
  }
}

/**
 * Get USYC live rate from the backend (which queries Arc Teller contract).
 */
export async function fetchUSYCRate(): Promise<{ rate: number; source: string; apy: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/usyc/rate`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[circleApi] USYC rate fetch failed:", err);
    return { rate: 1.0024, source: "fallback", apy: 5.2 };
  }
}

/**
 * Get a StableFX RFQ quote for USDC to USYC conversion.
 */
export async function getStableFXQuote(amount: number, from = "USDC", to = "USYC"): Promise<FXQuote> {
  try {
    const res = await fetch(`${API_BASE}/api/fx/rfq?amount=${amount}&from=${from}&to=${to}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[circleApi] RFQ failed, calculating locally:", err);
    const rate = to === "USYC" ? 1.0024 : 0.9976;
    return {
      quoteId: `local-${Date.now()}`,
      baseCurrency: from,
      quoteCurrency: to,
      fromAmount: amount,
      toAmount: parseFloat((amount * rate).toFixed(6)),
      rate,
      expiresAt: Date.now() + 60_000,
      fee: amount * 0.0001,
      source: "calculated",
    };
  }
}

/**
 * Execute a CCTP burn on Arc (source) to bridge USDC to another chain.
 */
export async function initiateCCTPBurn(
  amount: number,
  destinationDomain: number,
  recipientAddress: string
): Promise<CCTPBurnResult> {
  const res = await fetch(`${API_BASE}/api/cctp/burn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, destinationDomain, recipientAddress }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CCTP burn failed: ${err}`);
  }
  return await res.json();
}

/**
 * Poll the CCTP attestation for a burn message.
 */
export async function pollAttestation(messageHash: string): Promise<AttestationResult> {
  // Circle Iris API (sandbox) - public, no auth needed
  const irisUrl = `https://iris-api-sandbox.circle.com/v1/attestations/${messageHash}`;
  try {
    const res = await fetch(irisUrl);
    if (res.status === 404) return { status: "pending" };
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    return {
      status: data.status === "complete" ? "complete" : "pending",
      attestation: data.attestation,
    };
  } catch (err) {
    return { status: "error" };
  }
}

/**
 * Get unified balance across chains (reads from Arc RPC + Circle API).
 */
export async function getUnifiedBalance(walletAddress: string): Promise<UnifiedBalance> {
  try {
    const res = await fetch(`${API_BASE}/api/liquidity/balance?address=${walletAddress}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[circleApi] Balance fetch failed:", err);
    return {
      total: 0,
      networks: { arc: 0, ethereum: 0, base: 0 },
      usdyc: 0,
      eurc: 0,
    };
  }
}

/**
 * Settle a StableFX RFQ (USDC <> USYC via FxEscrow).
 */
export async function settleRFQ(quoteId: string): Promise<{ txHash: string; explorerUrl: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/fx/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteId }),
  });
  if (!res.ok) throw new Error(`Settlement failed: ${await res.text()}`);
  return await res.json();
}

/**
 * Get global traction metrics (all users, from Firestore aggregate).
 */
export async function getGlobalTraction() {
  try {
    const res = await fetch(`${API_BASE}/api/traction`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { userCount: 0, totalVolume: 0, txCount: 0, activeAgents: 0 };
  }
}
