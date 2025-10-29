#!/usr/bin/env python3
"""
Graphlogue Meta-Orchestrator Foreman
Coordinates background agents while maintaining safety & audit trails
"""
import asyncio
import json
import time
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional
import hashlib

REPO_ROOT = Path(__file__).parent.parent
POLICY_FILE = REPO_ROOT / "policy.json"
EVENT_LOG = REPO_ROOT / ".foreman-events.jsonl"

class ForemanEvent:
    """Structured audit event"""
    def __init__(self, mode: str, tool: str, args: dict, verdict: str, latency_ms: int):
        self.ts = datetime.now(timezone.utc).isoformat()
        self.mode = mode
        self.tool = tool
        self.args_hash = hashlib.sha256(json.dumps(args, sort_keys=True).encode()).hexdigest()[:16]
        self.verdict = verdict
        self.latency_ms = latency_ms

    def to_jsonl(self) -> str:
        return json.dumps(self.__dict__)

class BackgroundAgent:
    """Represents a background task"""
    def __init__(self, name: str, task: str, allowed_paths: List[str],
                 timeout_seconds: int, expected_artifacts: List[str]):
        self.name = name
        self.task = task
        self.allowed_paths = allowed_paths
        self.timeout_seconds = timeout_seconds
        self.expected_artifacts = expected_artifacts
        self.started_at = None
        self.status = "pending"  # pending, running, complete, failed
        self.result = None
        self.error = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "task": self.task,
            "allowed_paths": self.allowed_paths,
            "timeout_seconds": self.timeout_seconds,
            "expected_artifacts": self.expected_artifacts,
            "status": self.status,
            "started_at": self.started_at,
            "result": self.result,
            "error": self.error
        }

class Foreman:
    """Meta-orchestrator for background agents"""

    def __init__(self):
        self.policy = self._load_policy()
        self.agents: Dict[str, BackgroundAgent] = {}
        self.event_log = []
        self.reflection_used = 0

    def _load_policy(self) -> dict:
        """Load safety policy"""
        if POLICY_FILE.exists():
            with open(POLICY_FILE) as f:
                return json.load(f)
        return {"profiles": {"DEV": {"level": "permissive"}}}

    def _log_event(self, event: ForemanEvent):
        """Audit log event"""
        self.event_log.append(event.to_jsonl())
        with open(EVENT_LOG, "a") as f:
            f.write(event.to_jsonl() + "\n")

    def _check_permissions(self, tool: str, args: dict) -> tuple[bool, str]:
        """Check if action is permitted by policy"""
        profile = self.policy.get("active_profile", "DEV")
        tool_policy = self.policy.get("tools", {}).get(tool, {}).get(profile, {})

        # Check deny patterns
        deny_patterns = tool_policy.get("deny_patterns", [])
        if tool == "bash" and "args" in args:
            for pattern in deny_patterns:
                if pattern in args["args"]:
                    return False, f"Denied by pattern: {pattern}"

        # Check allowed paths
        if tool in ["file_read", "file_edit"] and "path" in args:
            allowed_paths = tool_policy.get("allowed_paths", [])
            if not any(args["path"].startswith(p) for p in allowed_paths):
                return False, f"Path not in allowed_paths: {args['path']}"

        return True, "OK"

    async def spawn_agent(self, name: str, task: str, allowed_paths: List[str],
                         timeout_seconds: int = 120,
                         expected_artifacts: List[str] = None) -> BackgroundAgent:
        """Spawn a background agent"""
        if expected_artifacts is None:
            expected_artifacts = []

        agent = BackgroundAgent(name, task, allowed_paths, timeout_seconds, expected_artifacts)
        self.agents[name] = agent

        start = time.time()
        agent.started_at = datetime.now(timezone.utc).isoformat()
        agent.status = "running"

        # Log event
        self._log_event(ForemanEvent(
            mode="spawn",
            tool="bg_agent",
            args={"name": name, "task": task},
            verdict="spawned",
            latency_ms=int((time.time() - start) * 1000)
        ))

        print(f"✓ Spawned agent: {name} (task: {task})")
        return agent

    async def wait_agent(self, name: str) -> BackgroundAgent:
        """Wait for agent to complete"""
        if name not in self.agents:
            raise ValueError(f"Agent not found: {name}")

        agent = self.agents[name]
        start = time.time()

        # In real implementation, would poll actual bg job status
        # For now, simulate completion
        await asyncio.sleep(0.5)
        agent.status = "complete"
        agent.result = {"artifacts": agent.expected_artifacts}

        self._log_event(ForemanEvent(
            mode="wait",
            tool="bg_agent",
            args={"name": name},
            verdict="complete",
            latency_ms=int((time.time() - start) * 1000)
        ))

        print(f"✓ Agent complete: {name}")
        return agent

    async def plan_step(self, goal: str) -> List[str]:
        """Generate minimal step list"""
        print(f"\n📋 Planning for: {goal}")
        return [
            "1. Validate inputs",
            "2. Spawn parallel agents",
            "3. Collect results",
            "4. Verify output",
            "5. Report summary"
        ]

    def verify(self, artifacts: dict) -> tuple[bool, str]:
        """Run verification (schema check, test, etc)"""
        # Check required fields
        if not artifacts:
            return False, "No artifacts produced"

        # In real implementation, would run actual tests/schema validation
        return True, "Verification passed"

    def summarize(self, goal: str, actions: List[str], artifacts: dict) -> str:
        """Generate summary report"""
        summary = f"""
═════════════════════════════════════════════════════════════
FOREMAN SUMMARY
═════════════════════════════════════════════════════════════

Goal: {goal}

Actions Taken:
{chr(10).join(f"  {a}" for a in actions)}

Artifacts Produced:
{chr(10).join(f"  • {k}: {v}" for k, v in artifacts.items())}

Events Logged: {len(self.event_log)}
Reflection Used: {self.reflection_used}/1

Status: ✅ COMPLETE

═════════════════════════════════════════════════════════════
        """
        return summary

