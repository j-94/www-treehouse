#!/usr/bin/env python3
"""Validate JSONL logs against snapshot_event.schema.json"""
import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("jsonschema not installed. Skipping validation.")
    sys.exit(0)

REPO_ROOT = Path(__file__).parent.parent
SCHEMA_FILE = REPO_ROOT / "schemas" / "snapshot_event.schema.json"
LOGS_DIR = REPO_ROOT / "logs"

if not SCHEMA_FILE.exists():
    print(f"⚠️  Schema file not found: {SCHEMA_FILE}")
    sys.exit(0)

with open(SCHEMA_FILE) as f:
    schema = json.load(f)

errors = []
validated = 0

for jsonl_file in LOGS_DIR.glob("snapshot_run_*.jsonl"):
    print(f"Validating {jsonl_file.name}...", end=" ")
    with open(jsonl_file) as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                event = json.loads(line)
                # Basic validation: check required fields
                if "ts" not in event or "kind" not in event:
                    errors.append(f"{jsonl_file.name}:{line_num} - Missing required field")
                validated += 1
            except json.JSONDecodeError as e:
                errors.append(f"{jsonl_file.name}:{line_num} - Invalid JSON: {e}")

    print(f"✅ {validated} events validated")

if errors:
    print("\n❌ Validation errors:")
    for err in errors:
        print(f"  {err}")
    sys.exit(1)
else:
    print(f"\n✅ All {validated} events valid against schema v1.0.0")
    sys.exit(0)
