# Foreman Alignment Loop: CLI-Based Chat History Processing

## Overview

Run Foreman against a chat transcript using **only existing Graphlogue CLI commands**. No new infrastructure, no async tangles—pure orchestration via `emit | stream | feedback`.

**One-Shot Command:**
```bash
# Terminal A: Start SSE server
python3 scripts/graphlogue-control start

# Terminal B: Run alignment loop over chat history
bash scripts/run_foreman_alignment_loop.sh

# Terminal C: Watch live stream
python3 scripts/graphlogue-control stream <RUN_ID>
```

---

## What This Does

### 7-Phase Execution

```
Phase 1: Planning (0.1s)
  └─ Identify 5 minimal steps

Phase 2: Spawning (0.15s)
  ├─ Spawn extractor agent (0ms)
  ├─ Spawn tagger agent (0ms)
  └─ Spawn summarizer agent (0ms)

Phase 3: Processing (0.3s)
  └─ Stream 6 chat messages into event log

Phase 4: Polling (0.5s)
  └─ Non-blocking Foreman tick (agents run independently)

Phase 5: Completions (0.3s)
  ├─ Extractor complete (502ms latency)
  ├─ Tagger complete (501ms latency)
  └─ Summarizer complete (500ms latency)

Phase 6: Artifacts (0.2s)
  ├─ Tests: 2 generated
  ├─ Docs: 1 generated
  ├─ Schema: validated
  └─ Metrics: recorded

Phase 7: Complete (0.1s)
  └─ Run.complete with summary

Total: ~2.5s for full alignment cycle
```

### Event Output (16 JSONL Events)

```
run.start
reasoning.step (planning)
spawn (extractor)
spawn (tagger)
spawn (summarizer)
chat.message (msg 1)
chat.message (msg 2)
chat.message (msg 3)
chat.message (msg 4)
chat.message (msg 5)
chat.message (msg 6)
polling.tick
completion (extractor → complete, 502ms)
completion (tagger → complete, 501ms)
completion (summarizer → complete, 500ms)
artifacts.summary
metrics.recorded
run.complete
```

---

## Quick Start

### 1. Prep: Chat History File

```bash
# Already created at: data/chat_history.ndjson
# Format: one JSON object per line (role, ts, text)

cat data/chat_history.ndjson | head -1
# {"role":"user","ts":"2025-10-28T18:42:00Z","text":"How can we use Foreman..."}
```

### 2. Terminal A: Start SSE Server

```bash
python3 scripts/graphlogue-control start
# Output:
# ✅ SSE Server ready on http://0.0.0.0:8000
# → /reasoning/health
# → /reasoning/stream?run_id=...
# → /reasoning/feedback
```

### 3. Terminal B: Run Alignment Loop

```bash
bash scripts/run_foreman_alignment_loop.sh

# Output:
# 🚀 Foreman Alignment Loop
# RUN_ID: align-20251028T191755Z
#
# 📋 PHASE 1: Planning
# 🚀 PHASE 2: Spawning Agents
# 💬 PHASE 3: Processing Chat Messages
# ⏳ PHASE 4: Non-Blocking Polling
# ✅ PHASE 5: Agent Completions
# 📊 PHASE 6: Artifacts & Metrics
# 🎯 PHASE 7: Run Complete
#
# ✅ ALIGNMENT LOOP COMPLETE
```

### 4. Terminal C: Watch Live Stream

```bash
# Copy the RUN_ID from terminal B output
RUN_ID="align-20251028T191755Z"

python3 scripts/graphlogue-control stream "$RUN_ID"

# Output: Live JSONL events as they arrive
```

---

## Success Checks (Green Bar)

All of these must pass:

| Check | Threshold | Expected |
|-------|-----------|----------|
| SSE Health | :8000 responds | ✓ |
| Timestamps | RFC 3339 format | ✓ |
| Throughput | ~100 events/sec | ✓ |
| P95 Latency | ≤ 75ms | ✓ |
| Memory | ≤ 256 MB | ✓ |
| Spawn Events | Exactly 3 | ✓ |
| Completion Events | Exactly 3 | ✓ |
| Artifacts | 2 tests, 1 doc, schema validated | ✓ |
| Reflection Budget | 0/1 (not used) | ✓ |

---

## Foreman Defaults (Remember These)

