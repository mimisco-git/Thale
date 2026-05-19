import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Activity, ShieldCheck, Globe, RefreshCw, TrendingUp } from "lucide-react";
import { Logo } from "./Logo";
import { agentOrchestrator } from "../services/AgentOrchestrator";
import { cn } from "../lib/utils";

export function ThalesReasoningEngine() {
  const [intent, setIntent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTrace, setLastTrace] = useState<any>(null);
  const [telemetryIndex, setTelemetryIndex] = useState(0);

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setTelemetryIndex(prev => prev + 1);
      }, 800);
      return () => clearInterval(interval);
    } else {
      setTelemetryIndex(0);
    }
  }, [isProcessing]);

  const handleExecute = async () => {
    if (!intent) return;
    setIsProcessing(true);
    setLastTrace(null);
    try {
      const plan = await agentOrchestrator.executeAutonomousSettlement(intent);
      setLastTrace(plan);
      setIntent("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 lg:space-y-12 h-full flex flex-col">
      <div className="bg-black text-white p-3 lg:p-4 flex items-center justify-center border-x-4 border-black">
        <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.4em] lg:tracking-[0.8em] text-center whitespace-nowrap">Thales // Thinking Market Participant [Trading-R1]</span>
      </div>

      <div className="flex-1 grid grid-cols-1 gap-0 border-[4px] border-black bg-white shadow-[16px_16px_0_rgba(0,0,0,0.05)] flex flex-col">
        <div className="p-8 lg:p-12 space-y-8 flex-1">
          <div className="flex items-start justify-between">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-black flex items-center justify-center p-3 lg:p-4 shadow-[12px_12px_0_rgba(0,122,255,0.1)]">
              <Logo className="text-white" />
            </div>
            <div className="flex gap-4 lg:gap-10">
              <div className="bg-brand-primary/5 p-3 lg:p-4 border-2 border-brand-primary/10">
                <ShieldCheck className="w-6 h-6 lg:w-8 lg:h-8 text-brand-primary" />
              </div>
              <div className="bg-brand-accent/5 p-3 lg:p-4 border-2 border-brand-accent/10">
                <Globe className="w-6 h-6 lg:w-8 lg:h-8 text-brand-accent" />
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:space-y-8">
            <div className="relative">
              <textarea 
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="E.G.: DEPOSIT 250K USDC TO USYC VAULT..."
                className="w-full bg-slate-50 border-[3px] border-black p-6 lg:p-8 font-black text-lg lg:text-xl uppercase placeholder:text-black/10 outline-none focus:bg-white transition-all min-h-[160px] leading-tight"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                    <div className="w-12 h-12 border-[4px] border-brand-primary border-t-transparent rounded-full animate-spin" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] block text-brand-primary">Thales Reasoning</span>
                      <AnimatePresence mode="wait">
                        <motion.span 
                          key={telemetryIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-[9px] font-bold text-black uppercase block h-4"
                        >
                          {["Scanning Substrate...", "Detecting Liquidity Gaps...", "Analyzing FX Peg Delta...", "Comparing Naive Route...", "Optimizing Yield...", "Locking Performance Bond..."][telemetryIndex % 6]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleExecute}
              disabled={isProcessing || !intent}
              className="w-full bg-brand-primary text-white py-6 font-black uppercase tracking-[0.3em] text-lg hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-30 group"
            >
              <Zap className="w-6 h-6 group-hover:fill-current" />
              Thinking Intent
            </button>
          </div>

          <AnimatePresence>
            {lastTrace && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-6 bg-slate-50 border-t-4 border-black space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Activity className="w-5 h-5 text-brand-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Reasoning Trace [VERIFIED]</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-[8px] font-black uppercase text-black/30 tracking-widest leading-none">Strategy</p>
                    <p className="text-xs font-bold text-black uppercase leading-tight">{lastTrace.reasoningTrace.strategy}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[8px] font-black uppercase text-black/30 tracking-widest leading-none">Yield</p>
                    <p className="text-xs font-bold text-brand-primary uppercase leading-tight">{lastTrace.reasoningTrace.yieldHarvesting}</p>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <p className="text-[8px] font-black uppercase text-black/30 tracking-widest leading-none">Thales Route</p>
                    <p className="text-[10px] font-mono font-bold text-black/60 uppercase break-all">{lastTrace.reasoningTrace.thalesRoute}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
