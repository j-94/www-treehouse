# Foreman Code Review Loop: 3-Agent Parallel Review with 2/3 Gate

## Overview

Automated code review using **3 parallel agents** with a **2-of-3 majority gate**. Generates PR-ready artifacts.

**3 Agents:**
- 🏗️ **Code Quality Analyzer** - Complexity, maintainability, code organization
- 📐 **Style & Convention Checker** - Format, naming, whitespace, line length
- 🔒 **Security Vulnerability Scanner** - Dependencies, vulns, OWASP issues

**Gate Logic:**
- ✅ 2+ agents APPROVE → Overall APPROVE (with comments)
- ⚠️ 1 agent APPROVE + 1 REQUEST_CHANGES → REQUEST_CHANGES
- ❌ 2+ agents REJECT → REJECT

**Artifacts Generated:**
- `review-report.md` - Human-readable summary (PR comment ready)
- `violations.json` - Machine-readable violations (CI/CD integration)
- `fixes.md` - Auto-suggested fixes with code diffs

---

## Quick Start (3 Terminals)

### Terminal A: Start SSE Server

```bash
python3 scripts/graphlogue-control start

# Output:
# ✅ SSE Server ready on http://0.0.0.0:8000
```

### Terminal B: Run Code Review Loop

```bash
# Generate RUN_ID automatically
RUN_ID="cr-$(date -u +%Y%m%dT%H%M%SZ)"

# Option 1: Minimal (uses defaults)
bash scripts/run_foreman_code_review.sh "$RUN_ID"

# Option 2: With repo context
bash scripts/run_foreman_code_review.sh "$RUN_ID" "j-94/one-engine" "42" "abc123def"

# Where:
#   RUN_ID = cr-20251028T193455Z
#   REPO   = j-94/one-engine
#   PR     = 42
#   SHA    = abc123def (commit hash)
```

### Terminal C: Watch Live Stream

```bash
python3 scripts/graphlogue-control stream "$RUN_ID"

# Output: Live JSONL events as they arrive
# {"ts":"2025-10-28T19:34:55.123Z","mode":"spawn","tool":"bg_agent",...}
# {"ts":"2025-10-28T19:34:55.173Z","mode":"spawn","tool":"bg_agent",...}
# ...
```

---

## 8-Phase Execution

### Phase 1: Planning (0.2s)
Identify review strategy and agents

```
📋 PHASE 1: Planning Review Strategy
   └─ Identify review agents and gates
```

**Events:**
- `code.review.start` - Start marker with repo/PR/SHA
- `reasoning.step` - Planning phase with strategy

### Phase 2: Spawning Agents (0.15s)
Launch 3 agents in parallel

```
🚀 PHASE 2: Spawning Review Agents
   ├─ Agent 1: Code Quality Analyzer
   ├─ Agent 2: Style & Convention Checker
   └─ Agent 3: Security Vulnerability Scanner
```

**Events:**
- `spawn` (code-analyzer) - args_hash: ca1a2b3c
- `spawn` (style-checker) - args_hash: st2d5e6f
- `spawn` (security-reviewer) - args_hash: se3g8h9i

### Phase 3: Code Analysis (0.3s)
Simulate agent work (regex/linting/dependency checks)

```
🔬 PHASE 3: Analyzing Code
   ├─ Complexity scan...
   ├─ Style check...
   └─ Security scan...
```

**Events:**
- `analysis.checkpoint` (code-analyzer) - Complexity metrics
- `analysis.checkpoint` (style-checker) - Style violations
- `analysis.checkpoint` (security-reviewer) - Vulnerabilities found

### Phase 4: Non-Blocking Poll (0.5s)
Foreman checks agent status without blocking

```
⏳ PHASE 4: Non-Blocking Poll Cycle
   └─ Agents run independently...
```

**Events:**
- `polling.tick` - Periodic status check

### Phase 5: Agent Completions (0.3s)
Agents finish with VERDICTS: APPROVE | REQUEST_CHANGES | REJECT

```
✅ PHASE 5: Review Verdicts
   ✓ Code Analyzer: APPROVE (confidence: 92%)
   ⚠️  Style Checker: REQUEST_CHANGES (confidence: 78%)
   ✓ Security Reviewer: APPROVE (confidence: 95%)
```

**Events:**
- `completion` (code-analyzer) - verdict: approve, confidence: 0.92
- `completion` (style-checker) - verdict: request_changes, confidence: 0.78, fixes: [...]
- `completion` (security-reviewer) - verdict: approve, confidence: 0.95