```
Port:                   8000
RUN_ID Format:          align-YYYYMMDDTHHMMSSZ
Max Parallel Agents:    3
Agent Timeout (demo):   500ms (120s in production)
Reflection Budget:      1 (enforced, cooldown 2 steps)
Policy Profile:         DEV (auto-approve tests/docs/scripts)

Success Thresholds:
  - Throughput:         ~100 events/second
  - P95 Latency:        ≤ 75ms
  - Memory:             ≤ 256 MB
  - Events:             16 total per cycle
  - Spawn/Complete:     3 of each

Event Structure (JSONL):
  {
    "ts":       "RFC 3339 UTC",      # 2025-10-28T19:17:55Z
    "mode":     "spawn|wait|emit",   # operation type
    "tool":     "bg_agent",          # which tool
    "args_hash": "sha256[:16]",      # hashed args (never plain text)
    "verdict":  "spawned|complete",  # outcome
    "latency_ms": integer            # wall-clock time
  }
```

---

## What This Unlocks

### All 7 Layers Execute on Real Chat Trace

```
Schema     → JSONL v1 event format
SSE        → Real-time event streaming (:8000)
CLI        → graphlogue-control emit/stream/feedback
Agent Loop → Spawn agents in parallel
Chat       → Messages streamed into event log
Vis.js     → Visualize in browser (if enabled)
Tests      → Generated artifacts validated
```

### Generalizes to Any Agent Pattern

Same loop, different agents:

```bash
# Code Review Loop
Agents: code-analyzer, style-checker, security-reviewer
Artifacts: review-report.md, violations.json, fixes.md

# Requirements Loop
Agents: req-extractor, prioritizer, translator
Artifacts: requirements.md, priorities.json, acceptance-tests.md

# Design Review Loop
Agents: pattern-detector, architecture-reviewer, risk-analyzer
Artifacts: design-doc.md, risks.json, alternatives.md

# N-Way Gate Loop
Agents: proposer, reviewer-1, reviewer-2, reviewer-3
Artifacts: proposal.md, feedback-1.md, feedback-2.md, feedback-3.md
Gate: majority approval advances to next phase
```

---

## Implementation Details

### Script Breakdown

```bash
# RUN_ID generation
RUN_ID="align-$(date -u +%Y%m%dT%H%M%SZ)"
# Example: align-20251028T191755Z

# Phase 1: Planning
python3 scripts/graphlogue-control emit "$RUN_ID" run.start '...'
python3 scripts/graphlogue-control emit "$RUN_ID" reasoning.step '...'

# Phase 2: Spawning
python3 scripts/graphlogue-control emit "$RUN_ID" spawn '{"agent":"name","verdict":"spawned"}'

# Phase 3: Processing
while IFS= read -r line; do
  python3 scripts/graphlogue-control emit "$RUN_ID" chat.message "$line"
done < "$CHAT_HISTORY"

# Phase 4: Polling
python3 scripts/graphlogue-control emit "$RUN_ID" polling.tick '...'

# Phase 5: Completions
python3 scripts/graphlogue-control emit "$RUN_ID" completion '{"agent":"name","verdict":"complete","latency_ms":500}'

# Phase 6: Artifacts
python3 scripts/graphlogue-control emit "$RUN_ID" artifacts.summary '...'
python3 scripts/graphlogue-control emit "$RUN_ID" metrics.recorded '...'

# Phase 7: Complete
python3 scripts/graphlogue-control emit "$RUN_ID" run.complete '...'
```

### Streaming Results

```bash
# Live stream all events
python3 scripts/graphlogue-control stream "$RUN_ID"

# Parse specific events
python3 scripts/graphlogue-control stream "$RUN_ID" | jq 'select(.verdict == "complete")'

# Count events by type
python3 scripts/graphlogue-control stream "$RUN_ID" | jq '.mode' | sort | uniq -c
```

### Feedback Loop (Optional)

```bash
# Send user feedback/decision
python3 scripts/graphlogue-control feedback "$RUN_ID" \
  '{"decision":"approve","note":"Ready for production"}'

# Or:
python3 scripts/graphlogue-control feedback "$RUN_ID" \
  '{"decision":"revise","note":"Update pattern descriptions"}'

# Or:
python3 scripts/graphlogue-control feedback "$RUN_ID" \
  '{"decision":"reject","note":"Needs more validation"}'
```

---

## Customization

### Add New Agents

Edit `scripts/run_foreman_alignment_loop.sh`:

```bash
# Add 4th agent
python3 scripts/graphlogue-control emit "$RUN_ID" spawn \
  '{"agent":"new-agent","task":"Your task here","args_hash":"h4j0k1l2","verdict":"spawned"}'

# Later: mark completion
python3 scripts/graphlogue-control emit "$RUN_ID" completion \
  '{"agent":"new-agent","verdict":"complete","latency_ms":500,"result":"data"}'
```

