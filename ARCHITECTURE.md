# Thales v3 Architecture

## Runtime Flow

```
Every 60 seconds (autonomousAgent.ts):
  1. arcClient.ts       -> getLatestArcBlock()        -> rpc.testnet.arc.network
  2. arcClient.ts       -> getLiveUSYCRate()           -> USYC Teller convertToAssets()
  3. autonomousAgent.ts -> askGemini(marketState)      -> Gemini 2.0 Flash
  4. Gemini             -> { action, confidence, reasoning, naiveRoute, thalesRoute, ... }
  5. server.ts          -> POST /api/agent/execute     -> writeContract (if ARC_PRIVATE_KEY set)
  6. thalesHistory.ts   -> addTrace()                  -> Firestore
  7. AgentActivity.tsx  -> subscribe()                 -> UI update

User-triggered (AgentOrchestrator.ts):
  1. ThalesReasoningEngine -> textarea intent
  2. arcClient.ts          -> live block + USYC rate (parallel)
  3. Gemini 2.0 Flash      -> structured IntentPlan JSON
  4. thalesHistory.ts      -> addTrace() -> Firestore
  5. UI                    -> reasoning trace display

Balance reads (UnifiedBalanceSidebar.tsx):
  1. circleApi.ts -> getOrCreateWallet(userId)
  2. server.ts    -> GET /api/liquidity/balance?address=0x...
  3. UnifiedBalanceController.ts -> Promise.allSettled([
       arcPublicClient.readContract(USDC.balanceOf),
       ethPublicClient.readContract(USDC.balanceOf),
       basePublicClient.readContract(USDC.balanceOf),
       arcPublicClient.readContract(USYC.balanceOf),
       arcPublicClient.readContract(EURC.balanceOf),
     ])
```

## Key Contracts (Arc Testnet, Chain ID 5042002)

All sourced from: https://docs.arc.network/arc/references/contract-addresses

| Contract | Address | Used for |
|----------|---------|----------|
| USDC | `0x36000...` | Gas, balance reads, performance bonds |
| USYC | `0xe9185...` | Yield-bearing target, balance reads |
| USYC Teller | `0x9fdF1...` | Live rate via `convertToAssets()` |
| EURC | `0x89B50...` | FX spread detection, balance reads |
| CCTP TokenMessengerV2 | `0x8FE6B...` | Cross-chain USDC burns (domain 26) |
| CCTP MessageTransmitterV2 | `0xE737e...` | Message receipt on destination |
| Gateway Wallet | `0x00777...` | Sub-500ms unified balance |
| StableFX FxEscrow | `0x86765...` | USDC/EURC settlement |
| Permit2 | `0x00000...` | Token approvals for StableFX |
| AgoraEconomicRouter | TBD (deploy) | Performance bonds, trace pinning |

## Non-Simulated Data Sources

| Data | Source |
|------|--------|
| Arc blocks | `viem` -> `rpc.testnet.arc.network` (polled every 4s) |
| USYC rate | `readContract(USYC_TELLER, convertToAssets, [1_000_000])` |
| USYC APY | Derived: `(rate - 1) * 365 * 100` |
| Multi-chain USDC | `readContract(USDC, balanceOf, [address])` x 3 chains |
| CCTP attestations | `iris-api-sandbox.circle.com` (public Circle API) |
| Traction metrics | Firestore real-time listener on `traces` collection |
| AI decisions | Gemini 2.0 Flash with structured JSON output |

## What Requires ARC_PRIVATE_KEY

Without `ARC_PRIVATE_KEY` set, the app runs in "reasoning mode":
- All reads work (blocks, USYC rate, balances, attestations)
- Gemini reasoning traces are generated and recorded
- On-chain writes (transfers, CCTP burns, vault deposits) are skipped
- The UI shows "decision recorded, execution pending private key"

With `ARC_PRIVATE_KEY` + funded testnet address:
- `HARVEST_YIELD`: sends a self-ping tx to generate a real Arc tx hash
- `CCTP_BRIDGE`: calls `depositForBurn` on TokenMessengerV2
- Full production: calls USYC Teller `deposit()` (requires USYC allowlist)
