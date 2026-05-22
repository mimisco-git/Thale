/**
 * PolymarketScanner.tsx
 * Scans live Polymarket markets, finds +EV bets via Gemini,
 * sizes with Kelly criterion, attributes via builder code.
 * Covers RFB 02 + Research 02.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, TrendingUp, RefreshCw, ExternalLink, Zap, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

interface EVBet {
  marketId: string;
  question: string;
  outcome: string;
  currentPrice: number;
  geminiProbability: number;
  edge: number;
  kellyFraction: number;
  suggestedSize: number;
  reasoning: string;
  confidence: number;
}

interface ScanResult {
  scannedMarkets: number;
  evBets: EVBet[];
  builderCode: string;
  timestamp: string;
  source: string;
}

export function PolymarketScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/polymarket-scan");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ScanResult = await res.json();
      setResult(data);
      setLastScan(new Date().toLocaleTimeString([], { hour12: false }));
    } catch (err) {
      console.error("[Polymarket] scan failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-scan on mount and every 5 minutes
  useEffect(() => {
    scan();
    const interval = setInterval(scan, 5 * 60_000);
    return () => clearInterval(interval);
  }, [scan]);

  const edgeColor = (edge: number) => {
    if (edge >= 0.1) return "text-green-600 bg-green-50 border-green-200";
    if (edge >= 0.05) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-black/40 bg-slate-50 border-black/10";
  };

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.05)] overflow-hidden">
      {/* Header */}
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-brand-primary" />
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] block">
              Polymarket Intelligence
            </span>
            <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">
              RFB 02 · Kelly Criterion · Builder Code
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastScan && (
            <span className="text-[8px] font-black text-white/30 uppercase">
              {lastScan}
            </span>
          )}
          <button
            onClick={scan}
            disabled={loading}
            className="p-2 hover:bg-white/10 transition-colors rounded"
          >
            <RefreshCw className={cn("w-4 h-4 text-white/60", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {result && (
        <div className="grid grid-cols-3 border-b-[2px] border-black/5">
          <div className="p-3 border-r border-black/5">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Markets Scanned</p>
            <p className="text-xl font-black font-mono">{result.scannedMarkets}</p>
          </div>
          <div className="p-3 border-r border-black/5">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">+EV Bets Found</p>
            <p className={cn("text-xl font-black font-mono", result.evBets.length > 0 ? "text-brand-primary" : "text-black/30")}>
              {result.evBets.length}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[8px] font-black uppercase text-black/30 mb-1">Builder Code</p>
            <p className="text-[9px] font-black font-mono text-black truncate">{result.builderCode}</p>
          </div>
        </div>
      )}

      {/* Bets */}
      <div className="max-h-[500px] overflow-y-auto divide-y divide-black/5">
        {loading && !result && (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-[3px] border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase text-black/30 tracking-widest">
              Scanning Polymarket...
            </p>
            <p className="text-[8px] text-black/20 mt-1">Gemini analyzing {result ? result.scannedMarkets : "20"} markets</p>
          </div>
        )}

        {result?.evBets.length === 0 && !loading && (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-black/20 mx-auto" />
            <p className="text-[10px] font-black uppercase text-black/30 tracking-widest">
              No +EV bets found this cycle
            </p>
            <p className="text-[8px] text-black/20">Markets appear efficiently priced. Agent holds.</p>
          </div>
        )}

        <AnimatePresence>
          {result?.evBets.map((bet) => (
            <motion.div
              key={bet.marketId}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setExpanded(expanded === bet.marketId ? null : bet.marketId)}
              className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-[11px] font-bold text-black leading-snug flex-1">
                  {bet.question}
                </p>
                <div className={cn("flex-shrink-0 px-2 py-1 border text-[9px] font-black uppercase", edgeColor(bet.edge))}>
                  +{(bet.edge * 100).toFixed(1)}% edge
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-[7px] font-black uppercase text-black/30 mb-0.5">Outcome</p>
                  <p className="text-[10px] font-black">{bet.outcome}</p>
                </div>
                <div>
                  <p className="text-[7px] font-black uppercase text-black/30 mb-0.5">Market</p>
                  <p className="text-[10px] font-black font-mono">{(bet.currentPrice * 100).toFixed(0)}¢</p>
                </div>
                <div>
                  <p className="text-[7px] font-black uppercase text-black/30 mb-0.5">Thales Est.</p>
                  <p className="text-[10px] font-black font-mono text-brand-primary">{(bet.geminiProbability * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-[7px] font-black uppercase text-black/30 mb-0.5">Kelly Size</p>
                  <p className="text-[10px] font-black font-mono">{(bet.kellyFraction * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary"
                    style={{ width: `${bet.confidence * 100}%` }}
                  />
                </div>
                <span className="text-[7px] font-black text-black/30 uppercase">
                  {(bet.confidence * 100).toFixed(0)}% conf
                </span>
              </div>

              <AnimatePresence>
                {expanded === bet.marketId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-black/10 space-y-3"
                  >
                    <div>
                      <p className="text-[8px] font-black uppercase text-black/30 mb-1">Thales Reasoning</p>
                      <p className="text-[10px] font-bold text-black/70 leading-snug">{bet.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://polymarket.com/event/${bet.marketId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[9px] font-black uppercase text-brand-primary hover:text-black transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Polymarket
                      </a>
                      <span className="text-[8px] text-black/20 font-mono">
                        Suggested: ${bet.suggestedSize.toFixed(0)} USDC
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Builder code footer */}
      <div className="p-4 bg-black/3 border-t border-black/5">
        <p className="text-[8px] font-black uppercase text-black/30 leading-tight">
          Thales earns USDC builder fees on every fill originating from these signals via Polymarket V2 builder attribution.
        </p>
      </div>
    </div>
  );
}
