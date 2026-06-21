#!/usr/bin/env bash
# Deploy the auction contract to the configured network and write
# the contract id to `deployments/<network>.json` and the .env file
# the front-end reads.
#
# Usage:  ./scripts/deploy.sh [testnet|futurenet|mainnet]
#         (defaults to STELLAR_NETWORK env, then testnet)
#
# Required env (or in .env):
#   STELLAR_NETWORK, STELLAR_RPC_URL, STELLAR_NETWORK_PASSPHRASE,
#   STELLAR_SOURCE (deployer identity / secret key)

set -euo pipefail

NETWORK="${1:-${STELLAR_NETWORK:-testnet}}"
export STELLAR_NETWORK="$NETWORK"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# .env is loaded by scripts/deploy.ts via dotenv. The shell-level
# `set -a; . .env` pattern would mangle the unquoted passphrase
# (which contains semicolons), so we leave that to Node.

echo "==> Deploying BidChain to $STELLAR_NETWORK"
pnpm tsx scripts/deploy.ts

echo
echo "Next steps:"
echo "  cat deployments/${STELLAR_NETWORK}.json"
echo "  make frontend-dev    # start the Next.js app"
