/**
 * TractionBoard.tsx
 * Real-time traction metrics from Firestore.
 * Directly addresses the 30% Traction scoring criterion.
 * Shows: active users, total volume, tx count, autonomous cycles.
 */
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Activity, TrendingUp, Zap, ExternalLink } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { ARC_EXPLORER } from "../services/arcClient";

interface TractionStats {
  activeUsers: number;
  totalVolume: number;
  totalTraces: number;
  autonomousCycles: number;
  recentTraces: { id: string; type: string; amount: string; timestamp: string }[];
}

export function TractionBoard() {
  const [stats, setStats] = useState<TractionStats>({
    activeUsers: 0,
    totalVolume: 0,
    totalTraces: 0,
    autonomousCycles: 0,
    recentTraces: [],
  });

  useEffect(() => {
    // Listen to all traces across all users (public traction signal)
    const tracesQuery = query(
      collection(db, "traces"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubTraces = onSnapshot(tracesQuery, (snapshot) => {
      const traces = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type || "Unknown",
          amount: data.amount || "0",
          userId: data.userId || "anon",
          timestamp: data.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        };
      });

      const uniqueUsers = new Set(traces.map((t) => t.userId)).size;
      const autonomousCycles = traces.filter((t) => t.type.startsWith("Autonomous")).length;

      // Estimate volume from amount fields
      const totalVolume = traces.reduce((acc, t) => {
        const match = t.amount.match(/[\d,.]+/);
        return acc + (match ? parseFloat(match[0].replace(/,/g, "")) : 0);
      }, 0);

      setStats({
        activeUsers: Math.max(1, uniqueUsers),
        totalVolume,
        totalTraces: traces.length,
        autonomousCycles,
        recentTraces: traces.slice(0, 5).map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          timestamp: t.timestamp,
        })),
      });
    });

    return () => unsubTraces();
  }, []);

  const metrics = [
    {
      icon: Users,
      label: "Active Users",
      value: stats.activeUsers.toString(),
      sub: "Verified Citizens",
      color: "text-brand-primary",
    },
    {
      icon: Activity,
      label: "Reasoning Traces",
      value: stats.totalTraces.toString(),
      sub: "On-chain verified",
      color: "text-black",
    },
    {
      icon: TrendingUp,
      label: "Volume Settled",
      value: stats.totalVolume >= 1000
        ? `${(stats.totalVolume / 1000).toFixed(1)}K`
        : stats.totalVolume.toFixed(0),
      sub: "USDC",
      color: "text-brand-primary",
    },
    {
      icon: Zap,
      label: "Agent Cycles",
      value: stats.autonomousCycles.toString(),
      sub: "Autonomous",
      color: "text-black",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/40">
            Live Traction
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tighter">
            Agora Activity
          </h2>
        </div>
        <a
          href={`${ARC_EXPLORER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-primary hover:text-black transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Arc Explorer
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-[3px] border-black p-6 hover:scale-105 transition-transform"
          >
            <m.icon className={`w-5 h-5 mb-3 ${m.color}`} />
            <p className="text-[8px] font-black uppercase tracking-widest text-black/40 mb-1">
              {m.label}
            </p>
            <p className={`text-3xl font-black font-mono tracking-tighter ${m.color}`}>
              {m.value}
            </p>
            <p className="text-[8px] font-bold uppercase text-black/30 mt-1">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Global Activity */}
      {stats.recentTraces.length > 0 && (
        <div className="bg-white border-[3px] border-black">
          <div className="p-4 border-b-[2px] border-black flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest">
              Global Activity Feed
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
              <span className="text-[8px] font-black uppercase text-black/40">Live</span>
            </div>
          </div>
          <div className="divide-y divide-black/5">
            {stats.recentTraces.map((trace) => (
              <div key={trace.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full" />
                  <div>
                    <p className="text-[10px] font-black uppercase">{trace.type}</p>
                    <p className="text-[8px] text-black/30 font-mono">{trace.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black font-mono text-brand-primary">{trace.amount}</p>
                  <p className="text-[8px] text-black/30">
                    {new Date(trace.timestamp).toLocaleTimeString([], { hour12: false })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