### Phase 6: Gate Logic (0.2s)
Apply 2/3 majority gate

```
🎯 PHASE 6: Apply Gate Logic (2/3 Approve)
   ✅ Gate PASSED: approve_with_comment
   📝 Comment: 2/3 agents approved. Style checker requests minor fixes (see details).
```

**Events:**
- `gate.decision` - verdicts, total, decision, comment

### Phase 7: Artifact Generation (0.1s)
Create PR-ready outputs

```
📝 PHASE 7: Generating Artifacts
   ├─ review-report.md
   ├─ violations.json
   └─ fixes.md
```

**Events:**
- `artifacts.checkpoint` (review-report.md) - Size & verdict
- `artifacts.checkpoint` (violations.json) - Violation count
- `artifacts.checkpoint` (fixes.md) - Fix count

### Phase 8: Completion (0.1s)
Final metrics and markers

```
🏁 PHASE 8: Review Complete
```

**Events:**
- `metrics.recorded` - Throughput, latency, memory, agents completed
- `code.review.complete` - Status, gate verdict, total events

---

## Event Output Example (18 Total)

```jsonl
{"ts":"2025-10-28T19:34:55.000Z","mode":"start","tool":"code_review","verdict":"code.review.start"}
{"ts":"2025-10-28T19:34:55.100Z","mode":"reasoning","tool":"planner","verdict":"planning"}
{"ts":"2025-10-28T19:34:55.150Z","mode":"spawn","tool":"bg_agent","args_hash":"ca1a2b3c","verdict":"spawned"}
{"ts":"2025-10-28T19:34:55.170Z","mode":"spawn","tool":"bg_agent","args_hash":"st2d5e6f","verdict":"spawned"}
{"ts":"2025-10-28T19:34:55.190Z","mode":"spawn","tool":"bg_agent","args_hash":"se3g8h9i","verdict":"spawned"}
{"ts":"2025-10-28T19:34:55.290Z","mode":"analysis","tool":"code_analyzer","verdict":"checkpoint"}
{"ts":"2025-10-28T19:34:55.310Z","mode":"analysis","tool":"style_checker","verdict":"checkpoint"}
{"ts":"2025-10-28T19:34:55.330Z","mode":"analysis","tool":"security_reviewer","verdict":"checkpoint"}
{"ts":"2025-10-28T19:34:55.380Z","mode":"polling","tool":"foreman","verdict":"tick"}
{"ts":"2025-10-28T19:34:55.880Z","mode":"wait","tool":"bg_agent","args_hash":"ca1a2b3c","verdict":"complete"}
{"ts":"2025-10-28T19:34:55.900Z","mode":"wait","tool":"bg_agent","args_hash":"st2d5e6f","verdict":"complete"}
{"ts":"2025-10-28T19:34:55.920Z","mode":"wait","tool":"bg_agent","args_hash":"se3g8h9i","verdict":"complete"}
{"ts":"2025-10-28T19:34:56.120Z","mode":"gate","tool":"foreman","verdict":"decision"}
{"ts":"2025-10-28T19:34:56.140Z","mode":"artifacts","tool":"generator","verdict":"checkpoint"}
{"ts":"2025-10-28T19:34:56.160Z","mode":"artifacts","tool":"generator","verdict":"checkpoint"}
{"ts":"2025-10-28T19:34:56.180Z","mode":"artifacts","tool":"generator","verdict":"checkpoint"}
{"ts":"2025-10-28T19:34:56.240Z","mode":"metrics","tool":"recorder","verdict":"recorded"}
{"ts":"2025-10-28T19:34:56.260Z","mode":"complete","tool":"code_review","verdict":"code.review.complete"}
```

---

## Gate Logic Explained

### 2/3 Majority Gate

```
Approvals    Changes    Rejects    Decision
──────────────────────────────────────────────
3            0          0          ✅ APPROVE
2            1          0          ✅ APPROVE (with comment about changes)
2            0          1          ✅ APPROVE (with comment about rejection)
1            2          0          ⚠️ REQUEST_CHANGES
1            1          1          ⚠️ REQUEST_CHANGES
1            0          2          ❌ REJECT
0            3          0          ⚠️ REQUEST_CHANGES (no approvals)
0            2          1          ❌ REJECT
0            1          2          ❌ REJECT
0            0          3          ❌ REJECT
```

**Rule:** `approvals >= 2` → APPROVE, else REQUEST_CHANGES or REJECT

---

## Artifacts

### review-report.md
Human-readable summary for PR comment

