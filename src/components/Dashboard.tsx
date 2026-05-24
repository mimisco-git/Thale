import { cn } from "../lib/utils";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Logo } from "./Logo";
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
import { Sequencer } from "./Sequencer";
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
    { pair: "USDC/USYC", rate: usycRate ? usycRate.toFixed(4) : "...", change: usycSource === "onchain" ? "LIVE" : usycSource === "loading" ? "..." : "~" },
    { pair: "EURC/USDC", rate: "1.0821", change: "+0.01%" },
    { pair: "USYC/USDC", rate: usycRate ? (1 / usycRate).toFixed(4) : "...", change: "-0.02%" },
    { pair: "TX FEE",    rate: "~$0.01",  change: "USDC" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0]">

      {/* ── Sticky Ticker Bar ── */}
      <div className="border-b-[3px] border-black bg-white sticky top-0 z-50 px-4 lg:px-10 py-3 flex items-center justify-between gap-4 font-black">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-7 h-7 bg-black flex items-center justify-center p-1.5">
            <Logo className="text-white" />
          </div>
          <span className="hidden sm:block text-[9px] tracking-[0.4em] uppercase">Thales // Substrate_v3</span>
        </div>

        <div className="flex-1 flex gap-8 overflow-hidden">
          {tickerItems.map((t) => (
            <div key={t.pair} className="flex gap-2 items-center flex-shrink-0">
              <span className="text-[9px] text-black/40">{t.pair}</span>
              <span className="text-[11px] font-mono font-black">{t.rate}</span>
              <span className={cn("text-[8px]", t.change === "LIVE" || t.change.startsWith("+") ? "text-brand-primary" : "text-black/30")}>
                {t.change}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className={cn("w-1.5 h-1.5 rounded-full", arcBlock ? "bg-brand-primary animate-pulse" : "bg-black/20")} />
          {arcBlock ? (
            <a href={`${ARC_EXPLORER}/block/${arcBlock}`} target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1 text-[9px] uppercase tracking-widest text-black/50 hover:text-brand-primary transition-colors">
              Arc #{arcBlock.toLocaleString()}<ExternalLink className="w-2.5 h-2.5 ml-1" />
            </a>
          ) : (
            <span className="text-[9px] uppercase text-black/30">Connecting...</span>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              {user.photoURL && <img src={user.photoURL} className="w-6 h-6 border-2 border-black" referrerPolicy="no-referrer" />}
              <span className="hidden sm:block text-[9px] font-black uppercase text-black/50">{user.email?.split("@")[0]}</span>
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="text-[9px] uppercase font-black border-b-2 border-black hover:text-brand-primary hover:border-brand-primary transition-all">
              Connect
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 lg:px-10 py-10 lg:py-16 space-y-16 lg:space-y-24">

        {/* ── Section 1: Hero ── */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-10 lg:gap-16 items-start">

          {/* Left: headline + stat cards */}
          <div className="xl:col-span-8 space-y-10">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.6em] text-brand-primary">
                THALES ECONOMIC CORE
              </span>
              <h1 className="text-[72px] sm:text-[100px] lg:text-[130px] font-black tracking-tighter leading-[0.8] text-black uppercase mt-2">
                Thinking<br />
                <span className="text-black/10">Capital.</span>
              </h1>
              <p className="text-base lg:text-xl font-bold text-black/40 uppercase max-w-xl mt-4 leading-relaxed">
                Autonomous economic reasoning on Arc. USDC, USYC yield, CCTP. No human in the loop.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Trust Score"  value={stats.trustScore.toString()}                suffix="pts"    color="text-brand-primary" />
              <StatCard label="Reasoning XP" value={stats.reasoningXP.toLocaleString()}        suffix={stats.citizenTier} />
              <StatCard label="USYC Rate"     value={usycRate ? usycRate.toFixed(4) : "..."}    suffix={usycSource === "onchain" ? "Live" : "~"} highlight />
              <StatCard label="Yield Earned"  value={stats.yieldBearing > 0 ? `$${stats.yieldBearing.toFixed(2)}` : "$0.00"} suffix="USDC" color="text-brand-primary" />
            </div>
          </div>

          {/* Right: Market Intelligence */}
          <div className="xl:col-span-4">
            <MarketIntelligence />
          </div>
        </section>

        {/* ── Section 2: Traction ── */}
        <section>
          <SectionLabel eyebrow="Live Metrics" title="Agora Activity" />
          <TractionBoard />
        </section>

        {/* ── Section 3: Prediction Intelligence ── */}
        <section>
          <SectionLabel eyebrow="Prediction Intelligence" title="Market Oracle Suite" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <PolymarketScanner />
            <NFIOracle />
          </div>
        </section>

        {/* ── Section 4: Vaults ── */}
        <section>
          <StrategicVaults />
        </section>

        {/* ── Section 5: Reasoning Engine + Vault RFQ ── */}
        <section>
          <SectionLabel eyebrow="Economic Reasoning" title="Intent Execution" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThalesReasoningEngine />
            <StableFXRFQ fee={0.025} />
          </div>
        </section>

        {/* ── Section 6: Autonomous Agent Feed ── */}
        <section>
          <SectionLabel eyebrow="Autonomous Reasoning" title="Live Agent Decisions" />
          <AgentActivity />
        </section>

        {/* ── Section 7: Agent Leaderboard (full width) ── */}
        <section>
          <SectionLabel eyebrow="Social Trading" title="Agent Leaderboard" />
          <AgentLeaderboard />
        </section>

        {/* ── Section 8: Arc Data + Wallet + Monitor ── */}
        <section>
          <SectionLabel eyebrow="Arc Infrastructure" title="On-Chain Data" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <UnifiedBalanceSidebar />
            <Sequencer />
            <ThalesMonitor />
          </div>
        </section>

      </div>
    </div>
  );
}

/* ── Helpers ── */

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8">
      <span className="text-[9px] font-black uppercase tracking-[0.5em] text-black/30">{eyebrow}</span>
      <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter mt-1">{title}</h2>
    </div>
  );
}

function StatCard({
  label, value, suffix, color = "text-black", highlight = false,
}: {
  label: string; value: string; suffix?: string; color?: string; highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "p-5 border-[3px] border-black transition-all",
        highlight ? "bg-black text-white" : "bg-white"
      )}
    >
      <p className={cn("text-[8px] font-black uppercase tracking-widest mb-2", highlight ? "text-white/40" : "text-black/30")}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={cn("text-2xl lg:text-3xl font-black tracking-tighter font-mono", highlight ? "text-brand-primary" : color)}>
          {value}
        </span>
        {suffix && (
          <span className={cn("text-[8px] font-black uppercase", highlight ? "text-white/30" : "text-black/20")}>
            {suffix}
          </span>
        )}
      </div>
    </motion.div>
  );
}
