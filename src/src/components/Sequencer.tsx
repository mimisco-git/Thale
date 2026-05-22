/**
 * Sequencer.tsx - REAL Arc block data via viem RPC.
 * Polls https://rpc.testnet.arc.network every 4s.
 * Chain ID 5042002, explorer: testnet.arcscan.app
 */
import { cn } from "../lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Database, Cpu, ShieldCheck, ExternalLink } from "lucide-react";
import { getRecentArcBlocks, ARC_EXPLORER } from "../services/arcClient";

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
}

export function Sequencer() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeTx, setActiveTx] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const lastBlockNum = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      const start = Date.now();
      try {
        const fresh = await getRecentArcBlocks(5);
        if (cancelled) return;

        if (fresh.length > 0) {
          setConnected(true);
          setLatency(Date.now() - start);

          // Only update if we have a new block
          if (fresh[0].number !== lastBlockNum.current) {
            lastBlockNum.current = fresh[0].number;
            setBlocks(fresh);
          }
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    };

    poll();
    const interval = setInterval(poll, 4_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-[500px] lg:h-[600px]">
      <div className="bg-black text-white p-6 lg:p-8 flex items-center justify-between border-b-[3px] border-black">
        <div className="flex items-center gap-4">
          <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-brand-primary animate-pulse" />
          <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em] lg:tracking-[0.4em]">
            Arc Sequencer // Live
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-brand-primary" : "bg-white/20")} />
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
            {connected ? `${latency}ms` : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="p-6 lg:p-10 space-y-8 lg:space-y-10 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
          <div className="p-4 lg:p-6 bg-slate-50 border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.05)]">
            <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">
              RPC Latency
            </p>
            <p className="text-2xl lg:text-4xl font-black font-mono tracking-tighter leading-none">
              {latency ? `${latency}ms` : "--"}
            </p>
          </div>
          <div className="p-4 lg:p-6 bg-slate-50 border-2 border-black shadow-[8px_8px_0_rgba(0,0,0,0.05)]">
            <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">
              Chain ID
            </p>
            <p className="text-2xl lg:text-4xl font-black font-mono text-brand-primary tracking-tighter leading-none">
              5042002
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.3em] border-b-[2px] border-black/10 pb-4 mb-4 lg:mb-6 flex items-center justify-between gap-4">
            <span className="flex items-center gap-3">
              <Database className="w-4 h-4 text-brand-accent" /> Propagation
            </span>
            <a
              href={ARC_EXPLORER}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] lg:text-[9px] font-black text-brand-primary flex items-center gap-1 hover:text-black transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              arcscan.app
            </a>
          </p>

          <div className="space-y-3">
            {blocks.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-[10px] font-black uppercase text-black/20">
                Connecting to Arc Testnet...
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {blocks.map((block, idx) => (
                  <motion.div
                    key={block.number}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setActiveTx(activeTx === block.hash ? null : block.hash)}
                    className={cn(
                      "flex flex-col p-4 lg:p-6 border-2 border-black/5 text-[10px] lg:text-[11px] font-mono cursor-pointer transition-all hover:border-black bg-white",
                      idx === 0
                        ? "border-[3px] border-brand-primary shadow-[8px_8px_0_rgba(255,59,48,0.1)]"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-4 lg:gap-6">
                        <a
                          href={`${ARC_EXPLORER}/block/${block.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-black text-black text-xs lg:text-sm hover:text-brand-primary transition-colors"
                        >
                          #{block.number.toLocaleString()}
                        </a>
                        <span className="text-black/40 underline decoration-dotted tracking-tighter truncate max-w-[120px] sm:max-w-none">
                          {block.hash.slice(0, 14)}...{block.hash.slice(-6)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <span className="font-black text-black">{block.txCount} TXS</span>
                        <span className="text-[8px] lg:text-[9px] opacity-30 font-bold whitespace-nowrap">
                          {new Date(block.timestamp * 1000).toLocaleTimeString([], { hour12: false })}
                        </span>
                      </div>
                    </div>
                    {activeTx === block.hash && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-4 pt-4 border-t-2 border-black/5 flex flex-col gap-2 text-[8px] lg:text-[9px] font-black uppercase overflow-hidden"
                      >
                        <div className="flex justify-between">
                          <span className="opacity-40">Chain:</span>
                          <span className="text-brand-primary">Arc Testnet (5042002)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-40">RPC:</span>
                          <span>rpc.testnet.arc.network</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-40">Finality:</span>
                          <span className="text-green-600">DETERMINISTIC</span>
                        </div>
                        <a
                          href={`${ARC_EXPLORER}/block/${block.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-primary hover:underline mt-1 flex items-center gap-1"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          View on ArcScan
                        </a>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="pt-8 lg:pt-10 mt-6 lg:mt-10 border-t-[3px] border-black border-dashed space-y-4 lg:space-y-6">
          <div className="flex items-center gap-4 lg:gap-6 p-4 lg:p-6 bg-black text-white">
            <Cpu className="w-6 h-6 lg:w-7 lg:h-7 text-brand-accent" />
            <div>
              <p className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">
                Malachite BFT Consensus
              </p>
              <p className="text-xs lg:text-sm font-black uppercase tracking-[0.1em]">
                ARC_SHANNON_TESTNET
              </p>
            </div>
          </div>

          <div className="p-4 lg:p-6 bg-brand-primary/5 border-2 border-brand-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-1.5 lg:p-2 bg-brand-primary rounded-full">
                <ShieldCheck className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
              </div>
              <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.1em] lg:tracking-[0.2em] text-brand-primary">
                Slash-Bond Oracle
              </span>
            </div>
            <span className="hidden sm:inline text-[10px] font-mono font-black text-black/40 animate-pulse">
              REPUTATION_SYNCING...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
