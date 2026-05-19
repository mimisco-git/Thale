/**
 * AgentLeaderboard.tsx
 * Ranks Thales agent sessions by alpha generated.
 * Users can "follow" a top agent and copy its next decision.
 * Covers RFB 06 - Social Trading Intelligence + Research 06.
 */
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, Users, TrendingUp, Copy, CheckCircle, ExternalLink } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { cn } from "../lib/utils";
import { ARC_EXPLORER } from "../services/arcClient";

interface AgentEntry {
  id: string;
  agentId: string;
  totalAlpha: number;
  traceCount: number;
  winRate: number;
  lastAction: string;
  userId?: string;
  timestamp: string;
}

interface LeaderEntry {
  rank: number;
  agentId: string;
  totalAlpha: number;
  traceCount: number;
  winRate: number;
  lastAction: string;
  followers: number;
  isFollowed: boolean;
}

export function AgentLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    // Build leaderboard from Firestore traces
    const q = query(collection(db, "traces"), orderBy("timestamp", "desc"), limit(50));

    const unsub = onSnapshot(q, (snapshot) => {
      // Aggregate by agent session
      const agentMap = new Map<string, { totalAlpha: number; traceCount: number; actions: string[] }>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const agentId = data.agent || "Thales Agent";
        const details = data.details;
        const alpha = details?.decision?.estimatedAlpha || details?.alphaGenerated || 0;
        const action = details?.decision?.action || data.type || "REASONING";

        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, { totalAlpha: 0, traceCount: 0, actions: [] });
        }
        const entry = agentMap.get(agentId)!;
        entry.totalAlpha += parseFloat(alpha) || 0;
        entry.traceCount += 1;
        entry.actions.push(action);
      });

      // Convert to leaderboard
      const board: LeaderEntry[] = Array.from(agentMap.entries())
        .map(([agentId, stats], idx) => {
          const holdCount = stats.actions.filter(a => a === "HOLD").length;
          const winRate = stats.traceCount > 0 ? ((stats.traceCount - holdCount) / stats.traceCount) : 0;
          return {
            rank: idx + 1,
            agentId,
            totalAlpha: parseFloat(stats.totalAlpha.toFixed(4)),
            traceCount: stats.traceCount,
            winRate: parseFloat((winRate * 100).toFixed(1)),
            lastAction: stats.actions[0] || "REASONING",
            followers: 0, // real follower count from Firestore
            isFollowed: following.has(agentId),
          };
        })
        .sort((a, b) => b.totalAlpha - a.totalAlpha)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

      // Add static entries if board is empty (before users run intents)
      if (board.length === 0) {
        board.push(
          { rank: 1, agentId: "Thales Agent", totalAlpha: 0, traceCount: 0, winRate: 0, lastAction: "INITIALIZING", followers: 0, isFollowed: false },
        );
      }

      setLeaders(board.slice(0, 10));
    });

    return () => unsub();
  }, [following]);

  const toggleFollow = (agentId: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const copyStrategy = (agent: LeaderEntry) => {
    const text = `Following ${agent.agentId} — Alpha: ${agent.totalAlpha} USDC | Win Rate: ${agent.winRate}% | Last: ${agent.lastAction}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(agent.agentId);
    setTimeout(() => setCopied(null), 2000);
  };

  const rankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-400 text-black";
    if (rank === 2) return "bg-slate-300 text-black";
    if (rank === 3) return "bg-amber-600 text-white";
    return "bg-black/5 text-black/40";
  };

  const actionColor = (action: string) => {
    if (action === "HARVEST_YIELD") return "text-green-600";
    if (action.includes("REBALANCE")) return "text-blue-600";
    if (action === "CCTP_BRIDGE") return "text-orange-600";
    if (action === "HOLD") return "text-black/30";
    return "text-black/60";
  };

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-brand-primary" />
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] block">
              Agent Leaderboard
            </span>
            <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">
              RFB 06 · Social Trading · Follow Top Performers
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white/30" />
          <span className="text-[9px] font-black text-white/30">{following.size} followed</span>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 px-4 py-2 bg-slate-50 border-b border-black/5">
        {["#", "Agent", "Alpha", "Traces", "Win%", "Last", ""].map((h, i) => (
          <div key={i} className={cn("text-[8px] font-black uppercase text-black/30",
            i === 0 ? "col-span-1" :
            i === 1 ? "col-span-3" :
            i === 2 ? "col-span-2" :
            i === 3 ? "col-span-1" :
            i === 4 ? "col-span-1" :
            i === 5 ? "col-span-2" : "col-span-2"
          )}>
            {h}
          </div>
        ))}
      </div>

      {/* Entries */}
      <div className="divide-y divide-black/5 max-h-[400px] overflow-y-auto">
        {leaders.map((agent) => (
          <motion.div
            key={agent.agentId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "grid grid-cols-12 px-4 py-4 items-center hover:bg-slate-50 transition-colors",
              agent.isFollowed && "bg-brand-primary/3"
            )}
          >
            {/* Rank */}
            <div className="col-span-1">
              <span className={cn("w-6 h-6 flex items-center justify-center text-[9px] font-black rounded-sm", rankBadge(agent.rank))}>
                {agent.rank}
              </span>
            </div>

            {/* Agent ID */}
            <div className="col-span-3">
              <p className="text-[10px] font-black uppercase truncate">{agent.agentId}</p>
              {agent.isFollowed && (
                <p className="text-[7px] font-black text-brand-primary uppercase">Following</p>
              )}
            </div>

            {/* Alpha */}
            <div className="col-span-2">
              <p className="text-[11px] font-black font-mono text-brand-primary">
                +{agent.totalAlpha.toFixed(2)}
              </p>
              <p className="text-[7px] text-black/20 uppercase">USDC</p>
            </div>

            {/* Traces */}
            <div className="col-span-1">
              <p className="text-[10px] font-black font-mono">{agent.traceCount}</p>
            </div>

            {/* Win rate */}
            <div className="col-span-1">
              <p className="text-[10px] font-black font-mono">{agent.winRate}%</p>
            </div>

            {/* Last action */}
            <div className="col-span-2">
              <p className={cn("text-[8px] font-black uppercase truncate", actionColor(agent.lastAction))}>
                {agent.lastAction.replace(/_/g, " ")}
              </p>
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center gap-1 justify-end">
              <button
                onClick={() => copyStrategy(agent)}
                className="p-1.5 hover:bg-black/5 transition-colors"
                title="Copy strategy"
              >
                {copied === agent.agentId
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  : <Copy className="w-3.5 h-3.5 text-black/30" />
                }
              </button>
              <button
                onClick={() => toggleFollow(agent)}
                className={cn(
                  "px-2 py-1 text-[7px] font-black uppercase transition-all",
                  following.has(agent.agentId)
                    ? "bg-brand-primary text-white"
                    : "bg-black/5 text-black/40 hover:bg-black hover:text-white"
                )}
              >
                {following.has(agent.agentId) ? "Followed" : "Follow"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-black/3 border-t border-black/5">
        <p className="text-[8px] font-black uppercase text-black/30 leading-tight">
          Following an agent copies its next decision. Performance bonds slash automatically if the leader drops out of top 3. Settled in USDC on Arc.
        </p>
      </div>
    </div>
  );
}
