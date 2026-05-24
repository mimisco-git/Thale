import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, Users, TrendingUp, Copy, CheckCircle, ExternalLink, Zap } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { cn } from "../lib/utils";
import { ARC_EXPLORER } from "../services/arcClient";

interface LeaderEntry {
  rank: number;
  agentId: string;
  totalAlpha: number;
  traceCount: number;
  winRate: number;
  lastAction: string;
  isFollowed: boolean;
}

const ACTION_COLOR: Record<string, string> = {
  HARVEST_YIELD:       "text-green-600 bg-green-50 border-green-200",
  REBALANCE_TO_EURC:   "text-blue-600 bg-blue-50 border-blue-200",
  REBALANCE_TO_USDC:   "text-purple-600 bg-purple-50 border-purple-200",
  CCTP_BRIDGE:         "text-orange-600 bg-orange-50 border-orange-200",
  "INTENT EXEC":       "text-brand-primary bg-brand-primary/5 border-brand-primary/20",
  HOLD:                "text-black/30 bg-slate-50 border-black/10",
};

export function AgentLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "traces"), orderBy("timestamp", "desc"), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const agentMap = new Map<string, { totalAlpha: number; traceCount: number; actions: string[] }>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const agentId = data.agent || "Thales Agent";
        const alpha = data.details?.decision?.estimatedAlpha || data.details?.alphaGenerated || 0;
        const action = (data.details?.decision?.action || data.type || "REASONING").toUpperCase();
        if (!agentMap.has(agentId)) agentMap.set(agentId, { totalAlpha: 0, traceCount: 0, actions: [] });
        const entry = agentMap.get(agentId)!;
        entry.totalAlpha += parseFloat(alpha) || 0;
        entry.traceCount += 1;
        entry.actions.push(action);
      });

      const board: LeaderEntry[] = Array.from(agentMap.entries())
        .map(([agentId, stats]) => {
          const holdCount = stats.actions.filter((a) => a === "HOLD").length;
          const winRate = stats.traceCount > 0 ? ((stats.traceCount - holdCount) / stats.traceCount) * 100 : 0;
          return {
            rank: 0,
            agentId,
            totalAlpha: parseFloat(stats.totalAlpha.toFixed(4)),
            traceCount: stats.traceCount,
            winRate: parseFloat(winRate.toFixed(1)),
            lastAction: stats.actions[0] || "REASONING",
            isFollowed: following.has(agentId),
          };
        })
        .sort((a, b) => b.totalAlpha - a.totalAlpha)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      setLeaders(board.slice(0, 10));
    });
    return () => unsub();
  }, [following]);

  const toggleFollow = (agentId: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      next.has(agentId) ? next.delete(agentId) : next.add(agentId);
      return next;
    });
  };

  const copyStrategy = (agent: LeaderEntry) => {
    navigator.clipboard.writeText(
      `${agent.agentId} | Alpha: +${agent.totalAlpha} USDC | ${agent.traceCount} traces | ${agent.winRate}% win rate | Last: ${agent.lastAction}`
    ).catch(() => {});
    setCopied(agent.agentId);
    setTimeout(() => setCopied(null), 2000);
  };

  const rankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-400 text-black font-black";
    if (rank === 2) return "bg-slate-300 text-black font-black";
    if (rank === 3) return "bg-amber-600 text-white font-black";
    return "bg-black/5 text-black/30 font-bold";
  };

  if (leaders.length === 0) {
    return (
      <div className="bg-white border-[3px] border-black p-16 text-center">
        <Trophy className="w-10 h-10 text-black/10 mx-auto mb-4" />
        <p className="text-[11px] font-black uppercase tracking-widest text-black/20">No agents ranked yet</p>
        <p className="text-[9px] text-black/20 mt-2">Run an intent to appear on the leaderboard</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.04)] overflow-hidden">

      {/* Header */}
      <div className="bg-black text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em]">Agent Leaderboard</p>
            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
              RFB 06 · Social Trading · Slash-Bond Protected
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase">
          <Users className="w-3.5 h-3.5" />
          {following.size} following
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 border-b border-black/5 text-[8px] font-black uppercase tracking-widest text-black/30">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Agent</div>
        <div className="col-span-2 text-right">Alpha</div>
        <div className="col-span-1 text-center">Traces</div>
        <div className="col-span-1 text-center">Win%</div>
        <div className="col-span-2 text-center">Last Action</div>
        <div className="col-span-1 text-right"></div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-black/5">
        {leaders.map((agent) => {
          const actionKey = agent.lastAction.replace(/ /g, "_");
          const actionStyle = ACTION_COLOR[actionKey] || ACTION_COLOR[agent.lastAction] || "text-black/40 bg-slate-50 border-black/10";

          return (
            <motion.div
              key={agent.agentId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "grid grid-cols-12 px-6 py-5 items-center hover:bg-slate-50 transition-colors",
                agent.isFollowed && "bg-brand-primary/3 hover:bg-brand-primary/5"
              )}
            >
              {/* Rank */}
              <div className="col-span-1">
                <span className={cn("w-7 h-7 flex items-center justify-center text-[10px] rounded-sm", rankStyle(agent.rank))}>
                  {agent.rank}
                </span>
              </div>

              {/* Agent name */}
              <div className="col-span-4">
                <p className="text-[11px] font-black uppercase truncate">{agent.agentId}</p>
                {agent.isFollowed && (
                  <p className="text-[7px] font-black text-brand-primary uppercase mt-0.5">Following</p>
                )}
              </div>

              {/* Alpha */}
              <div className="col-span-2 text-right">
                <p className="text-[13px] font-black font-mono text-brand-primary">+{agent.totalAlpha.toFixed(2)}</p>
                <p className="text-[7px] text-black/20 uppercase font-bold">USDC</p>
              </div>

              {/* Traces */}
              <div className="col-span-1 text-center">
                <p className="text-[12px] font-black font-mono">{agent.traceCount}</p>
              </div>

              {/* Win rate */}
              <div className="col-span-1 text-center">
                <p className="text-[12px] font-black font-mono">{agent.winRate}%</p>
              </div>

              {/* Last action badge */}
              <div className="col-span-2 flex justify-center">
                <span className={cn("px-2 py-1 text-[7px] font-black uppercase border truncate max-w-[100px]", actionStyle)}>
                  {agent.lastAction.replace(/_/g, " ")}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => copyStrategy(agent)}
                  className="p-1.5 hover:bg-black/5 rounded transition-colors"
                  title="Copy strategy"
                >
                  {copied === agent.agentId
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    : <Copy className="w-3.5 h-3.5 text-black/20 hover:text-black" />
                  }
                </button>
                <button
                  onClick={() => toggleFollow(agent)}
                  className={cn(
                    "px-2.5 py-1.5 text-[7px] font-black uppercase transition-all border",
                    following.has(agent.agentId)
                      ? "bg-brand-primary text-white border-brand-primary"
                      : "bg-white text-black/40 border-black/10 hover:border-black hover:text-black"
                  )}
                >
                  {following.has(agent.agentId) ? "Following" : "Follow"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-black/3 border-t border-black/5 flex items-center justify-between">
        <p className="text-[8px] font-black uppercase text-black/30 leading-tight max-w-lg">
          Following an agent copies its next decision. Performance bonds slash automatically if the leader drops out of top 3. Settled in USDC on Arc.
        </p>
        <a
          href={ARC_EXPLORER}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[8px] font-black uppercase text-brand-primary hover:text-black transition-colors flex-shrink-0 ml-4"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          ArcScan
        </a>
      </div>
    </div>
  );
}
