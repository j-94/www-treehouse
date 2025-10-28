#!/usr/bin/env python3
"""
Demo Meta-Chat Loop Agent
Simulates reasoning process with decision gates and feedback
"""
import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
import httpx
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"
RUN_ID = None


async def emit_event(kind: str, seq: int, **data):
    """Emit event to SSE server"""
    global RUN_ID
    event = {
        "run_id": RUN_ID,
        "kind": kind,
        "seq": seq,
        "payload": data
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{BASE_URL}/reasoning/emit", json=event)
            logger.info(f"[{seq}] {kind}: {data}")
            return response.json()
        except Exception as e:
            logger.error(f"Failed to emit event: {e}")


async def reasoning_loop(run_id: str):
    """Simulate reasoning loop with decision gates"""
    global RUN_ID
    RUN_ID = run_id
    
    try:
        # Event 1: Run started
        await emit_event("run.start", 1, mode="meta-chat")
        await asyncio.sleep(1)
        
        # Event 2: Reasoning step
        await emit_event("reasoning.step", 2,
                        step="Analyzing problem space",
                        context="User asked about event streaming architecture",
                        confidence=0.85)
        await asyncio.sleep(1)
        
        # Event 3: Pattern detected
        await emit_event("pattern.detected", 3,
                        pattern_name="Publish-Subscribe",
                        description="Events should flow through message queue",
                        confidence=0.92)
        await asyncio.sleep(1)
        
        # Event 4: Decision gate - wait for feedback
        await emit_event("decision.gate", 4,
                        options=["approve", "revise", "reject"],
                        question="Should we use pub-sub pattern?",
                        timeout_seconds=30)
        
        # Simulate waiting for feedback (in real usage, this comes from user)
        logger.info("Waiting for user feedback...")
        await asyncio.sleep(5)
        
        # Event 5: Execution step
        await emit_event("execution.start", 5,
                        task="Implement SSE server",
                        estimated_duration_ms=3000)
        await asyncio.sleep(2)
        
        # Event 6: Execution result
        await emit_event("execution.complete", 6,
                        task="Implement SSE server",
                        status="success",
                        result={"lines_of_code": 156, "test_coverage": 0.85})
        await asyncio.sleep(1)
        
        # Event 7: Performance metrics
        await emit_event("metrics.recorded", 7,
                        throughput_events_per_sec=100,
                        latency_ms=50,
                        memory_mb=128)
        await asyncio.sleep(1)
        
        # Event 8: Run complete
        await emit_event("run.complete", 8,
                        status="success",
                        duration_ms=8000,
                        decisions_made=1,
                        patterns_applied=["Publish-Subscribe"])
        
        logger.info("✅ Reasoning loop completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Reasoning loop failed: {e}")
        await emit_event("run.error", 999, error=str(e))


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Meta-Chat Loop Demo Agent")
    parser.add_argument("--run-id", default=None, help="Run ID (auto-generated if not provided)")
    args = parser.parse_args()
    
    run_id = args.run_id or f"demo-{int(time.time())}"
    
    logger.info(f"Starting demo agent for run: {run_id}")
    logger.info(f"SSE Server: {BASE_URL}")
    
    # Give server time to start
    await asyncio.sleep(2)
    
    # Check if server is running
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/reasoning/health", timeout=5)
            logger.info(f"✅ Server health check passed: {response.json()}")
        except Exception as e:
            logger.error(f"❌ Server not reachable at {BASE_URL}: {e}")
            logger.error("Is SSE server running? Try: python scripts/sse_server.py")
            return
    
    # Run reasoning loop
    await reasoning_loop(run_id)


if __name__ == "__main__":
    asyncio.run(main())
