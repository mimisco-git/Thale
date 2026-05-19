# Thales v3: The Thinking Market Participant

> Agora Agents Hackathon submission. Built on Arc (Circle's L1). Powered by Gemini.

## What Thales Does

Thales is an **autonomous economic reasoning agent** that operates on the Arc Testnet:

1. Every 60 seconds, the agent reads live Arc blockchain state (block number, USYC/USDC rate, EURC spread)
2. Feeds the state to Gemini 2.0 Flash with a structured market analysis prompt
3. Gemini picks an action: `HARVEST_YIELD`, `REBALANCE_TO_EURC`, `CCTP_BRIDGE`, or `HOLD`
4. The agent executes the decision on-chain and records the full dual-path reasoning trace

No simulation. No `Math.random()`. Every number is real.

## Arc Integration

| Feature | Implementation |
|---------|---------------|
| Live block feed | `viem` polling `https://rpc.testnet.arc.network` every 4s |
| USYC rate | `convertToAssets()` on Teller `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A` |
| FX RFQ | Live rate from Teller, FxEscrow `0x867650F5eAe8df91445971f14d89fd84F0C9a9f8` |
| CCTP burns | `depositForBurn` on TokenMessengerV2 (domain 26) |
| Multi-chain balance | `balanceOf` across Arc + Ethereum + Base in parallel |
| Performance bonds | `AgoraEconomicRouter.sol` staking USDC on Arc |

## Setup

```bash
cp .env.example .env
# Required: GEMINI_API_KEY, ARC_PRIVATE_KEY
# Get testnet USDC: https://faucet.circle.com/
npm install && npm run dev
```

## Architecture

```
src/
  services/
    arcClient.ts          # viem client, all Arc contract addresses
    autonomousAgent.ts    # 60s autonomous loop (Gemini -> execute)
    AgentOrchestrator.ts  # User-triggered reasoning engine
    circleApi.ts          # Circle API wrapper
    backend/
      GatewayController.ts   # CCTP depositForBurn
      StableFXService.ts     # Live USYC rate + FX RFQ
      UnifiedBalanceController.ts  # Multi-chain balanceOf
      TransactionMonitor.ts  # viem finality polling
  components/
    AgentActivity.tsx     # Live autonomous decision feed
    TractionBoard.tsx     # Real Firestore traction metrics
    Sequencer.tsx         # Real Arc block stream
    StableFXRFQ.tsx       # Live USYC/USDC RFQ
    UnifiedBalanceSidebar.tsx  # Real multi-chain balances
contracts/
  AgoraEconomicRouter.sol  # Performance bonds + trace pinning
server.ts                  # Express backend, real Arc endpoints
```

## Key References (Hackathon alignment)

- **RFB 04** Adaptive Portfolio Manager: USYC yield harvesting, in-flight rotation
- **RFB 06** Social Trading Intelligence: slash-bond integrity, performance-bonded reasoning
- **Research 01** Trading-R1: dual-path reasoning trace (naive vs Thales) for every decision
- **Research 06** Slash-bonded copy-trading: `AgoraEconomicRouter.sol` slashes on SLA breach

Built for the Agora Agents Hackathon. May 2026.
