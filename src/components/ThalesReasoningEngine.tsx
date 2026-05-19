import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Activity, ShieldCheck, Globe, AlertTriangle, ExternalLink } from "lucide-react";
import { Logo } from "./Logo";
import { agentOrchestrator } from "../services/AgentOrchestrator";
import { ARC_EXPLORER } from "../services/arcClient";
import { cn } from "../lib/utils";

export function ThalesReasoningEngine() {
  const [intent, setIntent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTrace, setLastTrace] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [telemetryIndex, setTelemetryIndex] = useState(0);

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => setTelemetryIndex((p) => p + 1), 800);
      return () => clearInterval(interval);
    } else {
      setTelemetryIndex(0);
    }
  }, [isProcessing]);

  const handleExecute = async () => {
    if (!intent.trim()) return;
    setIsProcessing(true);
    setLastTrace(null);
    setError(null);

    try {
      const plan = await agentOrchestrator.executeAutonomousSettlement(intent);
      setLastTrace(plan);
      setIntent("");
    } catch (err: any) {
      console.error("[ThalesEngine]", err);
      setError(err.message || "Reasoning failed. Check that GEMINI_API_KEY is set in Vercel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const STEPS = [
    "Scanning Arc substrate...",
    "Detecting liquidity gaps...",
    "Analysing FX peg delta...",
    "Comparing naive route...",
    "Optimising yield path...",
    "Locking performance bond...",
  ];

  return (
    <div className="space-y-0 h-full flex flex-col">
      <div className="bg-black text-white p-3 flex items-center justify-center">
        <span className="text-[9px] font-black uppercase tracking-[0.6em]">
          Thales // Trading-R1 Reasoning Engine
        </span>
      </div>

      <div className="flex-1 border-[3px] border-black bg-white shadow-[16px_16px_0_rgba(0,0,0,0.05)] flex flex-col">
        <div className="p-8 space-y-6 flex-1">
          <div className="flex items-start justify-between">
            <div className="w-16 h-16 bg-black flex items-center justify-center p-3">
              <Logo className="text-white" />
            </div>
            <div className="flex gap-4">
              <div className="bg-brand-primary/5 p-3 border-2 border-brand-primary/10">
                <ShieldCheck className="w-7 h-7 text-brand-primary" />
              </div>
              <div className="bg-black/5 p-3 border-2 border-black/10">
                <Globe className="w-7 h-7 text-black/40" />
              </div>
            </div>
          </div>

          <div className="relative">
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="E.G.: DEPOSIT 50K USDC TO USYC VAULT FOR YIELD..."
              className="w-full bg-slate-50 border-[3px] border-black p-6 font-black text-lg uppercase placeholder:text-black/10 outline-none focus:bg-white transition-all min-h-[140px] leading-tight resize-none"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-white/95 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-10 h-10 border-[4px] border-brand-primary border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest block text-brand-primary">
                      Thales Reasoning
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={telemetryIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-[9px] font-bold text-black/50 uppercase block"
                      >
                        {STEPS[telemetryIndex % STEPS.length]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase text-red-600 mb-1">Reasoning Failed</p>
                <p className="text-[9px] font-mono text-red-500 leading-snug">{error}</p>
                <p className="text-[8px] text-red-400 mt-2">
                  Check that GEMINI_API_KEY is valid at{" "}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                    aistudio.google.com/apikey
                  </a>
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={isProcessing || !intent.trim()}
            className="w-full bg-brand-primary text-white py-5 font-black uppercase tracking-[0.3em] text-lg hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-30"
          >
            <Zap className="w-5 h-5" />
            Thinking Intent
          </button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {lastTrace && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-6 bg-slate-50 border-t-4 border-black space-y-5"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-brand-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-black/60">
                  Reasoning Trace [Verified]
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase text-black/30 mb-1">Strategy</p>
                  <p className="text-[10px] font-bold text-black uppercase leading-tight">
                    {lastTrace.reasoningTrace?.strategy || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-black/30 mb-1">Alpha Generated</p>
                  <p className="text-[10px] font-black font-mono text-brand-primary">
                    +{(lastTrace.alphaGenerated || 0).toFixed(4)} USDC
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-black/30 mb-1">Naive Route</p>
                  <p className="text-[10px] font-bold text-black/50 uppercase leading-tight">
                    {lastTrace.reasoningTrace?.naiveRoute || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-black/30 mb-1">Thales Route</p>
                  <p className="text-[10px] font-bold text-black uppercase leading-tight">
                    {lastTrace.reasoningTrace?.thalesRoute || "N/A"}
                  </p>
                </div>
              </div>

              {lastTrace.reasoningTrace?.telemetry?.length > 0 && (
                <div>
                  <p className="text-[8px] font-black uppercase text-black/30 mb-2">Execution Plan</p>
                  <div className="space-y-1">
                    {lastTrace.reasoningTrace.telemetry.map((step: string, i: number) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-[8px] font-black text-brand-primary">{i + 1}.</span>
                        <p className="text-[9px] font-bold text-black/60">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lastTrace.arcBlock && (
                <a
                  href={`${ARC_EXPLORER}/block/${lastTrace.arcBlock}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[8px] font-black uppercase text-brand-primary hover:text-black transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Arc Block #{lastTrace.arcBlock} · USYC Rate: {lastTrace.usycRate?.toFixed(4)}
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
