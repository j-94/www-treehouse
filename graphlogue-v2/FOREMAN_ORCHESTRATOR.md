# Claude Code Meta-Orchestrator: Foreman Guide

## Overview

The **Foreman** is a safe, auditable meta-orchestrator for Claude Code that:

✅ **Spawns background agents** for parallel work
✅ **Maintains audit trails** (structured JSONL events)
✅ **Enforces safety policies** (scoped approvals, deny patterns)
✅ **Never bypasses sandboxing** (safer than "dangerously skip")
✅ **Minimizes reflection** (execute → verify → summarize)

---

## System Architecture

```
Claude Code (Main)
    ↓
Foreman (Orchestrator)
    ├─ Read policy.json
    ├─ Validate permissions
    ├─ Spawn agents (parallel)
    ├─ Poll status (non-blocking)
    ├─ Merge artifacts
    └─ Log events (audit trail)
    ↓
Background Agents (Independent)
    ├─ Agent 1: Write tests
    ├─ Agent 2: Generate docs
    ├─ Agent 3: Validate schema
    └─ Agent N: Other tasks
```

---

## Quick Start

### 1. Spawn Parallel Agents (No Blocking)

```python
import asyncio
from scripts.foreman import Foreman

async def main():
    foreman = Foreman()

    # Spawn 3 agents in parallel
    await foreman.spawn_agent(
        name="tests-bg",
        task="Write unit tests for chat interface",
        allowed_paths=["tests/", "scripts/graphlogue-chat.py"],
        timeout_seconds=120,
        expected_artifacts=["tests/test_chat.py"]
    )

    await foreman.spawn_agent(
        name="docs-bg",
        task="Generate API documentation",
        allowed_paths=["docs/", "scripts/"],
        expected_artifacts=["docs/API.md"]
    )

    # Foreman doesn't wait; main thread continues
    print("✓ Agents spawned. Main thread free to do other work.")

asyncio.run(main())
```

### 2. Check Status (Polling)

```python
# Poll agent status without blocking
agent = foreman.agents.get("tests-bg")
print(f"Status: {agent.status}")  # "running", "complete", "failed"
```

### 3. Merge Results When Ready

```python
# When agent completes, merge artifacts
if foreman.agents["tests-bg"].status == "complete":
    results = foreman.agents["tests-bg"].result
    print(f"Agent produced: {results['artifacts']}")
```

### 4. Audit Trail

```python
# View all events (structured JSONL)
for event in foreman.event_log:
    print(event)
    # {"ts": "...", "mode": "spawn", "tool": "bg_agent", "verdict": "spawned", ...}
```

---

## Safety: Policy-First Approach

### Why NOT `--dangerously-bypass-approvals`

That flag is **too blunt**. It removes ALL safety, which can cause:
- Accidental deletions (`rm -rf`)
- Permission leaks (chmod 777)
- Supply chain compromise (curl | sh)

### Why Use Scoped Auto-Approve Instead

**File writes only to test/ and docs/:**

```json
{
  "tools": {
    "file_edit": {
      "auto_approve_paths": ["tests/**", "docs/**"],
      "dangerous_paths": [".env", "*.key", "policy.json"],
      "max_bytes_per_write": 200000
    }
  }
}
```

**Bash commands, but never destructive:**

```json
{
  "tools": {
    "bash": {
      "allowed_patterns": ["python3 scripts/", "git add", "npm install"],
      "deny_patterns": ["rm -rf", "chmod 777", "curl .* | sh", "sudo"]
    }
  }
}
```

**Result:** You get fast iteration WITHOUT sacrificing safety.

---

## Concrete Examples

### Example 1: Parallel Test Suite + Docs + Validation

