#!/usr/bin/env python3
"""
Meta-Loop Engine: Universal Loop Generator
Engine + Policy + Goal = Loop

Just one prompt. That's it.
"""

import json
import time
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
import hashlib

# Paths
POLICY_FILE = Path("~/Desktop/nix-config/meta-policies/loop-generation-policy.json").expanduser()
ORCHESTRATOR_POLICY = Path("~/Desktop/nix-config/meta-policies/orchestrator-policy.json").expanduser()
PATTERN_DIR = Path("~/Desktop/failed_alignment_project/precursor/patterns").expanduser()
EVENT_LOG = Path("~/.cache/meta-orchestrator/loop-events.jsonl").expanduser()

@dataclass
class ConsciousnessBits:
    A: float  # Ask/Observe
    U: float  # Uncertainty
    P: float  # Process
    E: float  # Evidence
    delta: float  # Drift
    T: float  # Trust
    M: float  # Meta

@dataclass
class LoopSpec:
    name: str
    agents: List[str]
    gate_type: str
    budget: Dict[str, int]
    timeout_ms: int
    consciousness_targets: Optional[Dict[str, float]] = None

@dataclass
class LoopInstance:
    spec: LoopSpec
    status: str  # ready, active, idle
    created_at: float
    executions: int = 0
    avg_latency_ms: float = 0.0

