/**
 * StatsPage.tsx
 * Public shareable stats page at /stats
 * Judges can bookmark this to track live traction.
 */
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { db } from "../lib/firebase";
import {
  collection, query, orderBy, limit,
  onSnapshot, getCountFromServer,
} from "firebase/firestore";
import {
  getLatestArcBlock, getLiveUSYCRate,
  ARC_EXPLORER, ARC_CONTRACTS,
} from "../services/arcClient";
import {
  Users, Activity, TrendingUp, Zap,
  ExternalLink, Globe, ShieldCheck, Clock,
} from "lucide-react";
import { cn } from "../lib/utils";

interface GlobalStats {
  userCount: number;
  traceCount: number;
  totalVolume: number;
  agentCycles: number;
  avgAlpha: number;
  lastActivity: string;
}

interface RecentTrace {
  id: string;
  type: string;
  amount: string;
  timestamp: string;
  agent: string;
}

export function StatsPage() {
  const [stats, setStats] = useState<GlobalStats>({
    userCount: 0, traceCount: 0, totalVolume: 0,
    agentCycles: 0, avgAlpha: 0, lastActivity: "",
  });
  const [recentTraces, setRecentTraces] = useState<RecentTrace[]>([]);
  const [arcBlock, setArcBlock] = useState<number | null>(null);
  const [usycRate, setUsycRate] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Live Arc data
    const fetchArc = async () => {
      const [b, r] = await Promise.allSettled([getLatestArcBlock(), getLiveUSYCRate()]);
      if (b.status === "fulfilled" && b.value) setArcBlock(b.value.number);
      if (r.status === "fulfilled") setUsycRate(r.value.rate);
    };
    fetchArc();
    const arcInterval = setInterval(fetchArc, 15_000);

    // Live Firestore traces
    const q = query(collection(db, "traces"), orderBy("timestamp", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const traces = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          type: data.type || "Unknown",
          amount: data.amount || "0",
          agent: data.agent || "Thales",
          timestamp: data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        };
      });

      const uniqueUsers = new Set(snap.docs.map((d) => d.data().userId).filter(Boolean)).size;
      const agentCycles = traces.filter((t) => t.type.startsWith("Autonomous")).length;
      const totalVol = traces.reduce((acc, t) => {
        const match = t.amount.match(/[\d,.]+/);
        return acc + (match ? parseFloat(match[0].replace(/,/g, "")) : 0);
      }, 0);
      const alphaTraces = traces.filter((t) => t.amount.includes("alpha"));
      const avgAlpha = alphaTraces.length > 0
        ? alphaTraces.reduce((acc, t) => {
            const match = t.amount.match(/[\d.]+/);
            return acc + (match ? parseFloat(match[0]) : 0);
          }, 0) / alphaTraces.length
        : 0;

      setStats({
        userCount: Math.max(1, uniqueUsers),
        traceCount: traces.length,
        totalVolume: totalVol,
        agentCycles,
        avgAlpha,
        lastActivity: traces[0]?.timestamp || "",
      });
      setRecentTraces(traces.slice(0, 8));
    });

    return () => { unsub(); clearInterval(arcInterval); };
  }, []);

  const shareUrl = "https://thale-one.vercel.app/stats";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const metrics = [
    { icon: Users, label: "Verified Citizens", value: stats.userCount, suffix: "users", color: "text-brand-primary" },
    { icon: Activity, label: "Reasoning Traces", value: stats.traceCount, suffix: "on-chain", color: "text-black" },
    { icon: TrendingUp, label: "Volume Settled", value: stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}K` : stats.totalVolume.toFixed(0), suffix: "USDC", color: "text-brand-primary" },
    { icon: Zap, label: "Agent Cycles", value: stats.agentCycles, suffix: "autonomous", color: "text-black" },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-12 px-4 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-12">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/40">
              Live Traction · Agora Agents Hackathon
            </span>
            <h1 className="text-6xl lg:text-8xl font-black uppercase tracking-tighter mt-2">
              Thales<br />
              <span className="text-black/20">Stats.</span>
            </h1>
            <p className="text-sm font-bold text-black/40 uppercase mt-3">
              Real-time metrics from Arc Testnet + Firestore
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={copyLink}
              className={cn(
                "px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all border-2",
                copied ? "bg-black text-white border-black" : "bg-white text-black border-black hover:bg-black hover:text-white"
              )}
            >
              {copied ? "Copied!" : "Share This Page"}
            </button>
            <a
              href={ARC_EXPLORER}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[9px] font-black uppercase text-brand-primary"
            >
              <ExternalLink className="w-3 h-3" />
              ArcScan Explorer
            </a>
          </div>
        </div>

        {/* Live Arc Status */}
        <div className="bg-black text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
            <div>
              <p className="text-[8px] font-black uppercase text-white/30 mb-0.5">Arc Testnet · Chain ID 5042002</p>
              <p className="text-lg font-black font-mono">
                Block #{arcBlock?.toLocaleString() ?? "Connecting..."}
              </p>
            </div>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-[8px] font-black uppercase text-white/30 mb-0.5">USYC Rate</p>
              <p className="text-lg font-black font-mono text-brand-primary">
                {usycRate ? usycRate.toFixed(4) : "..."}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase text-white/30 mb-0.5">TX Fee</p>
              <p className="text-lg font-black font-mono">~$0.01 USDC</p>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase text-white/30 mb-0.5">Finality</p>
              <p className="text-lg font-black font-mono text-brand-primary">Sub-second</p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-[3px] border-black p-6"
            >
              <m.icon className={`w-5 h-5 mb-3 ${m.color}`} />
              <p className="text-[8px] font-black uppercase tracking-widest text-black/30 mb-1">{m.label}</p>
              <p className={`text-4xl font-black font-mono tracking-tighter ${m.color}`}>{m.value}</p>
              <p className="text-[8px] font-bold uppercase text-black/20 mt-1">{m.suffix}</p>
            </motion.div>
          ))}
        </div>

        {/* Contract addresses */}
        <div className="bg-white border-[3px] border-black p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-brand-primary" />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Live Contracts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "USDC", address: ARC_CONTRACTS.USDC },
              { label: "USYC", address: ARC_CONTRACTS.USYC },
              { label: "USYC Teller", address: ARC_CONTRACTS.USYC_TELLER },
              { label: "CCTP V2 (Domain 26)", address: ARC_CONTRACTS.CCTP_TOKEN_MESSENGER },
              { label: "StableFX Escrow", address: ARC_CONTRACTS.FX_ESCROW },
              { label: "EURC", address: ARC_CONTRACTS.EURC },
            ].map((c) => (
              <a
                key={c.label}
                href={`${ARC_EXPLORER}/address/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between items-center p-3 bg-slate-50 border border-black/5 hover:border-black transition-colors group"
              >
                <span className="text-[9px] font-black uppercase text-black/40 group-hover:text-black transition-colors">{c.label}</span>
                <span className="text-[9px] font-mono text-brand-primary flex items-center gap-1">
                  {c.address.slice(0, 8)}...{c.address.slice(-6)}
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Recent activity feed */}
        <div className="bg-white border-[3px] border-black overflow-hidden">
          <div className="p-5 border-b-[2px] border-black flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5" />
              <h2 className="text-xl font-black uppercase tracking-tighter">Global Activity Feed</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase text-black/30">Live</span>
            </div>
          </div>
          <div className="divide-y divide-black/5">
            {recentTraces.length === 0 ? (
              <div className="p-12 text-center text-black/20">
                <p className="text-[10px] font-black uppercase tracking-widest">No activity yet</p>
                <p className="text-[9px] mt-1">Sign in and run an intent to be first</p>
              </div>
            ) : recentTraces.map((trace) => (
              <div key={trace.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full" />
                  <div>
                    <p className="text-[10px] font-black uppercase">{trace.type}</p>
                    <p className="text-[8px] font-mono text-black/30">{trace.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black font-mono text-brand-primary">{trace.amount}</p>
                  <p className="text-[8px] text-black/20 flex items-center gap-1 justify-end">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(trace.timestamp).toLocaleTimeString([], { hour12: false })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pb-8">
          <p className="text-[9px] font-black uppercase text-black/30 tracking-widest">
            Agora Agents Hackathon · Canteen × Circle × Arc · May 2026
          </p>
          <a href="https://thale-one.vercel.app" className="text-[9px] font-black text-brand-primary uppercase hover:text-black transition-colors">
            thale-one.vercel.app
          </a>
        </div>
      </div>
    </div>
  );
}