```python
async def build_complete_suite():
    foreman = Foreman()

    # PLAN (minimal steps)
    steps = [
        "Spawn test writer",
        "Spawn doc generator",
        "Spawn schema validator",
        "Merge all artifacts",
        "Run final verification"
    ]

    # ACT (spawn, don't wait)
    await foreman.spawn_agent(
        "tests-bg",
        "Write pytest tests for chat interface",
        ["tests/", "scripts/graphlogue-chat.py"],
        expected_artifacts=["tests/test_chat_interface.py"]
    )

    await foreman.spawn_agent(
        "docs-bg",
        "Auto-generate docstrings and API reference",
        ["docs/", "scripts/"],
        expected_artifacts=["docs/API_REFERENCE.md"]
    )

    await foreman.spawn_agent(
        "validate-bg",
        "Run schema validation on event types",
        ["schemas/", "scripts/"],
        expected_artifacts=["validation_report.json"]
    )

    # VERIFY (poll until done)
    results = {}
    while len(results) < 3:
        for name in ["tests-bg", "docs-bg", "validate-bg"]:
            agent = foreman.agents[name]
            if agent.status == "complete" and name not in results:
                results[name] = agent.result
                print(f"✓ {name} complete")
        await asyncio.sleep(1)

    # SUMMARIZE
    is_valid, msg = foreman.verify(results)
    summary = foreman.summarize(
        goal="Complete test + doc + validation suite",
        actions=steps,
        artifacts=results
    )
    print(summary)

asyncio.run(build_complete_suite())
```

### Example 2: Code Review + Refactor (Sequential with Pause)

```python
async def review_and_refactor():
    foreman = Foreman()

    # PLAN
    steps = [
        "1. Run code review agent",
        "2. Wait for review results",
        "3. If issues found, spawn refactor agent",
        "4. Merge refactored code"
    ]

    # ACT: First agent
    await foreman.spawn_agent(
        "review-bg",
        "Code review: check graphlogue-chat.py for issues",
        ["scripts/graphlogue-chat.py"],
        expected_artifacts=["review_report.json"]
    )

    # Wait for review to complete
    while foreman.agents["review-bg"].status != "complete":
        await asyncio.sleep(2)

    review_result = foreman.agents["review-bg"].result
    issues_found = review_result.get("issues_count", 0)

    if issues_found > 0:
        # ACT: Refactor agent
        await foreman.spawn_agent(
            "refactor-bg",
            f"Fix {issues_found} issues from review",
            ["scripts/graphlogue-chat.py"],
            expected_artifacts=["scripts/graphlogue-chat.py.fixed"]
        )

        # Wait for refactor
        while foreman.agents["refactor-bg"].status != "complete":
            await asyncio.sleep(2)

    # SUMMARIZE
    print("✓ Review and refactor complete")

asyncio.run(review_and_refactor())
```

### Example 3: From Claude Code CLI

```bash
# Launch foreman with dev profile (wider permissions)
export POLICY_PROFILE=DEV
python3 scripts/foreman.py

# Or strict profile for production
export POLICY_PROFILE=STRICT
python3 scripts/foreman.py
```

---

## Policy Configuration

### DEV Profile (Fast Iteration)

```json
{
  "active_profile": "DEV",
  "tools": {
    "bash": {
      "require_approval": false,
      "allowed_patterns": ["python3 scripts/", "git add", "git commit", "npm install"],
      "deny_patterns": ["rm -rf /", "chmod 777", "curl .* | sh"],
      "max_timeout_ms": 120000
    }
  }
}
```

✅ Fast feedback
✅ Still protected from destructive commands
✅ Safe for CI/CD pipelines

### STRICT Profile (Production)

```json
{
  "active_profile": "STRICT",
  "tools": {
    "bash": {
      "require_approval": true,
      "allowed_patterns": ["python3 scripts/test.*", "git diff", "git status"],
      "deny_patterns": ["rm", "chmod", "curl", "git push", "git reset --hard"],
      "max_timeout_ms": 30000
    }
  }
}
```

✅ Explicit approvals for all actions
✅ Minimal allowed commands
✅ Short timeouts for safety

### Toggle Profile

```bash
# Development
echo '{"active_profile": "DEV"}' | jq . > policy.json

# Production
echo '{"active_profile": "STRICT"}' | jq . > policy.json
```

---

## Audit Trail Format

Each event is logged as JSONL:

