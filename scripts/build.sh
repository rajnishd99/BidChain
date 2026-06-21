#!/usr/bin/env bash
# Build all Soroban contracts in `contracts/` to optimised WASM.
#
# Usage:  ./scripts/build.sh
# Output: target/wasm32v1-none/release/<contract>.wasm

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v stellar >/dev/null; then
  echo "stellar CLI not found in PATH. Install it first:" >&2
  echo "  cargo install --locked stellar-cli --features opt" >&2
  exit 1
fi

echo "==> Building Soroban contracts (release profile, opt-level='z')"
cd contracts
stellar contract build
cd ..

echo
echo "Built WASM(s):"
ls -l target/wasm32v1-none/release/*.wasm 2>/dev/null || true
