#!/bin/bash
# Thales v3 - one-shot GitHub push
# Run this from inside the ThaleV2 folder: bash push.sh

set -e

echo "Initializing git..."
git init
git branch -m main

echo "Staging all files..."
git add .

echo "Committing..."
git commit -m "feat: Thales v3 - production Arc integration

- Real viem client: rpc.testnet.arc.network (Chain ID 5042002)
- Live USYC rate from USYC Teller convertToAssets()
- Autonomous 60s agent loop: Gemini 2.0 Flash -> on-chain execution
- Real Arc block feed in Sequencer (zero Math.random in services)
- Multi-chain USDC/USYC/EURC balance reads via viem
- Firestore traction board: real user count, volume, traces
- CCTP V2 depositForBurn via GatewayController (domain 26)
- StableFX FxEscrow RFQ with live Teller rate
- AgoraEconomicRouter.sol with real USDC (0x3600...)
- All addresses sourced from docs.arc.network"

echo "Setting remote..."
git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:mimisco-git/Thale.git

echo "Pushing..."
git push -u origin main --force

echo ""
echo "Done. Check: https://github.com/mimisco-git/Thale"
