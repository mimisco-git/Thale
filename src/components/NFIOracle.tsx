/**
 * NFIOracle.tsx
 * Displays NostalgiaForInfinity blacklist signals as tradeable prediction markets.
 * Research #3 from the hackathon brief.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, GitCommit, ExternalLink, RefreshCw, TrendingDown } from "lucide-react";
import { cn } from "../lib/utils";

interface BlacklistSignal {
  coin: string;
  sha: string;
  date: string;
  commitUrl: string;
  message: string;
  marketQuestion: string;
  resolutionDate: string;
  signalStrength: "HIGH" | "MEDIUM";
}

interface OracleResult {
  signals: BlacklistSignal[];
  totalCommitsScanned: number;
  repoUrl: string;
  lastChecked: string;
  note?: string;
}

export function NFIOracle() {
  const [data, setData] = useState<OracleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nfi-oracle");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error("[NFI Oracle]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 10 * 60_000); // every 10 mins
    return () => clearInterval(interval);
  }, []);

  const daysLeft = (resDate: string) => {
    const diff = new Date(resDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-brand-primary" />
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] block">
              NFI Rugpull Oracle
            </span>
            <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">
              Research 03 · NostalgiaForInfinity · Prediction Markets
            </span>
          </div>
        </div>
        <button onClick={fetch_} disabled={loading} className="p-2 hover:bg-white/10 transition-colors">
          <RefreshCw className={cn("w-4 h-4 text-white/60", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 border-b-[2px] border-black/5">
          <div className="p-3 border-r border-black/5">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Commits Scanned</p>
            <p className="text-xl font-black font-mono">{data.totalCommitsScanned || "—"}</p>
          </div>
          <div className="p-3 border-r border-black/5">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Active Signals</p>
            <p className={cn("text-xl font-black font-mono", data.signals.length > 0 ? "text-brand-primary" : "text-black/30")}>
              {data.signals.length}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Source</p>
            <a
              href={data.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-black text-brand-primary hover:text-black flex items-center gap-1"
            >
              <GitCommit className="w-3 h-3" />
              iterativv/NFI
            </a>
          </div>
        </div>
      )}

      {/* Signals */}
      <div className="max-h-[480px] overflow-y-auto divide-y divide-black/5">
        {loading && !data && (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-[3px] border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase text-black/30 tracking-widest">
              Parsing NFI commits...
            </p>
          </div>
        )}

        {data?.signals.length === 0 && !loading && (
          <div className="p-12 text-center space-y-3">
            <TrendingDown className="w-8 h-8 text-black/10 mx-auto" />
            <p className="text-[10px] font-black uppercase text-black/30">No new blacklist signals</p>
            <p className="text-[8px] text-black/20">Monitoring NFI commits for new additions...</p>
          </div>
        )}

        <AnimatePresence>
          {data?.signals.map((signal) => (
            <motion.div
              key={`${signal.coin}-${signal.sha}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setExpanded(expanded === signal.sha ? null : signal.sha)}
              className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-3 py-1 text-[10px] font-black uppercase font-mono",
                    signal.signalStrength === "HIGH"
                      ? "bg-brand-primary text-white"
                      : "bg-black/5 text-black"
                  )}>
                    ${signal.coin}
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 text-[8px] font-black uppercase border",
                    signal.signalStrength === "HIGH"
                      ? "border-red-200 text-red-600 bg-red-50"
                      : "border-black/10 text-black/40"
                  )}>
                    {signal.signalStrength} signal
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-black/30 uppercase">
                    {daysLeft(signal.resolutionDate)}d to resolve
                  </p>
                  <p className="text-[8px] font-mono text-black/20">{signal.sha}</p>
                </div>
              </div>

              <p className="text-[10px] font-bold text-black leading-snug mb-3">
                {signal.marketQuestion}
              </p>

              <div className="flex items-center gap-3 text-[8px] font-black uppercase text-black/30">
                <GitCommit className="w-3 h-3" />
                <span>{new Date(signal.date).toLocaleDateString()}</span>
                <span>·</span>
                <span>Resolves {signal.resolutionDate}</span>
              </div>

              <AnimatePresence>
                {expanded === signal.sha && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-black/10 space-y-3"
                  >
                    <div className="bg-slate-50 border border-black/10 p-3">
                      <p className="text-[8px] font-black uppercase text-black/30 mb-1">Commit Message</p>
                      <p className="text-[10px] font-mono text-black/60">{signal.message}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={signal.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[9px] font-black uppercase text-brand-primary hover:text-black transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Commit
                      </a>
                      <span className="text-[8px] text-black/20">
                        Signal opens prediction market on Arc (domain 26)
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-black/3 border-t border-black/5">
        <p className="text-[8px] font-black uppercase text-black/30 leading-tight">
          Each blacklist addition by iterativv seeds a 7-day prediction market on Arc. Resolution signal: coin price drop. Settlement in USDC, sub-second on Arc.
        </p>
      </div>
    </div>
  );
}
