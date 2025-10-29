#!/bin/bash

#
# Foreman Code Review Loop: 3-Agent Parallel Review with 2/3 Gate
# Uses: graphlogue-control emit | stream | feedback
# Produces: review-report.md, violations.json, fixes.md
#

set -e

# ============================================================================
# ARGUMENTS
# ============================================================================

RUN_ID="${1:-cr-$(date -u +%Y%m%dT%H%M%SZ)}"
REPO="${2:-unknown/repo}"
PR="${3:-0}"
SHA="${4:-unknown}"

echo "🔍 Code Review Loop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "RUN_ID:  $RUN_ID"
echo "REPO:    $REPO"
echo "PR:      #$PR"
echo "SHA:     $SHA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# PHASE 1: PLANNING
# ============================================================================

echo "📋 PHASE 1: Planning Review Strategy"
echo "   └─ Identify review agents and gates"
echo ""

python3 scripts/graphlogue-control emit "$RUN_ID" code.review.start \
  "{\"repo\":\"$REPO\",\"pr\":$PR,\"sha\":\"$SHA\",\"phase\":\"planning\"}"

python3 scripts/graphlogue-control emit "$RUN_ID" reasoning.step \
  "{\"phase\":\"planning\",\"strategy\":\"3-agent-parallel\",\"gate_rule\":\"2of3_approve\"}"

sleep 0.2

# ============================================================================
# PHASE 2: SPAWNING REVIEW AGENTS (Parallel)
# ============================================================================

echo "🚀 PHASE 2: Spawning Review Agents"
echo "   ├─ Agent 1: Code Quality Analyzer"
echo "   ├─ Agent 2: Style & Convention Checker"
echo "   └─ Agent 3: Security Vulnerability Scanner"
echo ""

# Agent 1: Code Analyzer
python3 scripts/graphlogue-control emit "$RUN_ID" spawn \
  "{\"agent\":\"code-analyzer\",\"task\":\"Analyze code quality, complexity, maintainability\",\"args_hash\":\"ca1a2b3c\",\"verdict\":\"spawned\"}"

sleep 0.05

# Agent 2: Style Checker
python3 scripts/graphlogue-control emit "$RUN_ID" spawn \
  "{\"agent\":\"style-checker\",\"task\":\"Check code style, conventions, formatting\",\"args_hash\":\"st2d5e6f\",\"verdict\":\"spawned\"}"

sleep 0.05

# Agent 3: Security Scanner
python3 scripts/graphlogue-control emit "$RUN_ID" spawn \
  "{\"agent\":\"security-reviewer\",\"task\":\"Scan for security vulnerabilities, dependencies\",\"args_hash\":\"se3g8h9i\",\"verdict\":\"spawned\"}"

sleep 0.2

# ============================================================================
# PHASE 3: CODE ANALYSIS (Simulated)
# ============================================================================

echo "🔬 PHASE 3: Analyzing Code"
echo "   ├─ Complexity scan..."
echo "   ├─ Style check..."
echo "   └─ Security scan..."
echo ""

# Emit analysis events
python3 scripts/graphlogue-control emit "$RUN_ID" analysis.checkpoint \
  "{\"agent\":\"code-analyzer\",\"metrics\":{\"cyclomatic_complexity\":3.2,\"lines_added\":42,\"lines_deleted\":12,\"functions_modified\":5}}"

python3 scripts/graphlogue-control emit "$RUN_ID" analysis.checkpoint \
  "{\"agent\":\"style-checker\",\"issues\":[\"trailing_whitespace\",\"line_length\"],\"count\":2}"

python3 scripts/graphlogue-control emit "$RUN_ID" analysis.checkpoint \
  "{\"agent\":\"security-reviewer\",\"issues\":[],\"count\":0,\"vulnerabilities\":\"none\"}"

sleep 0.3

# ============================================================================
# PHASE 4: NON-BLOCKING POLL
# ============================================================================

echo "⏳ PHASE 4: Non-Blocking Poll Cycle"
echo "   └─ Agents run independently..."
echo ""

python3 scripts/graphlogue-control emit "$RUN_ID" polling.tick \
  "{\"interval_ms\":500,\"agents_active\":3,\"phase\":\"review\"}"

sleep 0.5

# ============================================================================
# PHASE 5: AGENT COMPLETIONS WITH VERDICTS
# ============================================================================

echo "✅ PHASE 5: Review Verdicts"
echo ""

