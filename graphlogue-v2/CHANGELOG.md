# Changelog — Graphlogue v2 Snapshot Pipeline

All notable changes to this project will be documented in this file.

## [0.2.0] — 2025-10-28 — Production Release

### ✅ Added

- **JSONL v1 Schema** (`schemas/snapshot_event.schema.json`)
  - RFC 3339 timestamps (UTC)
  - Structured event types: `run.start`, `surface.ready`, `capture.start`, `artifact.produced`, `net.error`, `orchestrator.error`, `run.complete`
  - Per-run ID (`run_id`) and event sequence number (`seq`) for traceability

- **Hardened Runtime**
  - `graphlogue_snapshot.sh`: Enhanced JSONL emission with v1 schema compliance, RFC 3339 timestamps, run ID + seq tracking
  - `trace_snapshot_run.py`: JSONL parser with schema validation, structured trace output with event nesting
  - `derive_policy.py`: Policy derivation script comparing actual vs simulated baselines

- **CLI Wrapper** (`scripts/glg`)
  - One-shot commands: `glg snapshot`, `glg trace`, `glg anneal`, `glg full-cycle`, `glg verify`
  - Composable workflow: each step independent
  - Acceptance suite integration: `glg verify`

- **CI/CD Pipeline**
  - GitHub Actions workflow (`.github/workflows/ci.yml`)
  - Acceptance tests (`ci/accept.sh`)
  - Schema validation (`ci/validate_schemas.py`)
  - Artifact upload (screenshots, traces, policies)

- **Developer Experience**
  - Makefile targets: `snapshots`, `trace`, `anneal`, `orch-snap`, `full-cycle`, `help`
  - Updated README with "Start Here" section
  - Comprehensive SCRIPTS.md reference

### 🚫 Excluded (v0.3.0-alpha)

- Event streaming (SSE) — flagged off, deferred
- Feedback channel — UI-only stubs, full implementation deferred
- Orchestrator mode hardening — basic support only, full error handling deferred

### 📊 Quality Metrics

- **Tests**: 4 acceptance criteria all passing
- **Schema**: JSONL v1 RFC 3339 compliant
- **Coverage**: snapshot → trace → policy pipeline end-to-end tested
- **Performance**: Full cycle completes in <60 sec (local)

---

## [0.1.0] — 2025-10-28 — Initial Implementation

### Added

- Event-driven snapshot workflow
- Trace parsing (JSONL → JSON)
- Policy derivation (baseline comparison)
- Makefile + justfile targets
- Documentation (README, SCRIPTS.md)

---

## Roadmap

### v0.3.0-alpha (November 2025)

- [ ] Event streaming (SSE server)
- [ ] Bidirectional feedback channel
- [ ] Orchestrator mode hardening
- [ ] Real-time graph visualization
- [ ] Multi-device MCP support

### v1.0.0 (TBD)

- [ ] Production orchestrator
- [ ] Multi-tenant trace isolation
- [ ] Historical policy comparison
- [ ] A/B testing framework
- [ ] Web dashboard

---

Generated: 2025-10-28 | v0.2.0-prod
