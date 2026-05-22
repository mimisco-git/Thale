/**
 * AgentActivity.tsx
 * Real-time display of the autonomous Thales agent decisions.
 * Subscribes to the autonomousAgent singleton and shows live decisions.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Zap, ShieldCheck, TrendingUp, Clock, ExternalLink } from "lucide-react";
import { autonomousAgent, type AgentCycleResult, type AgentAction } from "../services/autonomousAgent";
import { cn } from "../lib/utils";
import { ARC_EXPLORER } from "../services/arcClient";

const ACTION_CONFIG: Record<AgentAction, { label: string; color: string; icon: React.ElementType }> = {
  HARVEST_YIELD: { label: "Yield Harvest", color: "text-green-600 bg-green-50 border-green-200", icon: TrendingUp },
  REBALANCE_TO_EURC: { label: "Rebalance EURC", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Zap },
  REBALANCE_TO_USDC: { label: "Rebalance USDC", color: "text-purple-600 bg-purple-50 border-purple-200", icon: Zap },
  CCTP_BRIDGE: { label: "CCTP Bridge", color: "text-orange-600 bg-orange-50 border-orange-200", icon: Zap },
  HOLD: { label: "Hold", color: "text-black/40 bg-slate-50 border-black/10", icon: ShieldCheck },
};

export function AgentActivity() {
  const [cycles, setCycles] = useState<AgentCycleResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nextCycleIn, setNextCycleIn] = useState(60);

  useEffect(() => {
    // Subscribe to agent events
    const unsub = autonomousAgent.subscribe((event) => {
      setCycles((prev) => [event, ...prev].slice(0, 10));
      setNextCycleIn(60); // reset countdown
    });

    // Countdown timer
    const countdown = setInterval(() => {
      setNextCycleIn((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1_000);

    // Start the agent if not running
    if (!autonomousAgent.isRunning()) {
      autonomousAgent.start();
    }
    setIsRunning(true);

    return () => {
      unsub();
      clearInterval(countdown);
    };
  }, []);

  const lastCycle = autonomousAgent.getLastCycle();

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-5 h-5 text-brand-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-primary rounded-full animate-ping" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">
            Autonomous Agent
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase text-white/40">
            <Clock className="w-3 h-3" />
            <span>Next cycle: {nextCycleIn}s</span>
          </div>
          <div className={cn("px-2 py-1 text-[8px] font-black uppercase",
            isRunning ? "bg-brand-primary text-white" : "bg-white/10 text-white/40"
          )}>
            {isRunning ? "Running" : "Stopped"}
          </div>
        </div>
      </div>

      {/* Live Stats Bar */}
      {lastCycle && (
        <div className="grid grid-cols-3 border-b-[2px] border-black/10">
          <div className="p-3 border-r border-black/10">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Arc Block</p>
            <p className="text-sm font-black font-mono">
              #{lastCycle.state.arcBlock?.number?.toLocaleString() ?? "N/A"}
            </p>
          </div>
          <div className="p-3 border-r border-black/10">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">USYC Rate</p>
            <p className="text-sm font-black font-mono text-brand-primary">
              {lastCycle.state.usycRate.toFixed(4)}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">USYC APY</p>
            <p className="text-sm font-black font-mono text-green-600">
              ~{lastCycle.state.usycAPY.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Cycle Feed */}
      <div className="max-h-[480px] overflow-y-auto">
        {cycles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-[3px] border-black border-dashed flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Brain className="w-8 h-8 text-black/20" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/30">
              Agent reasoning...
            </p>
            <p className="text-[9px] font-bold text-black/20 mt-1">
              First decision in {nextCycleIn}s
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {cycles.map((cycle, idx) => {
              const cfg = ACTION_CONFIG[cycle.decision.action];
              const Icon = cfg.icon;
              const isExpanded = expandedId === cycle.id;
              const isLatest = idx === 0;

              return (
                <motion.div
                  key={cycle.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setExpandedId(isExpanded ? null : cycle.id)}
                  className={cn(
                    "p-5 border-b border-black/5 cursor-pointer hover:bg-slate-50 transition-colors",
                    isLatest && "bg-brand-primary/3 border-l-4 border-l-brand-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex items-center gap-1.5 px-2 py-1 border text-[9px] font-black uppercase", cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </div>
                      <span className="text-[8px] font-mono text-black/30">{cycle.id}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[9px] font-black font-mono text-brand-primary">
                        +{cycle.decision.estimatedAlpha.toFixed(4)} USDC
                      </p>
                      <p className="text-[8px] text-black/30">
                        {new Date(cycle.timestamp).toLocaleTimeString([], { hour12: false })}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-black/70 leading-snug">
                    {cycle.decision.reasoning}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-primary transition-all"
                        style={{ width: `${cycle.decision.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-black text-black/30 uppercase">
                      {(cycle.decision.confidence * 100).toFixed(0)}% conf
                    </span>
                    {cycle.executed && cycle.txHash && (
                      <a
                        href={cycle.explorerUrl || `${ARC_EXPLORER}/tx/${cycle.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[8px] font-black text-brand-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        On-chain
                      </a>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-black/10 space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Naive Route</p>
                            <p className="text-[10px] font-bold text-black/60">{cycle.decision.naiveRoute}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Thales Route</p>
                            <p className="text-[10px] font-bold text-black">{cycle.decision.thalesRoute}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[8px] font-black uppercase text-black/30 mb-2">Execution Plan</p>
                          <div className="space-y-1">
                            {cycle.decision.executionPlan.map((step, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-[8px] font-black text-brand-primary mt-0.5">{i + 1}.</span>
                                <p className="text-[9px] font-bold text-black/60">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[8px] font-black uppercase">
                          <span className="text-black/30">Risk: {cycle.decision.riskNotes}</span>
                          {cycle.state.arcBlock && (
                            <a
                              href={`${ARC_EXPLORER}/block/${cycle.state.arcBlock.number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-brand-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              Block #{cycle.state.arcBlock.number}
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
