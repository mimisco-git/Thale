# Thales v3 — Judges Summary
## The First Thinking Market Participant on Arc

---

## What It Actually Does (No Simulation)

Thales is an autonomous economic reasoning agent that runs every 60 seconds,
reads live data from the Arc Testnet blockchain, asks Gemini 2.0 Flash what to
do, executes the decision, and pins the reasoning trace to Firestore.

Every single data point in the UI is real:
- Arc block numbers come from `https://rpc.testnet.arc.network` via viem
- USYC/USDC rate comes from the Teller contract (`0x9fdF14c5B14173D74C08Af27AebFf39240dC105A`) via `convertToAssets()`
- Unified balance reads USDC, USYC, EURC from on-chain ERC-20 balanceOf
- StableFX RFQ quotes use the live Teller rate, not hardcoded values
- All tx hashes link to `testnet.arcscan.app`

---

## Scoring Breakdown

### 30%: Agentic Sophistication

The `autonomousAgent.ts` singleton runs a 60-second loop with no user input:

1. Fetches the current Arc block and live USYC rate in parallel
2. Constructs a structured market state (block number, USYC APY, EURC spread)
3. Sends the state to Gemini 2.0 Flash with a strict JSON schema
4. Gemini picks: HARVEST_YIELD / REBALANCE_TO_EURC / REBALANCE_TO_USDC / CCTP_BRIDGE / HOLD
5. If action != HOLD, calls `/api/agent/execute` which submits a real Arc tx (when `ARC_PRIVATE_KEY` is set)
6. Records the full reasoning trace (naive route vs Thales route) to Firestore

This is full autonomy: the agent observes, reasons, and acts — without a human in the loop.

### 30%: Traction

- `TractionBoard.tsx` reads all traces from Firestore in real time
- Shows: active users (unique UIDs), total reasoning traces, settled volume, autonomous cycles
- Every user interaction (RFQ, intent, vault) is persisted and counted
- Google login lets us track distinct users with Firebase Auth

### 20%: Circle Tool Usage

| Tool | How Used |
|------|----------|
| USDC (ERC-20) | Gas on Arc, balance reads, transfer target |
| USYC Teller | Live rate via `convertToAssets()`, deposit target |
| EURC | Balance reads, FX spread detection |
| CCTP V2 (domain 26) | `depositForBurn` via `GatewayController.ts` |
| Gateway Wallet | Cross-chain balance abstraction |
| StableFX FxEscrow | RFQ settlement target |
| Circle Faucet | USDC/EURC funding for testnet |

### 20%: Innovation

- **Trading-R1 pattern**: every agent decision is a dual-path reasoning trace (naive vs Thales), referenced from the hackathon research
- **In-flight yield**: USYC Teller rate is live, not approximated — the agent uses it to calculate real alpha per cycle
- **Slash-bond smart contract**: `AgoraEconomicRouter.sol` stakes real USDC, slashes on SLA breach, pins reasoning traces via `submitReasoningTrace()`
- **Autonomous without human loop**: 60s cycle runs as long as the server is up — demo judges can watch it in the Activity Feed

---

## Live Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| USDC | `0x3600000000000000000000000000000000000000` |
| USYC | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` |
| USYC Teller | `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A` |
| CCTP TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` |
| Gateway Wallet | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| StableFX FxEscrow | `0x867650F5eAe8df91445971f14d89fd84F0C9a9f8` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

Explorer: `https://testnet.arcscan.app`
RPC: `https://rpc.testnet.arc.network`
Chain ID: `5042002`

---

## Setup (< 5 minutes)

```bash
git clone <repo>
cd thales
cp .env.example .env

# Add: GEMINI_API_KEY, ARC_PRIVATE_KEY (fund via faucet.circle.com)
# Firebase already configured in firebase-applet-config.json

npm install
npm run dev
# Visit http://localhost:3000
```

The autonomous agent starts immediately. Watch the "Live Agent Decisions" feed.
