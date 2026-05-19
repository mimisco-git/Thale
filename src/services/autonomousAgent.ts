/**
 * autonomousAgent.ts
 * Calls /api/reason server-side for Gemini decisions.
 * API key stays server-side, never in the browser bundle.
 */
import { getLatestArcBlock, getLiveUSYCRate } from "./arcClient";
import { thalesHistory } from "./thalesHistory";
import { reputationService } from "./reputationService";
import { notificationService, SettlementEvent } from "./notificationService";

export type AgentAction = "HARVEST_YIELD" | "REBALANCE_TO_EURC" | "REBALANCE_TO_USDC" | "HOLD" | "CCTP_BRIDGE";

export interface MarketState {
  arcBlock: { number: number; hash: string; txCount: number; timestamp: number } | null;
  usycRate: number;
  usycAPY: number;
  usycRateSource: string;
  eurcUsdcSpread: number;
  timestamp: string;
  blockFinality: string;
}

export interface AgentDecision {
  action: AgentAction;
  confidence: number;
  reasoning: string;
  naiveRoute: string;
  thalesRoute: string;
  yieldCapture?: string;
  estimatedAlpha: number;
  executionPlan: string[];
  riskNotes: string;
}

export interface AgentCycleResult {
  id: string;
  state: MarketState;
  decision: AgentDecision;
  executed: boolean;
  txHash?: string;
  explorerUrl?: string;
  timestamp: string;
  finalityMs?: number;
}

type AgentListener = (event: AgentCycleResult) => void;

class ThalesAutonomousAgent {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private cycleCount = 0;
  private listeners: AgentListener[] = [];
  private lastCycle: AgentCycleResult | null = null;
  private readonly CYCLE_MS = 60_000;

  start() {
    if (this.running) return;
    this.running = true;
    console.log("[Thales Agent] Started. Cycle:", this.CYCLE_MS / 1000, "s");
    this.runCycle();
    this.intervalId = setInterval(() => this.runCycle(), this.CYCLE_MS);
  }

  stop() {
    this.running = false;
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    console.log("[Thales Agent] Stopped after", this.cycleCount, "cycles.");
  }

  isRunning() { return this.running; }
  getLastCycle() { return this.lastCycle; }

  subscribe(cb: AgentListener) {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  private emit(event: AgentCycleResult) {
    this.listeners.forEach((l) => l(event));
  }

  private async runCycle() {
    this.cycleCount++;
    const cycleId = `AUTO-${Date.now().toString(16).toUpperCase().slice(-6)}`;
    console.log(`[Thales Agent] Cycle #${this.cycleCount} (${cycleId})`);

    try {
      const [blockResult, rateResult] = await Promise.allSettled([
        getLatestArcBlock(),
        getLiveUSYCRate(),
      ]);

      const arcBlock = blockResult.status === "fulfilled" ? blockResult.value : null;
      const { rate: usycRate, source: rateSource } =
        rateResult.status === "fulfilled" ? rateResult.value : { rate: 1.0024, source: "fallback" };

      const impliedAPY = parseFloat(((usycRate - 1) * 365 * 100).toFixed(2));

      const state: MarketState = {
        arcBlock,
        usycRate,
        usycAPY: impliedAPY,
        usycRateSource: rateSource,
        eurcUsdcSpread: 0.0821,
        timestamp: new Date().toISOString(),
        blockFinality: arcBlock ? "sub-second" : "unavailable",
      };

      // Call server-side reasoning endpoint
      const decision = await this.askServer(state, cycleId);

      // Execute if not HOLD
      let executed = false;
      let txHash: string | undefined;
      let finalityMs: number | undefined;
      let explorerUrl: string | undefined;

      if (decision.action !== "HOLD" && decision.action !== undefined) {
        try {
          const start = Date.now();
          const res = await fetch("/api/agent-execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: decision.action,
              estimatedAlpha: decision.estimatedAlpha,
              usycRate,
              arcBlock: arcBlock?.number,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            executed = data.executed || false;
            txHash = data.txHash;
            explorerUrl = data.explorerUrl;
            finalityMs = Date.now() - start;
          }
        } catch (e) {
          console.warn("[Thales Agent] Execution skipped:", e);
        }
      }

      const result: AgentCycleResult = {
        id: cycleId, state, decision, executed,
        txHash, explorerUrl, finalityMs,
        timestamp: new Date().toISOString(),
      };

      this.lastCycle = result;

      await thalesHistory.addTrace({
        id: cycleId,
        type: `Autonomous: ${decision.action}`,
        amount: `${decision.estimatedAlpha.toFixed(4)} USDC alpha`,
        status: executed ? "Finalized" : "Reasoned",
        agent: "Thales Autonomous Agent",
        context: decision.reasoning,
        txHash: txHash || `0x${cycleId.toLowerCase()}`,
        timestamp: new Date().toISOString(),
        details: result,
      });

      reputationService.addXP(Math.floor(decision.estimatedAlpha * 50) + 100);
      if (executed) {
        reputationService.recordVolume(decision.estimatedAlpha);
        notificationService.notify(SettlementEvent.FINALIZED, {
          id: cycleId,
          amount: `${decision.estimatedAlpha.toFixed(4)} USDC alpha`,
          txHash: txHash || cycleId,
          timestamp: new Date().toISOString(),
        });
      }

      this.emit(result);
    } catch (err) {
      console.error("[Thales Agent] Cycle error:", err);
    }
  }

  private async askServer(state: MarketState, cycleId: string): Promise<AgentDecision> {
    try {
      const res = await fetch("/api/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: `Autonomous cycle ${cycleId}. Block #${state.arcBlock?.number}. USYC rate ${state.usycRate} (APY ~${state.usycAPY}%). EURC spread ${state.eurcUsdcSpread}.`,
          mode: "autonomous",
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      return {
        action: data.action || "HOLD",
        confidence: Math.min(1, Math.max(0, data.confidence || 0)),
        reasoning: data.reasoning || "No reasoning returned.",
        naiveRoute: data.naiveRoute || "Capital sits idle.",
        thalesRoute: data.thalesRoute || "Hold position.",
        yieldCapture: data.yieldCapture || "None this cycle.",
        estimatedAlpha: Math.max(0, data.estimatedAlpha || 0),
        executionPlan: Array.isArray(data.executionPlan) ? data.executionPlan : [],
        riskNotes: data.riskNotes || "Standard market risk.",
      };
    } catch (err) {
      console.warn("[Thales Agent] Server reasoning failed, defaulting to HOLD:", err);
      return {
        action: "HOLD",
        confidence: 0.3,
        reasoning: "Server reasoning unavailable. Defaulting to HOLD.",
        naiveRoute: "Capital stays in USDC.",
        thalesRoute: "Hold until connectivity restored.",
        estimatedAlpha: 0,
        executionPlan: ["Monitor Arc blocks", "Await server response", "Retry next cycle"],
        riskNotes: "API connectivity issue.",
      };
    }
  }
}

export const autonomousAgent = new ThalesAutonomousAgent();
