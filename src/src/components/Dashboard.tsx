import { cn } from "../lib/utils";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { notificationService, SettlementEvent } from "../services/notificationService";
import { Sequencer } from "./Sequencer";
import { reputationService } from "../services/reputationService";
import { auth, loginWithGoogle } from "../lib/firebase";
import { MarketIntelligence } from "./MarketIntelligence";
import { StrategicVaults } from "./StrategicVaults";
import { ThalesReasoningEngine } from "./ThalesReasoningEngine";
import { StableFXRFQ } from "./StableFXRFQ";
import { ThalesMonitor } from "./ThalesMonitor";
import { UnifiedBalanceSidebar } from "./UnifiedBalanceSidebar";
import { AgentActivity } from "./AgentActivity";
import { TractionBoard } from "./TractionBoard";
import { PolymarketScanner } from "./PolymarketScanner";
import { NFIOracle } from "./NFIOracle";
import { AgentLeaderboard } from "./AgentLeaderboard";
import { autonomousAgent } from "../services/autonomousAgent";
import { getLatestArcBlock, getLiveUSYCRate, ARC_EXPLORER } from "../services/arcClient";
import { ExternalLink } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState(reputationService.getStats());
  const [user, setUser] = useState(auth.currentUser);
  const [arcBlock, setArcBlock] = useState<number | null>(null);
  const [usycRate, setUsycRate] = useState<number | null>(null);
  const [usycSource, setUsycSource] = useState<string>("loading");

  useEffect(() => {
    const fetchLive = async () => {
      const [blockResult, rateResult] = await Promise.allSettled([
        getLatestArcBlock(),
        getLiveUSYCRate(),
      ]);
      if (blockResult.status === "fulfilled" && blockResult.value) setArcBlock(blockResult.value.number);
      if (rateResult.status === "fulfilled") {
        setUsycRate(rateResult.value.rate);
        setUsycSource(rateResult.value.source);
      }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubRep = reputationService.subscribe(() => setStats({ ...reputationService.getStats() }));
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    if (!autonomousAgent.isRunning()) autonomousAgent.start();
    return () => { unsubRep(); unsubAuth(); };
  }, []);

  const tickerItems = [
    { pair: "USDC/USYC",  rate: usycRate ? usycRate.toFixed(4) : "...", change: usycSource === "onchain" ? "LIVE" : usycSource === "loading" ? "..." : "~" },
    { pair: "EURC/USDC",  rate: "1.0821",                               change: "+0.01%" },
    { pair: "USYC/USDC",  rate: usycRate ? (1 / usycRate).toFixed(4) : "...", change: "-0.02%" },
    { pair: "TX FEE",     rate: "~$0.01",                               change: "USDC" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Ticker */}
      <div className="border-b-[3px] border-black bg-white sticky top-0 z-50 px-4 lg:px-12 py-3 flex flex-col md:flex-row items-center justify-between gap-4 font-black">
        <div className="flex items-center gap-6">
          <div className="w-8 h-8 bg-black flex items-center justify-center p-1.5">
            <Logo className="text-white" />
          </div>
          <span className="text-[10px] tracking-[0.4em] uppercase">Thales // Substrate_v3</span>
        </div>
        <div className="flex-1 flex gap-8 lg:gap-12 overflow-hidden px-4">
          <div className="flex gap-10 whitespace-nowrap py-1">
            {tickerItems.map((t) => (
              <div key={t.pair} className="flex gap-3 items-center">
                <span className="text-[10px] text-black/40">{t.pair}</span>
                <span className="text-xs font-mono font-black">{t.rate}</span>
                <span className={cn("text-[8px]", t.change === "LIVE" || t.change.startsWith("+") ? "text-brand-primary" : "text-black/40")}>{t.change}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", arcBlock ? "bg-brand-primary animate-pulse" : "bg-black/20")} />
            {arcBlock ? (
              <a href={`${ARC_EXPLORER}/block/${arcBlock}`} target="_blank" rel="noopener noreferrer"
                className="text-[9px] uppercase tracking-widest text-black/60 hover:text-brand-primary transition-colors flex items-center gap-1">
                Arc #{arcBlock.toLocaleString()}<ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span className="text-[9px] uppercase tracking-widest text-black/40">Arc: Connecting...</span>
            )}
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              {user.photoURL && <img src={user.photoURL} className="w-6 h-6 border-2 border-black" referrerPolicy="no-referrer" />}
              <span className="text-[9px] font-black uppercase text-black/60">{user.email?.split("@")[0]}</span>
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="text-[10px] uppercase font-black border-b-2 border-black hover:text-brand-primary hover:border-brand-primary transition-all">
              Connect_Agora
            </button>
          )}
        </div>
      </div>

      <div className="space-y-12 lg:space-y-20 pb-24 w-full px-4 lg:px-12 pt-8 lg:pt-12 max-w-[1920px] mx-auto">

        {/* Hero */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
          <div className="xl:col-span-8 space-y-10">
            <div className="space-y-4">
              <span className="text-[10px] font-black tracking-[0.6em] text-brand-primary uppercase">THALES ECONOMIC CORE</span>
              <h1 className="text-7xl sm:text-8xl lg:text-[120px] font-black tracking-tighter leading-[0.8] text-black uppercase">
                Thinking<br /><span className="text-black/10">Capital.</span>
              </h1>
              <p className="text-lg lg:text-2xl font-bold text-black/50 max-w-2xl leading-tight uppercase">
                Autonomous economic reasoning on Arc. Powered by Circle USDC, USYC yield, and Gemini AI.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Trust Score"
                value={stats.trustScore.toString()}
                suffix="Points"
                color="text-brand-primary"
              />
              <StatCard
                label="Reasoning XP"
                value={stats.reasoningXP.toLocaleString()}
                suffix={stats.citizenTier}
              />
              <StatCard
                label="USYC Rate"
                value={usycRate ? usycRate.toFixed(4) : "..."}
                suffix={usycSource === "onchain" ? "Live" : usycSource === "loading" ? "loading" : "~est"}
                highlight
              />
              <StatCard
                label="Yield Earned"
                value={stats.yieldBearing > 0 ? `$${stats.yieldBearing.toFixed(2)}` : "$0.00"}
                suffix={stats.lastYield !== "+0.00" ? stats.lastYield + " USDC" : "Run an intent"}
                color="text-brand-primary"
              />
            </div>
          </div>
          <div className="xl:col-span-4"><MarketIntelligence /></div>
        </section>

        {/* Traction */}
        <section><TractionBoard /></section>

        {/* Prediction Intelligence */}
        <section className="space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40">PREDICTION INTELLIGENCE</span>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Market Oracle Suite</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <PolymarketScanner />
            <NFIOracle />
          </div>
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          <div className="xl:col-span-8 space-y-12">
            <StrategicVaults />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ThalesReasoningEngine />
              <StableFXRFQ fee={0.025} />
            </div>
            <div>
              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40">AUTONOMOUS REASONING</span>
                <h2 className="text-4xl font-black uppercase tracking-tighter">Live Agent Decisions</h2>
              </div>
              <AgentActivity />
            </div>
          </div>
          <div className="xl:col-span-4 space-y-8">
            <UnifiedBalanceSidebar />
            <Sequencer />
            <ThalesMonitor />
          </div>
        </section>

        {/* Leaderboard */}
        <section className="space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40">SOCIAL TRADING</span>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Agent Leaderboard</h2>
          </div>
          <AgentLeaderboard />
        </section>

      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, color = "text-black", highlight = false }: {
  label: string; value: string; suffix?: string; color?: string; highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={cn("p-6 border-[3px] border-black transition-all", highlight ? "bg-black text-white" : "bg-white")}
    >
      <p className={cn("text-[8px] font-black uppercase tracking-widest mb-2", highlight ? "text-white/40" : "text-black/40")}>{label}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={cn("text-2xl lg:text-3xl font-black tracking-tighter font-mono", highlight ? "text-brand-primary" : color)}>
          {value}
        </span>
        {suffix && (
          <span className={cn("text-[8px] font-black uppercase", highlight ? "text-white/40" : "text-black/30")}>
            {suffix}
          </span>
        )}
      </div>
    </motion.div>
  );
}
