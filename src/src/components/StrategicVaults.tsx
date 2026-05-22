/**
 * StrategicVaults.tsx
 * Real vault strategies backed by Arc contracts.
 * APY from live USYC Teller. TVL honest (shows 0 until funded).
 */
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Zap, TrendingUp, ArrowUpRight, Lock, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import { getLiveUSYCRate, ARC_CONTRACTS, ARC_EXPLORER } from "../services/arcClient";

interface Vault {
  id: string;
  name: string;
  description: string;
  apy: string;
  apyReal?: number;
  risk: "Low" | "Moderate" | "Aggressive";
  tvlLabel: string;
  strategy: string;
  contract: string;
  contractLabel: string;
}

export function StrategicVaults() {
  const [usycAPY, setUsycAPY] = useState<number | null>(null);
  const [rateSource, setRateSource] = useState<string>("loading");

  useEffect(() => {
    getLiveUSYCRate().then(({ rate, source }) => {
      setUsycAPY(parseFloat(((rate - 1) * 365 * 100).toFixed(2)));
      setRateSource(source);
    }).catch(() => {
      setUsycAPY(5.2);
      setRateSource("fallback");
    });
  }, []);

  const vaults: Vault[] = [
    {
      id: "V-1",
      name: "USYC Yield Vault",
      description: "Routes idle USDC into USYC via the Arc Teller contract for continuous yield. Capital stays on Arc. Sub-second entry and exit.",
      apy: usycAPY !== null ? `${usycAPY.toFixed(2)}%` : "...",
      apyReal: usycAPY ?? undefined,
      risk: "Low",
      tvlLabel: "0.00",
      strategy: "Teller Deposit",
      contract: ARC_CONTRACTS.USYC_TELLER,
      contractLabel: "USYC Teller",
    },
    {
      id: "V-2",
      name: "FX Peg Arb",
      description: "Detects EURC/USDC peg deviations via StableFX FxEscrow. Executes when spread exceeds 8 bps. Deterministic settlement on Arc.",
      apy: "Variable",
      risk: "Moderate",
      tvlLabel: "0.00",
      strategy: "Peg Mean Reversion",
      contract: ARC_CONTRACTS.FX_ESCROW,
      contractLabel: "FxEscrow",
    },
    {
      id: "V-3",
      name: "CCTP Bridge Arb",
      description: "Uses CCTP V2 (domain 26) to detect and execute cross-chain USDC price gaps between Arc, Base, and Ethereum. Routes via Gateway.",
      apy: "Variable",
      risk: "Aggressive",
      tvlLabel: "0.00",
      strategy: "Cross-Chain Arb",
      contract: ARC_CONTRACTS.CCTP_TOKEN_MESSENGER,
      contractLabel: "CCTP V2",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <span className="premium-label text-black/40 tracking-[0.4em]">STRATEGIC DEPLOYMENT</span>
          <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter">AI Reasoning Vaults</h2>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase text-black/30">USYC Rate Source</p>
          <p className={cn("text-[10px] font-black uppercase", rateSource === "onchain" ? "text-green-600" : "text-black/40")}>
            {rateSource === "onchain" ? "On-chain" : rateSource}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {vaults.map((vault) => (
          <motion.div
            key={vault.id}
            whileHover={{ y: -8 }}
            className="bg-white border-[3px] border-black p-8 flex flex-col justify-between shadow-[12px_12px_0_rgba(0,0,0,0.05)] transition-all"
          >
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 flex items-center justify-center border-2 border-black bg-slate-50">
                  {vault.id === "V-1" && <Zap className="w-6 h-6" />}
                  {vault.id === "V-2" && <TrendingUp className="w-6 h-6" />}
                  {vault.id === "V-3" && <ShieldCheck className="w-6 h-6" />}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">APY</p>
                  <p className={cn("text-2xl font-black font-mono", vault.apyReal !== undefined ? "text-brand-primary" : "text-black/40")}>
                    {vault.apy}
                  </p>
                  {vault.apyReal !== undefined && (
                    <p className="text-[7px] font-black uppercase text-black/20">{rateSource}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">{vault.name}</h3>
                <p className="text-xs font-bold text-black/40 leading-relaxed uppercase">{vault.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t-[2px] border-black/5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">Risk</p>
                  <p className="text-xs font-black uppercase">{vault.risk}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">TVL</p>
                  <p className="text-xs font-black font-mono">{vault.tvlLabel} USDC</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href={`${ARC_EXPLORER}/address/${vault.contract}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[8px] font-black uppercase text-brand-primary hover:text-black transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {vault.contractLabel}: {vault.contract.slice(0, 10)}...
              </a>
              <button className="w-full py-5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 bg-slate-100 text-black/40 hover:bg-black hover:text-white">
                <Lock className="w-4 h-4" />
                Subscribe Agent
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