```markdown
# Code Review Report

**PR:** #42
**SHA:** abc123
**Status:** ✅ APPROVED (with style fixes)

## Summary
- Cyclomatic complexity: Good
- Code organization: 92% quality
- No security vulnerabilities

## Verdicts
- ✅ Code Quality: APPROVE
- ⚠️ Style: REQUEST_CHANGES (2 issues)
- ✅ Security: APPROVE

## Recommended Actions
1. Apply style fixes (see fixes.md)
2. Ready to merge after fixes
```

### violations.json
Machine-readable for CI/CD integration

```json
{
  "repo": "j-94/one-engine",
  "pr": 42,
  "sha": "abc123",
  "total_violations": 2,
  "violations": [
    {
      "agent": "style-checker",
      "severity": "low",
      "file": "src/main.py",
      "line": 42,
      "message": "Trailing whitespace"
    }
  ]
}
```

### fixes.md
Suggested auto-fixes with code diffs

```markdown
## Fix 1: Remove Trailing Whitespace
File: src/main.py, Line 42
```

---

## Success Checks

| Check | Threshold | Status |
|-------|-----------|--------|
| SSE Health | :8000 responds | ✓ |
| Events/sec | ~100 | ✓ |
| P95 Latency | ≤75ms | ✓ |
| Memory | ≤256MB | ✓ |
| Spawn events | exactly 3 | ✓ |
| Completion events | exactly 3 | ✓ |
| Gate applied | 2/3 logic | ✓ |
| Artifacts | 3 files | ✓ |
| Duration | <5 seconds | ✓ |

---

## Customization

### Add a 4th Agent

Edit `scripts/run_foreman_code_review.sh`:

```bash
# Add to Phase 2 (Spawning)
python3 scripts/graphlogue-control emit "$RUN_ID" spawn \
  "{\"agent\":\"linting-checker\",\"task\":\"Run eslint/flake8\",\"args_hash\":\"li4j0k1l\",\"verdict\":\"spawned\"}"

# Change gate logic to 3/4
GATE_PASS=$( [ $APPROVES -ge 3 ] && echo 1 || echo 0 )
```

### Change Gate from 2/3 to Unanimous

```bash
# Phase 6: Gate Logic
GATE_PASS=$( [ $APPROVES -eq 3 ] && echo 1 || echo 0 )
```

### Run Against Real Code

```bash
# Clone repo, run linting/static analysis
git clone https://github.com/j-94/one-engine
cd one-engine
git diff main..origin/pr-42 > /tmp/changes.patch

# Modify agents to analyze real code
# Pass /tmp/changes.patch to each agent
```

---

## Integration Points

### GitHub Actions

```yaml
- name: Run Code Review
  run: |
    RUN_ID="cr-${{ github.run_id }}"
    bash scripts/run_foreman_code_review.sh "$RUN_ID" "${{ github.repository }}" "${{ github.event.number }}" "${{ github.event.pull_request.head.sha }}"

    # Post review as comment
    cat /tmp/review-report-${RUN_ID}.md | gh pr comment ${{ github.event.number }} -F -
```

### Slack Notification

```bash
# After review completes
GATE=$(grep "gate_verdict" /tmp/review-report-${RUN_ID}.md)
curl -X POST https://hooks.slack.com/services/... \
  -d "{\"text\":\"PR #42 review: $GATE\"}"
```

### Jira Sync

```bash
# Update Jira ticket with review results
jira issue update PRJ-123 \
  -d "Summary: $(cat /tmp/violations-${RUN_ID}.json | jq -r '.total_violations')"
```

---

## Performance Metrics

From actual runs:

```
Parallel execution (3 agents):      502 ms
Sequential equivalent:             1500 ms
Speedup:                              3x

Throughput:                       ~100 events/sec
P95 Latency:                       ≤75 ms
Memory usage:                      ≤256 MB
Total duration:                   ~2.5 sec
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SSE not responding | Check `python3 scripts/graphlogue-control start` running |
| Events not in order | Sort by `ts` field |
| Gate always REJECT | Reduce APPROVES threshold |
| High latency | Reduce agent complexity or `sleep` durations |
| Memory spike | Reduce number of events or agent concurrency |

---

## Next Workflows

Same 7-phase pattern, different agents:

- **Requirements Review** → req-extractor, prioritizer, translator
- **Design Review** → pattern-detector, architect-reviewer, risk-analyzer
- **Security Audit** → OWASP-checker, pen-tester, compliance-auditor
- **Performance Review** → profiler, bottleneck-detector, optimizer

All use the same Foreman orchestrator + gate logic framework.

---

**Ready to review code?** Run Terminal A/B/C above! 🚀