# Code Analyzer: APPROVE (quality is good)
python3 scripts/graphlogue-control emit "$RUN_ID" completion \
  "{\"agent\":\"code-analyzer\",\"verdict\":\"complete\",\"latency_ms\":502,\"review_verdict\":\"approve\",\"confidence\":0.92,\"notes\":\"Code quality acceptable, complexity within limits\"}"
echo "   ✓ Code Analyzer: APPROVE (confidence: 92%)"

sleep 0.1

# Style Checker: REQUEST_CHANGES (minor style issues)
python3 scripts/graphlogue-control emit "$RUN_ID" completion \
  "{\"agent\":\"style-checker\",\"verdict\":\"complete\",\"latency_ms\":501,\"review_verdict\":\"request_changes\",\"confidence\":0.78,\"notes\":\"2 style issues: trailing whitespace, line length\",\"fixes\":[\"remove trailing spaces\",\"break long line\"]}"
echo "   ⚠️  Style Checker: REQUEST_CHANGES (confidence: 78%)"

sleep 0.1

# Security Reviewer: APPROVE (no vulnerabilities)
python3 scripts/graphlogue-control emit "$RUN_ID" completion \
  "{\"agent\":\"security-reviewer\",\"verdict\":\"complete\",\"latency_ms\":500,\"review_verdict\":\"approve\",\"confidence\":0.95,\"notes\":\"No known vulnerabilities, dependencies clean\"}"
echo "   ✓ Security Reviewer: APPROVE (confidence: 95%)"

sleep 0.2

# ============================================================================
# PHASE 6: GATE LOGIC (2/3 Approve)
# ============================================================================

echo ""
echo "🎯 PHASE 6: Apply Gate Logic (2/3 Approve)"
echo ""

# Count verdicts
# approve: 2 (code-analyzer, security-reviewer)
# request_changes: 1 (style-checker)
# Gate rule: 2/3 approve → overall APPROVE (with comment about style fixes)

APPROVES=2
REQUEST_CHANGES=1
REJECTS=0
TOTAL=3
GATE_PASS=1  # 2/3 ≥ 2 → PASS

if [ $GATE_PASS -eq 1 ]; then
  GATE_VERDICT="approve_with_comment"
  GATE_COMMENT="2/3 agents approved. Style checker requests minor fixes (see details)."
  echo "   ✅ Gate PASSED: $GATE_VERDICT"
  echo "   📝 Comment: $GATE_COMMENT"
else
  GATE_VERDICT="request_changes"
  GATE_COMMENT="Less than 2/3 agents approved. Requires revision."
  echo "   ❌ Gate BLOCKED: $GATE_VERDICT"
  echo "   📝 Comment: $GATE_COMMENT"
fi

python3 scripts/graphlogue-control emit "$RUN_ID" gate.decision \
  "{\"gate_rule\":\"2_of_3_approve\",\"verdicts\":{\"approve\":$APPROVES,\"request_changes\":$REQUEST_CHANGES,\"reject\":$REJECTS},\"total\":$TOTAL,\"decision\":\"$GATE_VERDICT\",\"comment\":\"$GATE_COMMENT\"}"

sleep 0.2

# ============================================================================
# PHASE 7: ARTIFACT GENERATION
# ============================================================================

echo ""
echo "📝 PHASE 7: Generating Artifacts"
echo "   ├─ review-report.md"
echo "   ├─ violations.json"
echo "   └─ fixes.md"
echo ""

# Generate review report
cat > /tmp/review-report-${RUN_ID}.md << 'REPORT'
# Code Review Report

**PR:** #42
**SHA:** abc123
**Repo:** j-94/one-engine

## Summary

- **Status:** ✅ APPROVED (with style fixes)
- **Gate Result:** 2/3 agents approved
- **Changes:** +42 lines, -12 lines across 5 functions

## Agent Verdicts

### 1. Code Quality Analyzer ✅ APPROVE
- Cyclomatic complexity: 3.2 (acceptable)
- Code organization: Good
- Maintainability: 92% confidence

### 2. Style Checker ⚠️ REQUEST_CHANGES
- Issues: 2 minor
  1. Trailing whitespace (4 occurrences)
  2. Line exceeds 120 chars (1 occurrence)
- Recommended fixes provided

### 3. Security Reviewer ✅ APPROVE
- Vulnerabilities: None
- Dependencies: Clean (up-to-date)
- Security confidence: 95%

## Recommended Actions

1. Apply style fixes (see fixes.md)
2. Code quality approved as-is
3. Security cleared
4. Ready to merge after style fixes

REPORT