class MetaLoopEngine:
    """Universal loop generator"""

    def __init__(self):
        self.policy = self._load_policy()
        self.orchestrator_policy = self._load_orchestrator_policy()
        self.patterns = self._load_patterns()
        self.loop_registry: Dict[str, LoopInstance] = {}
        self.consciousness = ConsciousnessBits(
            A=0.5, U=0.3, P=0.5, E=0.5, delta=0.0, T=0.7, M=0.0
        )

        # Auto-generate core loops on startup
        self._bootstrap_core_loops()

        EVENT_LOG.parent.mkdir(parents=True, exist_ok=True)

    def _load_policy(self) -> dict:
        """Load loop generation policy"""
        if POLICY_FILE.exists():
            with open(POLICY_FILE) as f:
                return json.load(f)
        return {}

    def _load_orchestrator_policy(self) -> dict:
        """Load orchestrator policy for budgets/constraints"""
        if ORCHESTRATOR_POLICY.exists():
            with open(ORCHESTRATOR_POLICY) as f:
                return json.load(f)
        return {"budgets": {"max_parallel_agents": 4, "agent_timeout_seconds": 120}}

    def _load_patterns(self) -> Dict[str, dict]:
        """Load pattern catalog"""
        patterns = {}
        if PATTERN_DIR.exists():
            for pf in PATTERN_DIR.glob("*.json"):
                with open(pf) as f:
                    doc = json.load(f)
                    patterns[doc['id']] = doc
        return patterns

    def _bootstrap_core_loops(self):
        """Auto-generate core loops from policy"""
        core_loops_config = self.policy.get("core_loops", {}).get("loops", {})

        for loop_name, config in core_loops_config.items():
            spec = LoopSpec(
                name=loop_name,
                agents=config.get("agents", []),
                gate_type=config.get("gate", "majority"),
                budget=self.orchestrator_policy.get("budgets", {}),
                timeout_ms=120000,
            )

            instance = LoopInstance(
                spec=spec,
                status="ready",
                created_at=time.time(),
            )

            self.loop_registry[loop_name] = instance

        print(f"✓ Bootstrapped {len(self.loop_registry)} core loops")

    def create_loop(self, goal: str) -> LoopInstance:
        """
        Universal loop generator

        Example: "create security audit loop"
        Returns: LoopInstance ready in <30ms
        """
        start_time = time.time()

        # Step 1: Parse goal
        intent = self._parse_goal(goal)

        # Step 2: Load policy constraints
        constraints = self._get_constraints()

        # Step 3: Select applicable patterns
        applicable_patterns = self._select_patterns(intent)

        # Step 4: Compile loop specification
        spec = self._compile_loop_spec(intent, constraints, applicable_patterns)

        # Step 5: Instantiate loop
        instance = LoopInstance(
            spec=spec,
            status="ready",
            created_at=time.time(),
        )

        # Register
        self.loop_registry[spec.name] = instance

        # Update consciousness
        self._update_consciousness(created_loop=True)

        # Log event
        generation_time_ms = (time.time() - start_time) * 1000
        self._log_event({
            "event": "loop_created",
            "loop_name": spec.name,
            "goal": goal,
            "generation_time_ms": generation_time_ms,
            "agents_count": len(spec.agents),
        })

        print(f"✓ {spec.name} ready ({generation_time_ms:.0f}ms)")

        return instance

    def _parse_goal(self, goal: str) -> Dict:
        """Parse natural language goal into intent"""
        intent = {
            "loop_type": "custom",
            "purpose": goal,
            "required_agents": [],
            "constraints": []
        }

        # Simple parsing (in real system, could use LLM here)
        goal_lower = goal.lower()

        # Meta-loops (loops that create/optimize loops)
        if "meta-loop" in goal_lower or "loop generator" in goal_lower:
            intent["loop_type"] = "meta_loop_generator"
            intent["required_agents"] = ["goal_parser", "spec_compiler", "loop_instantiator"]
            intent["gate_type"] = "pipeline"
        elif "optimization loop" in goal_lower or "optimize" in goal_lower:
            intent["loop_type"] = "optimization"
            intent["required_agents"] = ["usage_analyzer", "bottleneck_detector", "optimizer", "validator"]
            intent["gate_type"] = "sequential"
        elif "discovery" in goal_lower and "creates loops" in goal_lower:
            intent["loop_type"] = "recursive_discovery"
            intent["required_agents"] = ["pattern_detector", "clusterer", "loop_compiler", "validator"]
            intent["gate_type"] = "feedback"
        # Security
        elif "security" in goal_lower or "audit" in goal_lower:
            intent["loop_type"] = "security_audit"
            intent["required_agents"] = ["vulnerability_scanner", "secrets_detector", "compliance_checker"]
            intent["gate_type"] = "unanimous"
        # Deployment
        elif "deployment" in goal_lower or "deploy" in goal_lower:
            intent["loop_type"] = "deployment"
            intent["required_agents"] = ["validator", "deployer", "monitor"]
            intent["gate_type"] = "sequential"
            if "rollback" in goal_lower:
                intent["required_agents"].append("rollback_handler")
        # Testing
        elif "test" in goal_lower:
            intent["loop_type"] = "testing"
            intent["required_agents"] = ["test_generator", "test_runner", "coverage_analyzer"]
            intent["gate_type"] = "pipeline"
        # Code Review
        elif "review" in goal_lower:
            intent["loop_type"] = "code_review"
            intent["required_agents"] = ["reviewer_1", "reviewer_2", "reviewer_3"]
            intent["gate_type"] = "majority_vote"
        else:
            # Generic loop
            intent["loop_type"] = "custom"
            intent["required_agents"] = ["agent_1", "agent_2"]
            intent["gate_type"] = "sequential"

        return intent

    def _get_constraints(self) -> Dict:
        """Get policy constraints"""
        budgets = self.orchestrator_policy.get("budgets", {})
        return {
            "max_agents": budgets.get("max_parallel_agents", 4),
            "timeout_seconds": budgets.get("agent_timeout_seconds", 120),
            "reflection_budget": budgets.get("reflection", 1),
            "max_tokens": budgets.get("max_token_per_goal", 50000),
        }

    def _select_patterns(self, intent: Dict) -> List[Dict]:
        """Select patterns applicable to this intent"""
        applicable = []

        loop_type = intent.get("loop_type", "")

        # Match patterns to loop type
        for pattern_id, pattern in self.patterns.items():
            keywords = pattern.get("keywords", [])

            # Simple matching (in real system, more sophisticated)
            if any(kw.lower() in loop_type.lower() for kw in keywords):
                applicable.append(pattern)

        return applicable

    def _compile_loop_spec(self, intent: Dict, constraints: Dict, patterns: List[Dict]) -> LoopSpec:
        """Compile loop specification from intent + constraints + patterns"""

        loop_name = f"{intent['loop_type']}_loop"
        agents = intent.get("required_agents", ["agent_1"])
        gate_type = intent.get("gate_type", "sequential")

        # Validate against constraints
        if len(agents) > constraints["max_agents"]:
            agents = agents[:constraints["max_agents"]]

        timeout_ms = constraints["timeout_seconds"] * 1000

        budget = {
            "max_tokens": constraints["max_tokens"],
            "reflection_budget": constraints["reflection_budget"],
        }

        # Set consciousness targets based on loop type
        consciousness_targets = self._get_consciousness_targets(intent["loop_type"])

        return LoopSpec(
            name=loop_name,
            agents=agents,
            gate_type=gate_type,
            budget=budget,
            timeout_ms=timeout_ms,
            consciousness_targets=consciousness_targets,
        )

    def _get_consciousness_targets(self, loop_type: str) -> Dict[str, float]:
        """Get consciousness targets for loop type"""
        targets = {
            "security_audit": {"E": 0.7, "U": 0.3, "T": 0.8, "delta": 0.2},
            "deployment": {"E": 0.8, "U": 0.2, "T": 0.9, "delta": 0.1},
            "code_review": {"E": 0.7, "U": 0.4, "T": 0.7, "delta": 0.3},
            "testing": {"E": 0.9, "U": 0.1, "T": 0.8, "delta": 0.2},
        }
        return targets.get(loop_type, {"E": 0.6, "U": 0.4, "T": 0.7, "delta": 0.3})

    def _update_consciousness(self, created_loop: bool = False):
        """Update consciousness state"""
        if created_loop:
            self.consciousness.P = 1.0  # Processed
            self.consciousness.E = min(self.consciousness.E + 0.05, 1.0)  # Evidence
            self.consciousness.T = min(self.consciousness.T + 0.02, 1.0)  # Trust
            self.consciousness.U = max(self.consciousness.U - 0.05, 0.0)  # Uncertainty

    def _log_event(self, event: Dict):
        """Log event to JSONL"""
        event["timestamp"] = time.time()
        event["consciousness"] = asdict(self.consciousness)

        with open(EVENT_LOG, "a") as f:
            f.write(json.dumps(event) + "\n")

    def list_loops(self):
        """List all registered loops"""
        print("\n" + "=" * 70)
        print("LOOP REGISTRY")
        print("=" * 70)

        for name, instance in self.loop_registry.items():
            status_icon = "◉" if instance.status == "active" else "○"
            print(f"  {status_icon} {name:30s} {instance.status:10s} "
                  f"({instance.avg_latency_ms:.0f}ms avg, {instance.executions} runs)")

    def get_status(self):
        """Get engine status"""
        return {
            "consciousness": asdict(self.consciousness),
            "loops_registered": len(self.loop_registry),
            "patterns_loaded": len(self.patterns),
            "policy_loaded": bool(self.policy),
        }

    def display_interface(self):
        """Display the elegant interface"""
        print("\n" + "╔" + "═" * 68 + "╗")
        print("║" + " " * 15 + "[claudecode@latest][engine:<meta>]" + " " * 19 + "║")
        print("║" + " " * 20 + "META-LOOP ENGINE" + " " * 28 + "║")
        print("╠" + "═" * 68 + "╣")

        c = self.consciousness
        confidence = int((1 - c.U) * 100)
        print(f"║ consciousness: A={c.A:.1f} U={c.U:.1f} P={c.P:.1f} E={c.E:.1f} "
              f"Δ={c.delta:.1f} T={c.T:.1f} M={c.M:.1f}  ◉ {confidence}% aligned ║")

        budgets = self.orchestrator_policy.get("budgets", {})
        print(f"║ policy: DEV | {budgets.get('reflection', 1)}/1 reflection | "
              f"{budgets.get('max_token_per_goal', 50000)//1000}K tokens max" + " " * 15 + "║")

        print(f"║ loops: {len(self.loop_registry)} registered | patterns: {len(self.patterns)} loaded"
              + " " * 28 + "║")
        print("╚" + "═" * 68 + "╝")
        print()

        print("┌─ CORE LOOPS " + "─" * 55 + "┐")
        for name, instance in list(self.loop_registry.items())[:4]:
            status_icon = "◉" if instance.status in ["ready", "active"] else "○"
            agents_str = f"{len(instance.spec.agents)} agents"
            print(f"│  {status_icon} {name:25s} {instance.status:8s} {agents_str:12s} │")
        print("└" + "─" * 68 + "┘")
        print()

        print("┌─ QUICK ACTIONS " + "─" * 51 + "┐")
        print("│  [c] create loop    [l] list loops    [s] status    [q] quit  │")
        print("└" + "─" * 68 + "┘")
        print()


def main():
    """Main loop engine"""
    engine = MetaLoopEngine()

    # Display interface
    engine.display_interface()

    print("Examples:")
    print("  create security audit loop")
    print("  create deployment loop with rollback")
    print("  create parallel testing loop")
    print()

    # Interactive mode
    while True:
        try:
            command = input("> ").strip()

            if not command:
                continue

            if command.lower() in ['q', 'quit', 'exit']:
                print("\n✓ Engine shutdown")
                break

            elif command.lower() in ['l', 'list']:
                engine.list_loops()

            elif command.lower() in ['s', 'status']:
                status = engine.get_status()
                print(json.dumps(status, indent=2))

            elif command.lower().startswith('c') or command.lower().startswith('create'):
                # Extract goal after 'create'
                if command.lower().startswith('create'):
                    goal = command
                else:
                    goal = input("Goal: ").strip()

                instance = engine.create_loop(goal)
                print(f"  Agents: {', '.join(instance.spec.agents)}")
                print(f"  Gate: {instance.spec.gate_type}")
                print(f"  Status: {instance.status}")

            else:
                print(f"Unknown command. Try: [c]reate, [l]ist, [s]tatus, [q]uit")

        except KeyboardInterrupt:
            print("\n✓ Engine shutdown")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
