import { cn } from "../lib/utils";
import React from "react";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { ChevronRight, Globe, Shield, Zap, ArrowRight } from "lucide-react";

interface LandingPageProps {
  onLaunch: () => void;
}

export function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-swiss-bg text-black font-sans selection:bg-brand-primary/30">
      {/* Navigation */}
      <nav className="flex flex-col sm:flex-row justify-between items-center p-4 sm:p-8 border-b-2 border-black sticky top-0 bg-swiss-bg z-50 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black flex items-center justify-center p-1.5 sm:p-2">
            <Logo className="text-white" />
          </div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">Thales // Thinking Market Participant</span>
        </div>
        <button 
          onClick={onLaunch}
          className="w-full sm:w-auto bg-black text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary transition-colors flex items-center justify-center gap-3 group"
        >
          Enter Agora
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </nav>

      {/* Hero Section */}
      <section className="px-6 lg:px-12 py-16 lg:py-48 w-full border-x-2 border-black overflow-hidden">
        <div className="space-y-8 lg:space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-3 h-3 lg:w-4 lg:h-4 bg-brand-primary" />
            <span className="premium-label tracking-[0.3em] lg:tracking-[0.5em] text-[10px] lg:text-xs text-brand-primary">Adaptive Economic Substrate // v3.0</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl sm:text-8xl md:text-[10rem] lg:text-[12rem] font-black tracking-tighter leading-[0.8] uppercase"
          >
            Liquid <br /> 
            <span className="text-brand-primary italic">Intelligence.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl lg:text-3xl font-bold max-w-2xl border-l-[6px] lg:border-l-8 border-black pl-6 lg:pl-8 uppercase leading-tight"
          >
            The Self-Healing Economic Router for the Global Agora. Powered by Circle and Agentic Reasoning Traces.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-8 lg:pt-12 flex flex-col items-stretch sm:flex-row gap-6"
          >
            <button 
              onClick={onLaunch}
              className="bg-black text-white px-8 lg:px-12 py-6 lg:py-8 text-lg lg:text-xl font-black uppercase tracking-widest hover:bg-brand-primary transition-all shadow-[12px_12px_0_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2 whitespace-nowrap"
            >
              Access Substrate
            </button>
            <div className="flex items-center gap-6 lg:gap-8 px-6 lg:px-8 border-2 border-black/10 h-20 sm:h-auto">
              <div className="text-center flex-1">
                <p className="text-xl lg:text-2xl font-black text-black">452ms</p>
                <p className="text-[9px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-none">Finality</p>
              </div>
              <div className="w-px h-10 lg:h-12 bg-black/10" />
              <div className="text-center flex-1">
                <p className="text-xl lg:text-2xl font-black text-black uppercase">USYC</p>
                <p className="text-[9px] lg:text-[10px] font-bold text-black/40 uppercase tracking-widest leading-none">Yield-State</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 w-full border-x-2 border-black space-y-16 lg:space-y-24 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-start">
          <div className="space-y-6 lg:space-y-8">
            <span className="premium-label">01 // Agentic Agency</span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none">Beyond Passive Bridging.</h2>
            <p className="text-lg lg:text-xl font-bold text-black border-l-[6px] lg:border-l-8 border-black pl-6 lg:pl-8 uppercase leading-tight">
              Existing liquidity solutions are passive. The Agora Economic Router is agentic. It reasons about routing. yield. and slippage delta in real-time. providing deterministic certainty for every hop.
            </p>
          </div>
          <div className="bg-black p-8 lg:p-12 text-white space-y-6 lg:space-y-8 shadow-[16px_16px_0_rgba(217,119,6,0.2)] lg:shadow-[24px_24px_0_rgba(217,119,6,0.2)]">
            <Zap className="w-8 h-8 lg:w-12 lg:h-12 text-brand-primary" />
            <div className="space-y-3 lg:space-y-4">
              <p className="text-[10px] lg:text-sm font-black uppercase tracking-widest opacity-40">System Efficiency</p>
              <div className="flex justify-between items-end border-b border-white/10 pb-3 lg:pb-4">
                <span className="text-2xl lg:text-4xl font-black uppercase tracking-tighter">THALES-CORE</span>
                <span className="text-brand-primary font-mono font-black text-sm lg:text-base">452ms</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/10 pb-3 lg:pb-4 opacity-30">
                <span className="text-base lg:text-xl font-bold uppercase tracking-tight">TRADITIONAL</span>
                <span className="font-mono font-bold text-xs lg:text-sm whitespace-nowrap">3 TO 5 DAYS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start pt-16 lg:pt-24 border-t-2 border-black/10">
          <div className="order-2 lg:order-1 flex flex-col gap-6 lg:gap-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 lg:p-8 bg-slate-100 border-2 border-black">
                <p className="text-[10px] lg:text-sm font-black uppercase mb-2 lg:mb-4">In-Flight Yield</p>
                <p className="text-2xl lg:text-4xl font-black text-brand-primary font-mono">USYC</p>
                <p className="text-[8px] lg:text-[10px] font-bold uppercase mt-1 lg:mt-2 opacity-40">Yield-Bearing Assets</p>
              </div>
              <div className="p-6 lg:p-8 bg-slate-100 border-2 border-black">
                <p className="text-[10px] lg:text-sm font-black uppercase mb-2 lg:mb-4">Reasoning XP</p>
                <p className="text-2xl lg:text-4xl font-black text-black font-mono">1.2M+</p>
                <p className="text-[8px] lg:text-[10px] font-bold uppercase mt-1 lg:mt-2 opacity-40">Verified Intent Traces</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6 lg:space-y-8">
            <span className="premium-label">02 // The Economic Substrate</span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none">Self-Healing. <br /> Non-Custodial.</h2>
            <p className="text-lg lg:text-xl font-bold text-black border-l-[6px] lg:border-l-8 border-black pl-6 lg:pl-8 uppercase leading-tight">
              By utilizing integrated Performance Bonds. agents are incentivized to provide perfect routing. Failing to reach finality results in automated slashing. Ensuring the Agora remains liquid and pure.
            </p>
          </div>
        </div>
      </section>

      {/* Grid of Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 border-y-2 border-black bg-white">
        {[
          { icon: Shield, title: "Performance Bonds", desc: "Agents stake capital in the Agora substrate to prove commitment to deterministic finality." },
          { icon: Zap, title: "In-Flight Yield", desc: "Protocol fees are $0 because the agent harvests yield from tokenized assets during the routing window." },
          { icon: Globe, title: "Reasoning Traces", desc: "Every transaction includes a cryptographic reasoning trace justifying the economic route." }
        ].map((feat, i) => (
          <div key={feat.title} className={cn(
            "p-8 lg:p-12 border-black",
            i !== 2 ? "border-b-2 md:border-b-0 md:border-r-2" : "border-b-0"
          )}>
            <feat.icon className="w-8 h-8 lg:w-12 lg:h-12 mb-6 lg:mb-8 text-brand-primary" />
            <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tight mb-3 lg:mb-4">{feat.title}</h3>
            <p className="text-base lg:text-lg font-bold text-black/60 leading-tight uppercase font-mono">{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="p-8 lg:p-12 bg-black text-white flex flex-col lg:flex-row justify-between items-center gap-8 lg:gap-12">
        <div className="flex items-center gap-4 opacity-50">
          <div className="w-6 h-6 border-2 border-white p-1">
            <Logo className="text-white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.5em] text-center">Thales // Thinking Market Participant</span>
        </div>
        <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.5em] opacity-30 text-center order-3 lg:order-2">
          © 2026 THALES ECONOMIC REASONING // PHYSICS-BY-ARC
        </p>
        <div className="flex gap-6 lg:gap-8 opacity-50 order-2 lg:order-3">
          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Twitter</span>
          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors">GitHub</span>
          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Docs</span>
        </div>
      </footer>
    </div>
  );
}