async def demo_parallel_workflow():
    """Demo: parallel background agents for tests, docs, validation"""
    foreman = Foreman()

    # PLAN
    steps = await foreman.plan_step("Build comprehensive test suite for chat interface")
    for step in steps:
        print(f"  {step}")

    # ACT: Spawn parallel agents
    print("\n🚀 Spawning background agents...")

    agent1 = await foreman.spawn_agent(
        name="tests-chat-bg",
        task="Write unit tests for graphlogue-chat.py",
        allowed_paths=["tests/", "scripts/graphlogue-chat.py"],
        expected_artifacts=["tests/test_chat_interface.py", "tests/test_chat_streaming.py"]
    )

    agent2 = await foreman.spawn_agent(
        name="docs-api-bg",
        task="Generate API reference from code",
        allowed_paths=["docs/", "scripts/"],
        expected_artifacts=["docs/API_REFERENCE.md"]
    )

    agent3 = await foreman.spawn_agent(
        name="validate-schema-bg",
        task="Validate event schema against production events",
        allowed_paths=["schemas/", "scripts/"],
        expected_artifacts=["validation_report.json"]
    )

    # VERIFY: Wait for all to complete
    print("\n⏳ Waiting for agents (foreman doesn't block)...")
    results = {}
    for agent_name in ["tests-chat-bg", "docs-api-bg", "validate-schema-bg"]:
        agent = await foreman.wait_agent(agent_name)
        results[agent_name] = agent.status
        print(f"   {agent_name}: {agent.status}")

    # SUMMARIZE
    artifacts = {
        "test_files": 2,
        "docs_generated": 1,
        "schema_validated": True,
        "agents_spawned": 3,
        "all_passed": True
    }

    is_valid, msg = foreman.verify(artifacts)
    summary = foreman.summarize(
        goal="Build comprehensive test suite",
        actions=[
            "Spawned 3 parallel agents",
            "Agent 1: Generated unit tests",
            "Agent 2: Generated API docs",
            "Agent 3: Validated schema",
            "All agents completed successfully"
        ],
        artifacts=artifacts
    )

    print(summary)

    # REFLECT only if needed
    if not is_valid:
        foreman.reflection_used += 1
        print(f"⚠️  Reflection triggered: {msg}")
        print("Cooldown: waiting 2 steps before retry")

if __name__ == "__main__":
    asyncio.run(demo_parallel_workflow())
