/**
 * UnifiedBalanceSidebar.tsx
 * Reads real balances from /api/liquidity/balance (viem multicall).
 * Requires a connected wallet address. Falls back gracefully.
 */
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Wallet, RefreshCw, ExternalLink } from "lucide-react";
import { auth } from "../lib/firebase";
import { getOrCreateWallet } from "../services/circleApi";
import { ARC_EXPLORER, ARC_CONTRACTS } from "../services/arcClient";

interface Balance {
  totalUSDC: number;
  usdyc: number;
  eurc: number;
  breakdown: { network: string; balance: number; currency: string }[];
}

export function UnifiedBalanceSidebar() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async (addr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/liquidity/balance?address=${addr}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (err) {
      console.warn("[UnifiedBalance] fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const wallet = await getOrCreateWallet(user.uid);
        setAddress(wallet.address);
        fetchBalance(wallet.address);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="bg-white border-[3px] border-black shadow-[16px_16px_0_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="bg-black text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-brand-primary" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">Unified Balance</span>
        </div>
        {address && (
          <button
            onClick={() => fetchBalance(address)}
            disabled={loading}
            className="text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {!address ? (
          <div className="py-8 text-center">
            <p className="text-[10px] font-black uppercase text-black/30 tracking-widest">
              Connect to view balances
            </p>
          </div>
        ) : balance ? (
          <>
            {/* Total USDC */}
            <div className="bg-black text-white p-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Total USDC</p>
              <p className="text-4xl font-black font-mono text-brand-primary">
                {balance.totalUSDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[8px] text-white/20 mt-1 uppercase">Across Arc + Ethereum + Base</p>
            </div>

            {/* USYC + EURC */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border-2 border-black/5 p-4">
                <p className="text-[8px] font-black uppercase text-black/30 mb-1">USYC</p>
                <p className="text-xl font-black font-mono text-brand-primary">
                  {balance.usdyc.toFixed(4)}
                </p>
                <a
                  href={`${ARC_EXPLORER}/address/${ARC_CONTRACTS.USYC}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[7px] text-brand-primary hover:underline flex items-center gap-0.5 mt-1"
                >
                  <ExternalLink className="w-2 h-2" />
                  On-chain
                </a>
              </div>
              <div className="bg-slate-50 border-2 border-black/5 p-4">
                <p className="text-[8px] font-black uppercase text-black/30 mb-1">EURC</p>
                <p className="text-xl font-black font-mono">{balance.eurc.toFixed(4)}</p>
                <a
                  href={`${ARC_EXPLORER}/address/${ARC_CONTRACTS.EURC}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[7px] text-brand-primary hover:underline flex items-center gap-0.5 mt-1"
                >
                  <ExternalLink className="w-2 h-2" />
                  On-chain
                </a>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2">
              {balance.breakdown.map((item) => (
                <div key={item.network} className="flex justify-between items-center py-2 border-b border-black/5">
                  <span className="text-[9px] font-black uppercase text-black/40">{item.network}</span>
                  <span className="text-[10px] font-black font-mono">
                    {item.balance.toFixed(2)} {item.currency}
                  </span>
                </div>
              ))}
            </div>

            {/* Address */}
            <a
              href={`${ARC_EXPLORER}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[8px] font-black uppercase text-brand-primary hover:text-black transition-colors"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              {address.slice(0, 10)}...{address.slice(-8)}
            </a>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[9px] font-black uppercase text-black/20 mt-3">Loading balances...</p>
          </div>
        )}
      </div>
    </div>
  );
}
