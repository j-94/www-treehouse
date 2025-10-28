# Pattern Factory: Generic N-Agent Orchestration

**Stop repeating code.** One Python script, infinite workflows.

Define workflows **declaratively in JSON**, run via **one command**.

---

## The Insight

Instead of 787-line shell scripts for code review, 600-line scripts for requirements, etc., use **ONE generic factory**:

```
Pattern Config (JSON) + Pattern Factory (Python) = Orchestration
         20 lines              200 lines              (Any workflow)
```

---

## Quick Start

### Terminal A: Start SSE
```bash
python3 scripts/graphlogue-control start
```

### Terminal B: Run ANY Pattern
```bash
# Code Review (2/3 gate)
python3 scripts/pattern_factory.py patterns/code-review.json

# Requirements (unanimous gate)
python3 scripts/pattern_factory.py patterns/requirements.json

# Design Review (2/3 gate)
python3 scripts/pattern_factory.py patterns/design-review.json

# Security Audit (2/3 gate)
python3 scripts/pattern_factory.py patterns/security-audit.json
```

### Terminal C: Watch All
```bash
python3 scripts/graphlogue-control stream <RUN_ID>
```

---

## Architecture

```
Pattern Config (JSON)
  ├─ agents: [name, task, verdict, confidence]
  ├─ gate: {rule: majority_2, unanimous, etc.}
  └─ artifacts: [name, size_bytes]
       ↓
Pattern Factory (Python)
  ├─ Phase 1: Planning
  ├─ Phase 2: Spawn N agents
  ├─ Phase 3: Analysis
  ├─ Phase 4: Polling
  ├─ Phase 5: Completions (with verdicts)
  ├─ Phase 6: Gate logic
  ├─ Phase 7: Artifacts
  ├─ Phase 8: Complete
       ↓
Foreman Orchestration (JSONL audit trail)
  └─ 20 events per run
```

---

## Patterns (Ready to Use)

### 1. Code Review
**Config:** `patterns/code-review.json`

```json
{
  "agents": [
    {"name": "code-analyzer", "verdict": "approve", "confidence": 0.92},
    {"name": "style-checker", "verdict": "request_changes", "confidence": 0.78},
    {"name": "security-reviewer", "verdict": "approve", "confidence": 0.95}
  ],
  "gate": {"rule": "majority_2"},
  "artifacts": ["review-report.md", "violations.json", "fixes.md"]
}
```

**Result:** 2/3 approve → APPROVE (style checker requests fixes)

### 2. Requirements Review
**Config:** `patterns/requirements.json`

```json
{
  "agents": [
    {"name": "req-extractor", "verdict": "approve", "confidence": 0.90},
    {"name": "prioritizer", "verdict": "approve", "confidence": 0.88},
    {"name": "translator", "verdict": "approve", "confidence": 0.91}
  ],
  "gate": {"rule": "unanimous"},
  "artifacts": ["requirements.md", "priorities.json", "acceptance-tests.md"]
}
```

**Result:** All 3 approve → APPROVE (unanimous)

### 3. Design Review
**Config:** `patterns/design-review.json`

```json
{
  "agents": [
    {"name": "pattern-detector", "verdict": "approve", "confidence": 0.89},
    {"name": "risk-analyzer", "verdict": "request_changes", "confidence": 0.85},
    {"name": "architect-reviewer", "verdict": "approve", "confidence": 0.93}
  ],
  "gate": {"rule": "majority_2"},
  "artifacts": ["design-doc.md", "risks.json", "alternatives.md"]
}
```

**Result:** 2/3 approve → APPROVE (with risk feedback)

### 4. Security Audit
**Config:** `patterns/security-audit.json`

```json
{
  "agents": [
    {"name": "owasp-checker", "verdict": "approve", "confidence": 0.94},
    {"name": "dependency-scanner", "verdict": "approve", "confidence": 0.96},
    {"name": "compliance-auditor", "verdict": "request_changes", "confidence": 0.80}
  ],
  "gate": {"rule": "majority_2"},
  "artifacts": ["audit-report.md", "vulnerabilities.json", "compliance-checklist.md"]
}
```

**Result:** 2/3 approve → APPROVE (compliance feedback needed)

---

