#!/usr/bin/env bash
# Builds nothing; runs the suite against a throwaway local validator that has target/deploy/line_futures.so loaded.
set -euo pipefail
cd "$(dirname "$0")/.."
LEDGER="$(mktemp -d)"
solana-test-validator --reset --quiet --ledger "$LEDGER" \
  --bpf-program "$(solana address -k target/deploy/line_futures-keypair.json)" target/deploy/line_futures.so >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; rm -rf "$LEDGER"' EXIT
for _ in $(seq 1 40); do solana -u localhost cluster-version >/dev/null 2>&1 && break; sleep 1; done
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}" npx ts-mocha -p ./tsconfig.json -t 1000000 tests/line_futures.ts
