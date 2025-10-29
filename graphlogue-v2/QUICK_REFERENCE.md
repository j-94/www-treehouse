# Claude Code Meta-Orchestrator: Quick Reference

## System Prompt (Copy-Paste Ready)

```
You are the Meta-Orchestrator inside a coding workspace.

Objectives:
- Execute → Verify → Summarize. Reflect only on failure or contradiction.
- Spawn background agents ("bg agents") for parallel work; keep a concise foreman log.
- Prefer hard verifiers (tests, schema checks) over LLM judgments.
- Keep policies evolvable: read limits from policy.json; never hardcode.

Operating Rules:
1) Foreman loop:
   - PLAN: minimal step list
   - ACT: take smallest next action
   - VERIFY: run targeted tests/checks
   - SUMMARIZE: brief delta + next step
   (Reflect only on failure/contradiction)

2) Background agents:
   - Launch for independent tasks (tests, docs, refactors, search)
   - Each declares: {task, inputs, allowed_paths, timeout, expected_artifacts}
   - Foreman never waits busy: polls status, merges when ready

3) Tool safety:
   - Ask for explicit confirmation outside allowed_paths
   - Deny destructive patterns: rm -rf, chmod 777, curl .* | sh
   - Use scoped auto-approve instead of full bypass

4) Parallel candidates:
   - Generate up to 3 when helpful
   - Pairwise judge quickly; discard others

5) Logging & audit:
   - Emit events: {ts, mode, tool, args_hash, verdict, latency_ms}
   - Redact secrets; never log tokens
   - All to .foreman-events.jsonl

Outputs per goal:
- A passing test or clean verifier report
- summary.md with actions, artifacts, risks
- If policy text changed, quote exact lines

Constraints:
- reflection_budget=1; cooldown_after_reflect_steps=2
- Token/time budgets from policy.json
- Never bypass approvals or sandboxing
```

---

## Files Created

| File | Purpose |
|------|---------|
| `policy.json` | Safety & permission profiles (DEV/STRICT) |
| `scripts/foreman.py` | Background agent orchestrator |
| `FOREMAN_ORCHESTRATOR.md` | Complete usage guide |
| `QUICK_REFERENCE.md` | This file |

---

## One-Minute Setup

```bash
# 1. View policy
cat policy.json

# 2. Try foreman
python3 scripts/foreman.py

# 3. Check audit trail
cat .foreman-events.jsonl | jq .

# 4. Toggle profiles
export POLICY_PROFILE=STRICT  # Strict mode
export POLICY_PROFILE=DEV     # Dev mode (default)
```

---

## Policy Profiles at a Glance

### DEV (Fast Iteration)
- ✅ `python3 scripts/*`
- ✅ `git add`, `git commit`
- ✅ Auto-approve: `tests/**`, `docs/**`
- ❌ Deny: `rm -rf`, `chmod 777`, `curl | sh`

### STRICT (Production)
- ✅ `python3 scripts/test.*`, `git diff`
- ✅ Require approvals
- ❌ Deny almost everything else

---

## Spawn Agents (Async, Non-Blocking)

```python
from scripts.foreman import Foreman
import asyncio

async def main():
    foreman = Foreman()

    # Spawn in parallel (main thread continues)
    await foreman.spawn_agent(
        name="tests-bg",
        task="Write unit tests",
        allowed_paths=["tests/", "scripts/"],
        timeout_seconds=120,
        expected_artifacts=["tests/test_*.py"]
    )

    await foreman.spawn_agent(
        name="docs-bg",
        task="Generate API docs",
        allowed_paths=["docs/", "scripts/"],
        expected_artifacts=["docs/API.md"]
    )

    # Main thread free to do other work
    print("Agents spawned (non-blocking)")

    # Later: poll & merge when ready
    if foreman.agents["tests-bg"].status == "complete":
        results = foreman.agents["tests-bg"].result

asyncio.run(main())
```

---

## Audit Trail

Every action logged as JSONL:

```bash
# View all events
cat .foreman-events.jsonl | jq .

# Find failures
cat .foreman-events.jsonl | jq 'select(.verdict == "failed")'

# Check by tool
cat .foreman-events.jsonl | jq 'select(.tool == "bash")'

# Extract args_hash (never logs full args for security)
cat .foreman-events.jsonl | jq '.args_hash'
```

---

## Safety: Scoped vs. Bypass

