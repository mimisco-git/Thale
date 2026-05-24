/**
 * DocsPage.tsx - Thales technical documentation
 * Accessible at /docs
 */
import React, { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, ChevronRight, Code, Zap, Shield, Globe, TrendingUp, Copy, CheckCircle } from "lucide-react";
import { ARC_CONTRACTS, ARC_EXPLORER } from "../services/arcClient";
import { cn } from "../lib/utils";

const SECTIONS = [
  "Overview",
  "Architecture",
  "Arc Contracts",
  "API Reference",
  "Agent Reasoning",
  "Circle Stack",
  "Smart Contract",
];

export function DocsPage() {
  const [active, setActive] = useState("Overview");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex">

      {/* Sidebar nav */}
      <aside className="hidden lg:flex w-64 border-r-[3px] border-black bg-white flex-col sticky top-0 h-screen">
        <div className="p-6 border-b-[3px] border-black">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-black/30 mb-1">Thales</p>
          <h1 className="text-xl font-black uppercase tracking-tighter">Documentation</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={cn(
                "w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                active === s ? "bg-black text-white" : "text-black/40 hover:text-black hover:bg-black/5"
              )}
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", active === s && "rotate-90")} />
              {s}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-black/10 space-y-2">
          <a href="https://github.com/mimisco-git/Thale" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[9px] font-black uppercase text-black/40 hover:text-black transition-colors">
            <ExternalLink className="w-3 h-3" /> GitHub
          </a>
          <a href={ARC_EXPLORER} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[9px] font-black uppercase text-black/40 hover:text-brand-primary transition-colors">
            <ExternalLink className="w-3 h-3" /> ArcScan
          </a>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 lg:px-16 py-12 space-y-12">

        {/* Mobile section select */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => setActive(s)}
              className={cn("px-3 py-2 text-[8px] font-black uppercase whitespace-nowrap border-2 flex-shrink-0",
                active === s ? "bg-black text-white border-black" : "bg-white text-black/40 border-black/10"
              )}>
              {s}
            </button>
          ))}
        </div>

        {active === "Overview" && (
          <DocSection title="Overview" eyebrow="Thales Documentation">
            <p className="text-base text-black/60 leading-relaxed">
              Thales is an autonomous economic reasoning agent built on Arc (Circle's L1 blockchain).
              It runs every 60 seconds, reads live on-chain state, decides what to do with idle USDC,
              and executes on-chain with sub-second finality.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                { icon: Zap, label: "Sub-second finality", desc: "Arc Malachite BFT consensus" },
                { icon: Shield, label: "Slash-bonded", desc: "AgoraEconomicRouter.sol" },
                { icon: TrendingUp, label: "~5.2% APY", desc: "USYC Teller on Arc" },
              ].map((item) => (
                <div key={item.label} className="bg-white border-[3px] border-black p-6">
                  <item.icon className="w-5 h-5 text-brand-primary mb-3" />
                  <p className="text-[11px] font-black uppercase">{item.label}</p>
                  <p className="text-[9px] text-black/40 font-bold uppercase mt-1">{item.desc}</p>
                </div>
              ))}
            </div>

            <H2>Quick Start</H2>
            <CodeBlock id="quickstart" onCopy={copy} copied={copied}>{`git clone git@github.com:mimisco-git/Thale.git
cd Thale
cp .env.example .env
# Add: GROQ_API_KEY, ARC_PRIVATE_KEY
npm install && npm run dev`}</CodeBlock>

            <H2>Live URLs</H2>
            <LinkList items={[
              { label: "Live App", href: "https://thale-one.vercel.app" },
              { label: "Stats Page", href: "https://thale-one.vercel.app/stats" },
              { label: "GitHub", href: "https://github.com/mimisco-git/Thale" },
              { label: "ArcScan Explorer", href: ARC_EXPLORER },
            ]} />
          </DocSection>
        )}

        {active === "Architecture" && (
          <DocSection title="Architecture" eyebrow="System Design">
            <p className="text-base text-black/60 leading-relaxed">
              Thales is a React + TypeScript frontend deployed on Vercel, with 10 serverless API functions
              that call Arc directly via raw JSON-RPC. No library dependencies in the API layer.
            </p>

            <H2>Directory Structure</H2>
            <CodeBlock id="structure" onCopy={copy} copied={copied}>{`Thale/
├── api/                    # Vercel serverless functions
│   ├── reason.ts           # Groq/Gemini reasoning engine
│   ├── usyc-rate.ts        # Live USYC rate from Teller
│   ├── arc-block.ts        # Latest Arc block
│   ├── polymarket-scan.ts  # +EV bet scanner
│   ├── nfi-oracle.ts       # Rugpull signal detector
│   └── circle-wallet.ts    # Circle Programmable Wallets
├── src/
│   ├── components/         # React UI components
│   ├── services/
│   │   ├── arcClient.ts    # viem Arc client + contracts
│   │   ├── autonomousAgent.ts  # 60s autonomous loop
│   │   └── AgentOrchestrator.ts  # Intent execution
│   └── lib/
│       └── firebase.ts     # Auth + Firestore
├── contracts/
│   └── AgoraEconomicRouter.sol  # Performance bonds
└── vercel.json`}</CodeBlock>

            <H2>Autonomous Agent Loop</H2>
            <CodeBlock id="loop" onCopy={copy} copied={copied}>{`Every 60 seconds:
  1. getLatestArcBlock()     → Arc RPC
  2. getLiveUSYCRate()       → USYC Teller.totalAssets/totalSupply
  3. POST /api/reason        → Groq LLaMA 3.3 70B
  4. decision: HARVEST_YIELD | REBALANCE_TO_EURC | HOLD | ...
  5. POST /api/agent-execute → Arc tx (if ARC_PRIVATE_KEY set)
  6. addTrace()              → Firestore`}</CodeBlock>
          </DocSection>
        )}

        {active === "Arc Contracts" && (
          <DocSection title="Arc Contracts" eyebrow="Chain ID 5042002">
            <p className="text-base text-black/60 leading-relaxed">
              All contract addresses are official Arc Testnet addresses sourced from docs.arc.network.
              Every address links to ArcScan for verification.
            </p>

            <div className="space-y-3 mt-6">
              {[
                { label: "USDC", addr: ARC_CONTRACTS.USDC, desc: "Native gas token on Arc" },
                { label: "USYC", addr: ARC_CONTRACTS.USYC, desc: "Tokenized money market fund" },
                { label: "USYC Teller", addr: ARC_CONTRACTS.USYC_TELLER, desc: "ERC-4626 vault for yield" },
                { label: "EURC", addr: ARC_CONTRACTS.EURC, desc: "Digital euro" },
                { label: "CCTP TokenMessengerV2", addr: ARC_CONTRACTS.CCTP_TOKEN_MESSENGER, desc: "Cross-chain USDC (domain 26)" },
                { label: "CCTP MessageTransmitterV2", addr: ARC_CONTRACTS.CCTP_MESSAGE_TRANSMITTER, desc: "Message receipt" },
                { label: "Gateway Wallet", addr: ARC_CONTRACTS.GATEWAY_WALLET, desc: "Unified balance" },
                { label: "StableFX FxEscrow", addr: ARC_CONTRACTS.FX_ESCROW, desc: "USDC/EURC settlement" },
              ].map((c) => (
                <div key={c.label} className="bg-white border-[2px] border-black/10 p-4 flex items-center justify-between hover:border-black transition-colors group">
                  <div>
                    <p className="text-[10px] font-black uppercase">{c.label}</p>
                    <p className="text-[8px] text-black/30 font-bold uppercase mt-0.5">{c.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-[9px] font-mono text-black/40">{c.addr.slice(0, 10)}...{c.addr.slice(-6)}</code>
                    <a href={`${ARC_EXPLORER}/address/${c.addr}`} target="_blank" rel="noopener noreferrer"
                      className="text-brand-primary hover:text-black transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <H2>Reading USYC Rate</H2>
            <CodeBlock id="usyc" onCopy={copy} copied={copied}>{`// Raw JSON-RPC call (no library needed)
const response = await fetch("https://rpc.testnet.arc.network", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0", method: "eth_call", id: 1,
    params: [{
      to: "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A",
      data: "0x01e1d114" // totalAssets()
    }, "latest"]
  })
});
const { result } = await response.json();
const totalAssets = parseInt(result, 16) / 1_000_000; // 6 decimals`}</CodeBlock>
          </DocSection>
        )}

        {active === "API Reference" && (
          <DocSection title="API Reference" eyebrow="Vercel Serverless Functions">
            {[
              { method: "POST", path: "/api/reason", desc: "Run Groq/Gemini reasoning on an intent", body: '{ "intent": "string", "mode": "intent|autonomous" }' },
              { method: "GET",  path: "/api/usyc-rate", desc: "Live USYC/USDC rate from Arc Teller" },
              { method: "GET",  path: "/api/arc-block", desc: "Latest Arc block number and hash" },
              { method: "GET",  path: "/api/fx-rfq?amount=1000&from=USDC&to=USYC", desc: "StableFX RFQ quote" },
              { method: "GET",  path: "/api/polymarket-scan", desc: "Scan Polymarket for +EV bets" },
              { method: "GET",  path: "/api/nfi-oracle", desc: "NFI rugpull signals from GitHub commits" },
              { method: "GET",  path: "/api/liquidity-balance?address=0x...", desc: "Multi-chain USDC/USYC/EURC balances" },
              { method: "POST", path: "/api/circle-wallet", desc: "Create Circle Programmable Wallet", body: '{ "userId": "string" }' },
              { method: "POST", path: "/api/agent-execute", desc: "Execute agent decision on Arc", body: '{ "action": "HARVEST_YIELD", "estimatedAlpha": 12.5 }' },
              { method: "GET",  path: "/api/test-gemini", desc: "Test AI API keys (Groq + Gemini)" },
            ].map((ep) => (
              <div key={ep.path} className="bg-white border-[2px] border-black/10 p-5 hover:border-black transition-colors mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn("px-2 py-0.5 text-[8px] font-black uppercase",
                    ep.method === "GET" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  )}>{ep.method}</span>
                  <code className="text-[10px] font-mono font-black">{ep.path}</code>
                </div>
                <p className="text-[9px] text-black/40 font-bold uppercase">{ep.desc}</p>
                {ep.body && <code className="block text-[8px] font-mono text-black/30 mt-2 bg-slate-50 p-2">{ep.body}</code>}
              </div>
            ))}
          </DocSection>
        )}

        {active === "Agent Reasoning" && (
          <DocSection title="Agent Reasoning" eyebrow="Trading-R1 Pattern">
            <p className="text-base text-black/60 leading-relaxed">
              Every agent decision produces a dual-path reasoning trace: the naive route (do nothing)
              vs the Thales route (optimized). The trace is the product.
            </p>

            <H2>Decision Schema</H2>
            <CodeBlock id="schema" onCopy={copy} copied={copied}>{`{
  "action": "HARVEST_YIELD | REBALANCE_TO_EURC | CCTP_BRIDGE | HOLD",
  "confidence": 0.85,
  "reasoning": "USYC APY above threshold, routing idle USDC to Teller",
  "naiveRoute": "USDC sits idle at 0% APY",
  "thalesRoute": "Deposit via USYC Teller for ~5.2% APY",
  "estimatedAlpha": 12.50,
  "executionPlan": ["Approve USDC", "Call Teller deposit()", "Verify receipt"],
  "riskNotes": "Low risk, deterministic Arc finality",
  "arcBlock": 43826513,
  "usycRate": 1.1163,
  "usycAPY": 5.2
}`}</CodeBlock>

            <H2>Calling the Reasoning API</H2>
            <CodeBlock id="api-call" onCopy={copy} copied={copied}>{`const response = await fetch("/api/reason", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    intent: "Route 1000 USDC to USYC for maximum yield",
    mode: "intent" // or "autonomous"
  })
});
const plan = await response.json();
// plan.reasoningTrace.naiveRoute vs plan.reasoningTrace.thalesRoute`}</CodeBlock>
          </DocSection>
        )}

        {active === "Circle Stack" && (
          <DocSection title="Circle Stack" eyebrow="Developer Platform">
            <div className="space-y-4">
              {[
                { tool: "USYC Teller", use: "Yield harvesting. Call totalAssets/totalSupply for live rate. ERC-4626 compatible.", link: "https://developers.circle.com" },
                { tool: "CCTP V2", use: "Cross-chain USDC. depositForBurn on TokenMessengerV2 (domain 26). Poll Iris API for attestation.", link: "https://developers.circle.com/stablecoins/cctp-getting-started" },
                { tool: "Gateway", use: "Unified USDC balance across chains. Sub-500ms cross-chain transfers.", link: "https://developers.circle.com" },
                { tool: "Programmable Wallets", use: "Create per-user wallets via /api/circle-wallet. Add CIRCLE_API_KEY to Vercel.", link: "https://developers.circle.com/w3s/docs/programmable-wallets-create-your-first-wallet" },
                { tool: "StableFX FxEscrow", use: "USDC/EURC deterministic settlement. GET /api/fx-rfq for live quote.", link: "https://developers.circle.com" },
                { tool: "USDC + EURC", use: "Native settlement on Arc. All fees in USDC. ERC-20 balanceOf via JSON-RPC.", link: "https://developers.circle.com" },
              ].map((item) => (
                <div key={item.tool} className="bg-white border-[2px] border-black/10 p-5 hover:border-black transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase mb-1">{item.tool}</p>
                      <p className="text-[9px] text-black/50 font-bold leading-relaxed">{item.use}</p>
                    </div>
                    <a href={item.link} target="_blank" rel="noopener noreferrer"
                      className="text-brand-primary hover:text-black transition-colors flex-shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </DocSection>
        )}

        {active === "Smart Contract" && (
          <DocSection title="Smart Contract" eyebrow="AgoraEconomicRouter.sol">
            <p className="text-base text-black/60 leading-relaxed">
              AgoraEconomicRouter.sol handles performance bonds, reputation tracking, and on-chain
              reasoning trace pinning. Deployed on Arc Testnet (Chain ID 5042002).
            </p>

            <H2>Key Functions</H2>
            <CodeBlock id="contract" onCopy={copy} copied={copied}>{`// Stake USDC as performance bond (min 1 USDC)
function stakePerformanceBond(uint256 amount) external

// Pin a reasoning trace hash on-chain
function submitReasoningTrace(
  bytes32 traceId,
  string calldata strategy,
  uint256 estimatedAlpha
) external onlyActiveAgent

// Slash an agent for SLA violation
function slashPerformance(
  address agent,
  uint256 penaltyAmount,
  string calldata reason
) external onlyArbiter

// Get routing priority from reasoning XP
function getRoutingPriority(address agent) 
  public view returns (uint256)`}</CodeBlock>

            <H2>Deploy to Arc Testnet</H2>
            <CodeBlock id="deploy" onCopy={copy} copied={copied}>{`# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Deploy
forge create contracts/AgoraEconomicRouter.sol:AgoraEconomicRouter \\
  --rpc-url https://rpc.testnet.arc.network \\
  --private-key $ARC_PRIVATE_KEY

# Verify on ArcScan
forge verify-contract <DEPLOYED_ADDRESS> \\
  contracts/AgoraEconomicRouter.sol:AgoraEconomicRouter \\
  --verifier blockscout \\
  --verifier-url https://testnet.arcscan.app/api`}</CodeBlock>

            <div className="flex gap-4 mt-6">
              <a href="https://github.com/mimisco-git/Thale/blob/main/contracts/AgoraEconomicRouter.sol"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-black text-white text-[9px] font-black uppercase hover:bg-brand-primary transition-colors">
                <ExternalLink className="w-3 h-3" /> View on GitHub
              </a>
              <a href="https://testnet.arcscan.app/contract-verification"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-black text-black text-[9px] font-black uppercase hover:bg-black hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" /> Verify on ArcScan
              </a>
            </div>
          </DocSection>
        )}

      </main>
    </div>
  );
}

/* ── Sub-components ── */

function DocSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="border-b-[3px] border-black pb-6">
        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-black/30">{eyebrow}</span>
        <h1 className="text-5xl font-black uppercase tracking-tighter mt-1">{title}</h1>
      </div>
      {children}
    </motion.div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-black uppercase tracking-tighter mt-8 mb-3 pt-4 border-t border-black/10">{children}</h2>;
}

function CodeBlock({ id, children, onCopy, copied }: { id: string; children: string; onCopy: (t: string, k: string) => void; copied: string | null }) {
  return (
    <div className="relative bg-black rounded-none border-[3px] border-black">
      <button onClick={() => onCopy(children, id)}
        className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 transition-colors">
        {copied === id ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/60" />}
      </button>
      <pre className="p-6 text-[10px] font-mono text-white/80 overflow-x-auto leading-relaxed whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

function LinkList({ items }: { items: { label: string; href: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between p-4 bg-white border-[2px] border-black/10 hover:border-black transition-colors group">
          <span className="text-[10px] font-black uppercase">{item.label}</span>
          <div className="flex items-center gap-2 text-[9px] font-mono text-black/30 group-hover:text-brand-primary transition-colors">
            {item.href.replace("https://", "")}
            <ExternalLink className="w-3 h-3" />
          </div>
        </a>
      ))}
    </div>
  );
}