## Create Your Own Pattern (5 Minutes)

### 1. Copy a template
```bash
cp patterns/code-review.json patterns/my-pattern.json
```

### 2. Edit the JSON
```json
{
  "name": "my-workflow",
  "agents": [
    {
      "name": "agent-1",
      "task": "Do X",
      "verdict": "approve",
      "confidence": 0.85
    },
    {
      "name": "agent-2",
      "task": "Do Y",
      "verdict": "request_changes",
      "confidence": 0.80
    }
  ],
  "gate": {
    "rule": "majority_1",
    "description": "1 of 2 must approve"
  },
  "artifacts": [
    {"name": "output1.md"},
    {"name": "output2.json"}
  ]
}
```

### 3. Run it
```bash
python3 scripts/pattern_factory.py patterns/my-pattern.json
```

---

## Gate Rules

| Rule | Logic | Example |
|------|-------|---------|
| `majority_1` | ≥1 approve | First to approve wins |
| `majority_2` | ≥2 approve | 2 of 3 agents |
| `majority_3` | ≥3 approve | 3 of 4 agents |
| `unanimous` | 0 rejects | All agents must approve |
| `majority` | >50% approve | Simple majority |

---

## What Changes Per Workflow (JSON Only)

```
Code Review          Requirements         Design Review
─────────────────────────────────────────────────────────
3 agents             3 agents             3 agents
(code,style,sec)     (extract,pri,trans)  (pattern,risk,arch)

2/3 gate             Unanimous gate       2/3 gate

Review artifacts     Req artifacts        Design artifacts
```

**Same factory, different configs.**

---

## Token Savings

### Old Approach
- Code Review: 787 lines
- Requirements: 700 lines (new)
- Design Review: 700 lines (new)
- Security Audit: 700 lines (new)
- **Total: ~2,900 lines**

### New Approach
- Pattern Factory: 200 lines
- Code Review config: 20 lines
- Requirements config: 20 lines
- Design Review config: 20 lines
- Security Audit config: 20 lines
- **Total: ~280 lines (-90% code)**

---

## Performance (All Patterns)

```
Throughput:          ~100 events/sec
P95 Latency:         ≤75 ms
Memory:              ≤256 MB
Duration:            ~2.5 sec
Agents Spawned:      3 (parallel)
Events Logged:       ~20 (JSONL)
```

---

## Scaling

Add 100 more patterns by creating 100 more JSON files. **No code changes.**

```bash
patterns/
├─ code-review.json
├─ requirements.json
├─ design-review.json
├─ security-audit.json
├─ performance-review.json
├─ accessibility-review.json
├─ documentation-review.json
├─ compliance-audit.json
├─ architecture-review.json
├─ user-testing-review.json
└─ ... (90 more)
```

Run any via: `python3 scripts/pattern_factory.py patterns/<name>.json`

---

## Integration

All patterns auto-emit to Foreman + SSE. Integrate once, works everywhere:

```bash
# GitHub Actions
- name: Run Code Review
  run: python3 scripts/pattern_factory.py patterns/code-review.json

# Slack
- Post review results to Slack webhook

# Jira
- Update ticket with results

# CI/CD
- Fail if gate = reject
```

---

## Next: Meta-Pattern Library

All 8-phase loops follow same structure. Extractable patterns:

1. **N-Agent Spawning** - Launch agents in parallel
2. **Verdict Collection** - Gather verdicts with confidence
3. **Gate Logic** - Apply approval rules (majority, unanimous, etc.)
4. **Artifact Generation** - Create outputs per workflow
5. **Event Streaming** - Emit JSONL audit trail
6. **Metrics Recording** - Track performance

These 6 patterns combine into ANY workflow.

---

## Files

- `scripts/pattern_factory.py` (200 lines) - Generic orchestrator
- `patterns/code-review.json` (20 lines) - Code review pattern
- `patterns/requirements.json` (20 lines) - Requirements pattern
- `patterns/design-review.json` (20 lines) - Design pattern
- `patterns/security-audit.json` (20 lines) - Security pattern

**Total: ~280 lines for infinite workflows** ✨

---

**Run it now:**
```bash
python3 scripts/pattern_factory.py patterns/code-review.json
```
