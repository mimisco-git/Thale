/**
 * ThalesMonitor.tsx
 * Real trace history from Firestore + ArcScan links.
 * No fake data. Empty state shown honestly.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, Globe, ChevronRight, ShieldCheck, ExternalLink } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { cn } from "../lib/utils";
import { ARC_EXPLORER } from "../services/arcClient";

interface Trace {
  id: string;
  type: string;
  amount: string;
  status: string;
  agent: string;
  context: string;
  txHash: string;
  timestamp: string;
  details?: any;
}

export function ThalesMonitor() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // Show all recent traces (not just current user) for a live feed feel
    const q = query(
      collection(db, "traces"),
      orderBy("timestamp", "desc"),
      limit(15)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: Trace[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id || d.id,
          type: data.type || "Unknown",
          amount: data.amount || "0",
          status: data.status || "Pending",
          agent: data.agent || "Thales",
          context: data.context || "",
          txHash: data.txHash || "",
          timestamp: data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp || new Date().toISOString(),
          details: data.details,
        };
      });
      setTraces(items);
    });

    return () => unsub();
  }, []);

  const txExplorerUrl = (txHash: string) => {
    if (txHash && txHash.startsWith("0x") && txHash.length > 20) {
      return `${ARC_EXPLORER}/tx/${txHash}`;
    }
    return null;
  };

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.05)] h-full flex flex-col">
      <div className="p-6 border-b-[3px] border-black flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter uppercase leading-none">Substrate Monitor</h2>
            <p className="text-[8px] font-black uppercase text-black/30 tracking-widest mt-0.5">
              {traces.length} traces on-chain
            </p>
          </div>
        </div>
        <div className="w-3 h-3 bg-brand-primary animate-ping" />
      </div>

      <div className="flex-1 p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {traces.length === 0 && (
          <div className="p-12 text-center space-y-4 opacity-30">
            <div className="w-12 h-12 border-2 border-black border-dashed flex items-center justify-center mx-auto">
              <Globe className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">No traces yet</p>
            <p className="text-[8px] font-bold text-black/50">Run an intent above to generate your first trace</p>
          </div>
        )}

        {traces.map((trace, i) => (
          <motion.div
            key={trace.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setExpandedId(expandedId === trace.id ? null : trace.id)}
            className={cn(
              "p-5 border-[2px] border-black/5 hover:border-black transition-all cursor-pointer bg-white",
              expandedId === trace.id && "border-black"
            )}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[8px] font-mono text-black/30 font-black mb-1 uppercase tracking-widest">{trace.id}</p>
                <h3 className="text-base font-black text-black uppercase tracking-tighter leading-none">{trace.type}</h3>
              </div>
              <p className="font-black font-mono text-sm tracking-tighter text-brand-primary">{trace.amount}</p>
            </div>

            <AnimatePresence>
              {expandedId === trace.id && trace.context && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <p className="text-[10px] leading-tight border-l-4 border-brand-primary pl-3 font-bold uppercase text-black/50 mb-3">
                    {trace.context.slice(0, 200)}{trace.context.length > 200 ? "..." : ""}
                  </p>
                  {txExplorerUrl(trace.txHash) && (
                    <a
                      href={txExplorerUrl(trace.txHash)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[9px] font-black uppercase text-brand-primary hover:text-black transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on ArcScan
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 border border-black",
                  trace.status === "Finalized" ? "bg-black" : "bg-brand-primary animate-pulse"
                )} />
                <span className="text-[8px] font-black uppercase tracking-widest text-black/40">{trace.status}</span>
                <span className="text-[7px] font-mono text-black/20">
                  {new Date(trace.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
              </div>
              <ChevronRight className={cn("w-4 h-4 text-black/10 transition-transform", expandedId === trace.id && "rotate-90")} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-6 mt-auto border-t-[3px] border-black bg-black text-white">
        <div className="flex items-center gap-4 mb-2">
          <ShieldCheck className="w-5 h-5 text-brand-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-widest">Slash-Bond Protection</h3>
        </div>
        <p className="text-[8px] text-white/30 font-black uppercase tracking-tighter leading-tight">
          AgoraEconomicRouter.sol bonds USDC to every reasoning trace. SLA deviations trigger autonomous slashing on Arc.
        </p>
        <a
          href={`${ARC_EXPLORER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[8px] font-black text-brand-primary hover:text-white transition-colors mt-2"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          ArcScan Explorer
        </a>
      </div>
    </div>
  );
}