| Aspect | Scoped Auto-Approve | Full Bypass |
|--------|---|---|
| Allowed paths | ✓ Configurable | ✗ All |
| Denied patterns | ✓ Yes | ✗ None |
| Audit trail | ✓ Full JSONL | ✗ None |
| Safe for CI/CD | ✓ Yes | ✗ No |
| Recovery | ✓ Good | ✗ Hard |

**TL;DR:** Scoped is safer AND faster.

---

## Comparison: Bypass vs. Foreman

**DON'T DO THIS:**
```bash
claude --dangerously-bypass-approvals-and-sandbox
# ✗ No safety, no audit, no recovery
```

**DO THIS INSTEAD:**
```bash
export POLICY_PROFILE=DEV
python3 scripts/foreman.py
# ✓ Safety, audit trail, fast iteration
```

---

## Integration with Graphlogue

Your system layers:

```
Graphlogue Chat Loop (graphlogue-chat.py)
    ↓
Graphlogue Control (graphlogue-control)
    ↓
Foreman Orchestrator (scripts/foreman.py) ← NEW
    ↓
Background Agents (parallel execution)
    ↓
Audit Trail (.foreman-events.jsonl)
```

---

## Common Tasks

### Task 1: Spawn Tests + Docs + Validation

```python
tasks = [
    ("tests-bg", "Write pytest tests", ["tests/", "scripts/"]),
    ("docs-bg", "Generate API reference", ["docs/", "scripts/"]),
    ("validate-bg", "Validate schema", ["schemas/", "scripts/"])
]

for name, task, paths in tasks:
    await foreman.spawn_agent(name, task, paths)

# All running in parallel; main thread continues
```

### Task 2: Sequential Workflow

```python
# Start agent 1
await foreman.spawn_agent("review-bg", "Code review", ["scripts/"])

# Wait for it
while foreman.agents["review-bg"].status != "complete":
    await asyncio.sleep(1)

# Only then start agent 2
await foreman.spawn_agent("refactor-bg", "Fix issues", ["scripts/"])
```

### Task 3: Check Results

```python
# Poll agents
for name in ["tests-bg", "docs-bg", "validate-bg"]:
    agent = foreman.agents[name]
    print(f"{name}: {agent.status}")
    if agent.status == "complete":
        print(f"  Artifacts: {agent.result['artifacts']}")
```

---

## Debugging

```bash
# See what agents are running
python3 -c "
from scripts.foreman import Foreman
f = Foreman()
for name, agent in f.agents.items():
    print(f'{name}: {agent.status}')
"

# Check event for errors
cat .foreman-events.jsonl | grep '"verdict": "failed"'

# Tail audit trail in real-time
tail -f .foreman-events.jsonl | jq .
```

---

## Policy: Key Fields

```json
{
  "active_profile": "DEV",  // Switch between DEV, STRICT
  "budgets": {
    "max_parallel_agents": 4,
    "agent_timeout_seconds": 120,
    "reflection": 1
  },
  "tools": {
    "bash": {
      "allowed_patterns": ["python3 scripts/", "git add"],
      "deny_patterns": ["rm -rf", "chmod 777", "curl .* | sh"]
    },
    "file_edit": {
      "auto_approve_paths": ["tests/**", "docs/**"],
      "dangerous_paths": [".env", "*.key"]
    }
  }
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Agents not spawning | Check `policy.json` active_profile |
| Permission denied | Add to `auto_approve_paths` |
| Timeout too short | Increase `agent_timeout_seconds` |
| No audit trail | Check `.foreman-events.jsonl` exists |
| Too many agents | Reduce `max_parallel_agents` |

---

## Key Takeaways

✅ **Spawn agents in parallel** → non-blocking, foreman continues
✅ **Safety via policy** → allowed_paths + deny_patterns
✅ **Full audit** → every action logged to JSONL
✅ **No bypass needed** → scoped approvals are safer
✅ **Reflection budget** → 1 only, use on failure
✅ **CI/CD safe** → safe patterns, audit trail

---

## Start Here

```bash
# 1. Run demo
python3 scripts/foreman.py

# 2. Read full guide
cat FOREMAN_ORCHESTRATOR.md

# 3. Copy system prompt into Claude Code
cat <<'EOF'
You are the Meta-Orchestrator...
[paste from above]
EOF

# 4. Try it
export POLICY_PROFILE=DEV
python3 scripts/foreman.py
```

---

**You have a production-ready meta-orchestrator. Use it.**

No bypass needed. Safe + fast.
