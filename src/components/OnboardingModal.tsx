/**
 * OnboardingModal.tsx
 * 3-step onboarding flow shown to new users.
 * Step 1: Welcome + explain Thales
 * Step 2: Run first intent
 * Step 3: See your trace on Arc
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight, Zap, ShieldCheck, TrendingUp, CheckCircle, ExternalLink } from "lucide-react";
import { auth } from "../lib/firebase";
import { agentOrchestrator } from "../services/AgentOrchestrator";
import { ARC_EXPLORER } from "../services/arcClient";
import { cn } from "../lib/utils";

const SAMPLE_INTENTS = [
  "Route 1000 USDC through USYC for maximum yield on Arc",
  "Detect EURC peg deviation and execute FX arbitrage",
  "Bridge 500 USDC from Arc to Base via CCTP",
];

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState(SAMPLE_INTENTS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [trace, setTrace] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;

  const runIntent = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const plan = await agentOrchestrator.executeAutonomousSettlement(intent);
      setTrace(plan);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Reasoning failed. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Welcome to Thales",
      subtitle: "The First Thinking Market Participant",
    },
    {
      number: 2,
      title: "Run Your First Intent",
      subtitle: "Tell Thales what to do with your capital",
    },
    {
      number: 3,
      title: "Trace Verified",
      subtitle: "Your reasoning is now on Arc",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border-[4px] border-black w-full max-w-2xl shadow-[24px_24px_0_rgba(0,0,0,0.15)] overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-black/5">
          <motion.div
            className="h-full bg-brand-primary"
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Header */}
        <div className="p-6 border-b-[3px] border-black flex items-center justify-between bg-black text-white">
          <div className="flex items-center gap-4">
            {steps.map((s) => (
              <div key={s.number} className={cn(
                "flex items-center gap-2 text-[9px] font-black uppercase transition-all",
                step === s.number ? "text-brand-primary" : step > s.number ? "text-white/40 line-through" : "text-white/20"
              )}>
                {step > s.number
                  ? <CheckCircle className="w-3 h-3 text-brand-primary" />
                  : <span className="w-4 h-4 border border-current rounded-full flex items-center justify-center text-[7px]">{s.number}</span>
                }
                <span className="hidden sm:block">{s.title}</span>
              </div>
            ))}
          </div>
          <button onClick={onComplete} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">

            {/* Step 1: Welcome */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">
                    The Agora is a<br />
                    <span className="text-brand-primary">self-correcting</span><br />
                    equilibrium.
                  </h2>
                  <p className="text-sm font-bold text-black/40 uppercase mt-4 leading-relaxed">
                    Thales is its reasoning layer. An autonomous agent that monitors Arc 24/7, detects yield opportunities, and routes your capital through Circle's USDC, USYC, and EURC — settling in under a second.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Zap, label: "Sub-second finality", desc: "Arc Testnet" },
                    { icon: TrendingUp, label: "USYC yield", desc: "~5.2% APY" },
                    { icon: ShieldCheck, label: "Slash-bonded", desc: "Performance bonds" },
                  ].map((item) => (
                    <div key={item.label} className="p-4 bg-slate-50 border-2 border-black/5 text-center">
                      <item.icon className="w-6 h-6 text-brand-primary mx-auto mb-2" />
                      <p className="text-[9px] font-black uppercase text-black">{item.label}</p>
                      <p className="text-[8px] font-bold text-black/30 uppercase">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {user && (
                  <p className="text-[10px] font-black uppercase text-black/40">
                    Signed in as {user.email?.split("@")[0]}
                  </p>
                )}

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-black text-white py-5 font-black uppercase tracking-[0.3em] hover:bg-brand-primary transition-all flex items-center justify-center gap-3"
                >
                  Start Reasoning
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* Step 2: Run intent */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Run Your First Intent</h2>
                  <p className="text-sm font-bold text-black/40 uppercase mt-2">
                    Tell Thales what to do. It will reason, route, and record the trace on Arc.
                  </p>
                </div>

                {/* Sample intents */}
                <div className="space-y-2">
                  <p className="text-[8px] font-black uppercase text-black/30 mb-2">Quick select:</p>
                  {SAMPLE_INTENTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setIntent(s)}
                      className={cn(
                        "w-full text-left p-3 text-[10px] font-bold uppercase border-2 transition-all",
                        intent === s ? "border-brand-primary bg-brand-primary/5 text-black" : "border-black/10 hover:border-black text-black/50"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <textarea
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  className="w-full border-[3px] border-black p-4 font-bold text-sm uppercase bg-slate-50 focus:bg-white outline-none min-h-[80px] resize-none"
                />

                {error && (
                  <div className="p-3 bg-red-50 border-2 border-red-200 text-[9px] font-black uppercase text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={runIntent}
                  disabled={isRunning || !intent.trim()}
                  className="w-full bg-brand-primary text-white py-5 font-black uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-40"
                >
                  {isRunning ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Thales Reasoning...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Execute Intent
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && trace && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Trace Verified</h2>
                    <p className="text-[10px] font-black uppercase text-black/30">Your reasoning is on Arc</p>
                  </div>
                </div>

                <div className="bg-black text-white p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1">Strategy</p>
                      <p className="text-[10px] font-bold text-white leading-snug">
                        {trace.reasoningTrace?.strategy || "Autonomous routing complete"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1">Alpha Generated</p>
                      <p className="text-2xl font-black font-mono text-brand-primary">
                        +{(trace.alphaGenerated || 0).toFixed(4)}
                        <span className="text-[10px] text-white/30 ml-1">USDC</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1">Naive Route</p>
                      <p className="text-[9px] font-bold text-white/50">{trace.reasoningTrace?.naiveRoute || "Capital stays idle"}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/30 mb-1">Thales Route</p>
                      <p className="text-[9px] font-bold text-brand-primary">{trace.reasoningTrace?.thalesRoute || "Optimized"}</p>
                    </div>
                  </div>

                  {trace.arcBlock && (
                    <a
                      href={`${ARC_EXPLORER}/block/${trace.arcBlock}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[8px] font-black uppercase text-brand-primary hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      Arc Block #{trace.arcBlock} · Rate: {trace.usycRate?.toFixed(4)}
                    </a>
                  )}
                </div>

                <button
                  onClick={onComplete}
                  className="w-full bg-black text-white py-5 font-black uppercase tracking-[0.3em] hover:bg-brand-primary transition-all"
                >
                  Enter the Agora
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