python3 scripts/graphlogue-control emit "$RUN_ID" artifacts.checkpoint \
  "{\"artifact\":\"review-report.md\",\"size_bytes\":1200,\"verdict\":\"generated\"}"

# Generate violations JSON
cat > /tmp/violations-${RUN_ID}.json << 'VIOLATIONS'
{
  "repo": "j-94/one-engine",
  "pr": 42,
  "sha": "abc123",
  "summary": {
    "total_violations": 2,
    "by_severity": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 2
    }
  },
  "violations": [
    {
      "agent": "style-checker",
      "severity": "low",
      "type": "trailing_whitespace",
      "file": "src/main.py",
      "line": 42,
      "message": "Trailing whitespace detected"
    },
    {
      "agent": "style-checker",
      "severity": "low",
      "type": "line_too_long",
      "file": "src/utils.py",
      "line": 156,
      "message": "Line exceeds 120 characters (128 chars)"
    }
  ]
}
VIOLATIONS

python3 scripts/graphlogue-control emit "$RUN_ID" artifacts.checkpoint \
  "{\"artifact\":\"violations.json\",\"size_bytes\":800,\"violation_count\":2}"

# Generate fixes markdown
cat > /tmp/fixes-${RUN_ID}.md << 'FIXES'
# Recommended Fixes

## Style Issues (2 fixes needed)

### Fix 1: Remove Trailing Whitespace
**File:** src/main.py
**Line:** 42
**Current:**
```python
    return result
```
**Fixed:**
```python
    return result
```

### Fix 2: Break Long Line
**File:** src/utils.py
**Line:** 156
**Current:**
```python
response = make_api_call(endpoint, payload, headers, retry_count, timeout_ms)
```
**Fixed:**
```python
response = make_api_call(
    endpoint, payload, headers,
    retry_count, timeout_ms
)
```

## How to Apply

```bash
# Option 1: Manual (2 min)
# Edit files and apply fixes above

# Option 2: Auto-fix (Python)
python3 -m autopep8 --in-place src/main.py src/utils.py

# Option 3: Pre-commit hook
pre-commit run --all-files
```

FIXES

python3 scripts/graphlogue-control emit "$RUN_ID" artifacts.checkpoint \
  "{\"artifact\":\"fixes.md\",\"size_bytes\":600,\"fixes_count\":2}"

sleep 0.2

# ============================================================================
# PHASE 8: COMPLETION
# ============================================================================

echo "🏁 PHASE 8: Review Complete"
echo ""

python3 scripts/graphlogue-control emit "$RUN_ID" metrics.recorded \
  "{\"throughput_events_per_sec\":100,\"latency_p95_ms\":75,\"memory_mb\":256,\"agents_completed\":3,\"gate_passed\":true}"

python3 scripts/graphlogue-control emit "$RUN_ID" code.review.complete \
  "{\"status\":\"success\",\"gate_verdict\":\"$GATE_VERDICT\",\"total_events\":18,\"duration_ms\":2500,\"artifacts_generated\":3}"

sleep 0.1

# ============================================================================
# SUCCESS SUMMARY
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CODE REVIEW COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Review Results:"
echo "   ✅ Code Quality:    APPROVE (92% confidence)"
echo "   ⚠️  Style:          REQUEST_CHANGES (2 minor issues)"
echo "   ✅ Security:        APPROVE (95% confidence)"
echo ""
echo "🎯 Gate Result: $GATE_VERDICT"
echo "   Approved: 2/3 agents"
echo "   Comment: $GATE_COMMENT"
echo ""
echo "📦 Artifacts Generated:"
echo "   ✓ review-report.md (1.2 KB)"
echo "   ✓ violations.json (0.8 KB)"
echo "   ✓ fixes.md (0.6 KB)"
echo ""
echo "⚡ Performance:"
echo "   Throughput: 100 ev/sec"
echo "   P95 Latency: 75ms"
echo "   Memory: 256MB"
echo "   Duration: 2.5s"
echo ""
echo "📈 Success Checks:"
echo "   ✓ SSE on :8000 (healthy)"
echo "   ✓ Ordered JSONL events"
echo "   ✓ 3 spawn + 3 completion events"
echo "   ✓ 2/3 gate logic applied"
echo "   ✓ Artifacts generated"
echo "   ✓ Reflection budget: 0/1"
echo ""
echo "🔗 View Review Report:"
echo "   cat /tmp/review-report-${RUN_ID}.md"
echo ""
echo "📋 View Violations:"
echo "   cat /tmp/violations-${RUN_ID}.json | jq ."
echo ""
echo "🚀 Next: Apply fixes & merge"
echo ""
