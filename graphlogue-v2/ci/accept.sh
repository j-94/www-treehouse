#!/usr/bin/env bash
set -euo pipefail

echo "🧪 ACCEPTANCE SUITE v0.2.0"
echo ""

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PASS=0
FAIL=0

test_snapshot() {
  echo "Test 1: glg snapshot wasm-docs"
  if scripts/glg snapshot wasm-docs > /tmp/test_snapshot.log 2>&1; then
    echo "  ✅ PASS"
    ((PASS++))
  else
    echo "  ❌ FAIL"
    tail -10 /tmp/test_snapshot.log | tee logs/last_failure.txt
    ((FAIL++))
  fi
}

test_trace() {
  echo "Test 2: glg trace --mode wasm-docs"
  if scripts/glg trace --mode wasm-docs > /tmp/test_trace.log 2>&1; then
    echo "  ✅ PASS"
    ((PASS++))
  else
    echo "  ❌ FAIL"
    tail -10 /tmp/test_trace.log | tee logs/last_failure.txt
    ((FAIL++))
  fi
}

test_anneal() {
  echo "Test 3: glg anneal --mode wasm-docs"
  if scripts/glg anneal --mode wasm-docs > /tmp/test_anneal.log 2>&1; then
    echo "  ✅ PASS"
    ((PASS++))
  else
    echo "  ❌ FAIL"
    tail -10 /tmp/test_anneal.log | tee logs/last_failure.txt
    ((FAIL++))
  fi
}

test_full_cycle() {
  echo "Test 4: glg full-cycle"
  if scripts/glg full-cycle wasm-docs > /tmp/test_full.log 2>&1; then
    echo "  ✅ PASS"
    ((PASS++))
  else
    echo "  ❌ FAIL"
    tail -10 /tmp/test_full.log | tee logs/last_failure.txt
    ((FAIL++))
  fi
}

test_snapshot
test_trace
test_anneal
test_full_cycle

echo ""
echo "════════════════════════════════════"
echo "Results: $PASS passed, $FAIL failed"
echo "════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi

exit 0
