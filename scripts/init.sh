#!/usr/bin/env bash
# Post-deploy initialization. Currently a no-op for the auction
# contract (constructor handles all initialization) but kept as a
# hook for future projects that need extra setup calls.
#
# Usage:  ./scripts/init.sh [testnet|futurenet|mainnet]

set -euo pipefail

NETWORK="${1:-${STELLAR_NETWORK:-testnet}}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . .env
  set +a
fi

RECORD="deployments/${NETWORK}.json"
if [ ! -f "$RECORD" ]; then
  echo "No deployment record for $NETWORK. Run ./scripts/deploy.sh first." >&2
  exit 1
fi

CONTRACT_ID=$(python3 -c "import json; print(json.load(open('$RECORD'))['contractId'])")
echo "==> Initialising $CONTRACT_ID on $NETWORK"
echo "    (no-op for the auction contract — constructor handles init)"
echo "    ✓ done"