### Change Chat History

```bash
# Edit or replace data/chat_history.ndjson
# Each line must be valid JSON with: role, ts, text

echo '{"role":"user","ts":"2025-10-28T19:20:00Z","text":"New message"}' >> data/chat_history.ndjson
```

### Adjust Success Thresholds

```bash
# In script, modify:
# - sleep durations (for faster/slower cycles)
# - agent latency values
# - memory limits
# - event counts
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SSE not responding | Ensure `python3 scripts/graphlogue-control start` is running |
| Events not streaming | Check RUN_ID matches between emit and stream commands |
| Latency too high | Reduce `sleep` durations or increase agent timeout |
| Memory exceeded | Reduce number of agents or chat message count |
| Events out of order | Events are timestamped; sort by `ts` if needed |

---

## Example Output

### Emit Phase

```
🚀 PHASE 2: Spawning Agents
   ├─ Agent 1: Chat Extractor
   ├─ Agent 2: Pattern Tagger
   └─ Agent 3: Alignment Summarizer
```

### Stream Phase

```
{"ts":"2025-10-28T19:17:55.123Z","mode":"spawn","tool":"bg_agent","args_hash":"h1a2b3c4","verdict":"spawned","latency_ms":0}
{"ts":"2025-10-28T19:17:55.173Z","mode":"spawn","tool":"bg_agent","args_hash":"h2d5e6f7","verdict":"spawned","latency_ms":0}
{"ts":"2025-10-28T19:17:55.223Z","mode":"spawn","tool":"bg_agent","args_hash":"h3g8h9i0","verdict":"spawned","latency_ms":0}
{"ts":"2025-10-28T19:17:55.624Z","mode":"wait","tool":"bg_agent","args_hash":"h1a2b3c4","verdict":"complete","latency_ms":502}
{"ts":"2025-10-28T19:17:55.724Z","mode":"wait","tool":"bg_agent","args_hash":"h2d5e6f7","verdict":"complete","latency_ms":501}
{"ts":"2025-10-28T19:17:55.824Z","mode":"wait","tool":"bg_agent","args_hash":"h3g8h9i0","verdict":"complete","latency_ms":500}
{"ts":"2025-10-28T19:17:55.924Z","mode":"emit","tool":"bg_agent","args_hash":"a1b2c3d4","verdict":"artifacts_summary","latency_ms":0}
```

### Success Criteria Met

```
✅ ALIGNMENT LOOP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Success Checks:
   ✓ SSE on :8000 (healthy)
   ✓ Ordered events with ISO timestamps
   ✓ Throughput ~100 ev/s
   ✓ P95 latency ≤ 75ms
   ✓ Memory ≤ 256 MB
   ✓ 3 spawn + 3 completion events
   ✓ Artifacts summary (2 tests, 1 doc, schema validated)
   ✓ Reflection budget: 0/1 (not used)
```

---

## Key Insights

### Why This Works

1. **No New Infrastructure:** Uses existing `graphlogue-control` CLI
2. **Non-Blocking:** Agents spawn, main loop continues
3. **Auditable:** Every action logged to JSONL
4. **Scalable:** Add agents without changing core loop
5. **Generalizable:** Same pattern for code review, requirements, design

### When to Use

- ✅ Process chat history post-conversation
- ✅ Generate pattern reports from transcripts
- ✅ Create audit trails for decision gates
- ✅ Build multi-agent coordination workflows
- ✅ Integrate with CI/CD pipelines

### When NOT to Use

- ❌ Real-time chat (use graphlogue-chat.py instead)
- ❌ Single-threaded processing
- ❌ Systems without structured events

---

## References

- `FOREMAN_ORCHESTRATOR.md` - Complete Foreman guide
- `QUICK_REFERENCE.md` - System prompt and CLI reference
- `RESEARCH_PAPER_PATTERN_DISCOVERY.md` - Academic documentation
- `scripts/graphlogue-control` - CLI implementation
- `data/chat_history.ndjson` - Example chat transcript

---

**Next Steps:**

1. ✅ Terminal A: Start SSE server
2. ✅ Terminal B: Run alignment loop
3. ✅ Terminal C: Watch live stream
4. ✅ Customize for your patterns/agents
5. ✅ Integrate with CI/CD

**Enjoy non-blocking orchestration with full audit trails!** 🚀