```json
{"ts": "2025-10-28T18:00:00Z", "mode": "spawn", "tool": "bg_agent", "args_hash": "a1b2c3d4", "verdict": "spawned", "latency_ms": 5}
{"ts": "2025-10-28T18:00:10Z", "mode": "wait", "tool": "bg_agent", "args_hash": "a1b2c3d4", "verdict": "complete", "latency_ms": 10000}
```

**Secure by default:**
- Tokens and secrets are **redacted** before logging
- Args are **hashed** (not logged in full)
- All timestamps are **UTC RFC 3339**

```bash
# View audit trail
cat .foreman-events.jsonl | jq .

# Search events
cat .foreman-events.jsonl | jq 'select(.verdict == "failed")'
```

---

## Integration with Claude Code

### System Prompt for Claude Code

```
You are the Meta-Orchestrator inside a coding workspace.

Objectives:
- Bias toward execute→verify→summarize. Reflect only on failure or contradiction.
- Spawn background agents for long or parallelizable work.
- Prefer hard verifiers (tests, schema checks) over LLM judgments.
- Keep policies evolvable: read limits from policy.json; never hardcode.

Operating Rules:
1. Foreman loop:
   - PLAN: minimal step list
   - ACT: take the smallest next action
   - VERIFY: run targeted tests or checks
   - SUMMARIZE: brief delta + next step

2. Background agents:
   - Launch bg agents for independent tasks
   - Each agent declares: {task, inputs, allowed_paths, timeout, expected_artifacts}
   - Foreman never waits busy: it polls status and merges when ready

3. Tool safety:
   - Ask for explicit confirmation outside allowed_paths
   - Deny destructive patterns (rm -rf, chmod 777, curl | sh)
   - Use scoped auto-approve instead of bypassing safety

4. Reflection budget: 1 only
   - Cooldown 2 steps after reflecting
   - Don't reflect unless action failed or contradiction detected

Outputs per goal:
- A passing targeted test or clean verifier report
- A summary.md listing actions, artifacts, risks
- Structured audit events in .foreman-events.jsonl
```

### Usage in Claude Code

**Start foreman orchestrator:**

```python
import asyncio
from scripts.foreman import Foreman

async def orchestrate():
    foreman = Foreman()

    # Your workflow here
    await foreman.spawn_agent(...)

asyncio.run(orchestrate())
```

**Or via CLI:**

```bash
python3 scripts/foreman.py
```

---

## Key Differences: Foreman vs. Bypass

| Aspect | Foreman (Safe) | Bypass (Risky) |
|--------|---|---|
| Approvals | Scoped (paths, patterns) | None |
| Audit trail | Full JSONL with hashing | None |
| Policy enforcement | YES (policy.json) | NO |
| Destructive patterns | Denied by default | Allowed |
| Reflection budget | Limited (1) | None |
| Safe for CI/CD | YES | NO |
| Recovery from mistakes | Good (audit trail) | Poor |

---

## Running the Demo

```bash
# View foreman in action
python3 scripts/foreman.py

# Output:
#   ✓ Spawned agent: tests-chat-bg
#   ✓ Spawned agent: docs-api-bg
#   ✓ Spawned agent: validate-schema-bg
#
#   ⏳ Waiting for agents...
#   ✓ Agent complete: tests-chat-bg
#   ✓ Agent complete: docs-api-bg
#   ✓ Agent complete: validate-schema-bg
#
#   FOREMAN SUMMARY
#   ═════════════════════════════════════
#   Status: ✅ COMPLETE
```

---

## Summary

The **Foreman orchestrator** gives you:

✅ **Parallel execution** without blocking the main thread
✅ **Safety policies** (scoped, auditable, not bypassed)
✅ **Structured audit trails** (JSONL, hashed, redacted)
✅ **Fast iteration** (DEV profile) + Production safety (STRICT profile)
✅ **No reflection overhead** (execute fast, verify hard, reflect only on failure)

**This is production-ready and safer than bypassing approvals.**

Start with:

```bash
python3 scripts/foreman.py
```

Or integrate into your Claude Code system prompt and workflows.
