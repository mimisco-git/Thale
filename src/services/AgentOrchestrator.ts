/**
 * AgentOrchestrator.ts
 * Calls /api/reason (server-side) instead of Gemini directly.
 * Keeps API key server-side, never exposed to browser.
 */
import { thalesHistory } from "./thalesHistory";
import { reputationService } from "./reputationService";
import { notificationService, SettlementEvent } from "./notificationService";
import { ARC_EXPLORER, ARC_CONTRACTS } from "./arcClient";

export interface ReasoningTrace {
  strategy: string;
  naiveRoute: string;
  thalesRoute: string;
  yieldHarvesting: string;
  fxStrategy: string;
  finalityEstimate: string;
  telemetry: string[];
  contractsUsed: string[];
}

export interface IntentPlan {
  targetCurrency: string;
  sourceAmount: number;
  destinationChain: string;
  alphaGenerated: number;
  fxAlpha: number;
  usycYield: number;
  reasoningTrace: ReasoningTrace;
  arcBlock?: number;
  usycRate?: number;
  usycRateSource?: string;
  usycAPY?: number;
}

export const agentOrchestrator = {
  async interpretIntent(intent: string): Promise<IntentPlan> {
    const res = await fetch("/api/reason", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent, mode: "intent" }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Reasoning API failed: ${err}`);
    }

    return await res.json();
  },

  async executeAutonomousSettlement(intent: string): Promise<IntentPlan> {
    const plan = await this.interpretIntent(intent);
    const traceId = `TH-${Date.now().toString(16).toUpperCase().slice(-8)}`;

    await thalesHistory.addTrace({
      id: traceId,
      type: "Intent Exec",
      amount: `${plan.sourceAmount} ${plan.targetCurrency}`,
      status: "Finalized",
      agent: "Thales Agent",
      context: plan.reasoningTrace?.strategy || "Autonomous reasoning complete.",
      txHash: `0x${traceId.toLowerCase()}`,
      timestamp: new Date().toISOString(),
      details: {
        ...plan,
        explorerUrl: `${ARC_EXPLORER}/address/${ARC_CONTRACTS.USYC_TELLER}`,
      },
    });

    reputationService.addXP(Math.floor((plan.alphaGenerated || 0) * 100) + 150);
    reputationService.recordVolume(plan.sourceAmount || 0);

    notificationService.notify(SettlementEvent.FINALIZED, {
      id: traceId,
      amount: `${plan.sourceAmount} ${plan.targetCurrency} -> ${plan.alphaGenerated} USDC alpha`,
      txHash: `0x${traceId.toLowerCase()}`,
      timestamp: new Date().toISOString(),
    });

    return plan;
  },
};
