#!/usr/bin/env python3
"""
SSE Server for Graphlogue v0.3.0-alpha Streaming Extension
Compliant with JSONL v1 Schema (RFC 3339, discriminator routing, structured events)
Real-time event streaming with bidirectional feedback channel
"""
import asyncio
import json
import logging
import signal
import sys
from datetime import datetime, timezone
from typing import Dict, Set, Optional, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Graphlogue SSE Server v0.3.0-alpha",
    description="Real-time event streaming with bidirectional feedback (JSONL v1 compliant)",
    version="0.3.0-alpha"
)

# In-memory storage for events and subscriptions
class ReasoningEventStore:
    """Manages events and client subscriptions per run (JSONL v1 compliant)"""

    def __init__(self):
        self.events: Dict[str, list] = {}        # run_id → [events]
        self.subscribers: Dict[str, Set[asyncio.Queue]] = {}  # run_id → {queues}
        self.feedback: Dict[str, list] = {}      # run_id → [feedback]
        self.seq_counters: Dict[str, int] = {}   # run_id → next_seq
        self.lock = asyncio.Lock()

    async def emit_event(self, run_id: str, event: Dict[str, Any]) -> None:
        """Emit event to all subscribers (JSONL v1 format)"""
        async with self.lock:
            if run_id not in self.events:
                self.events[run_id] = []
                self.seq_counters[run_id] = 0

            # Ensure event has required fields (ts, kind, run_id, seq)
            if "seq" not in event:
                event["seq"] = self.seq_counters[run_id]
                self.seq_counters[run_id] += 1
            if "ts" not in event:
                event["ts"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            if "run_id" not in event:
                event["run_id"] = run_id

            self.events[run_id].append(event)
            logger.info(f"Event {event['kind']} seq={event['seq']} for run {run_id}")

            if run_id in self.subscribers:
                for queue in self.subscribers[run_id]:
                    try:
                        queue.put_nowait(event)
                    except asyncio.QueueFull:
                        logger.warning(f"Queue full for subscriber in run {run_id}")

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        """Subscribe to event stream for a run"""
        async with self.lock:
            if run_id not in self.subscribers:
                self.subscribers[run_id] = set()
                self.seq_counters[run_id] = 0

            queue: asyncio.Queue = asyncio.Queue(maxsize=100)
            self.subscribers[run_id].add(queue)

            # Replay historical events
            if run_id in self.events:
                for event in self.events[run_id]:
                    try:
                        queue.put_nowait(event)
                    except asyncio.QueueFull:
                        break

            logger.info(f"Client subscribed to run {run_id}")
            return queue

    async def unsubscribe(self, run_id: str, queue: asyncio.Queue) -> None:
        """Unsubscribe from event stream"""
        async with self.lock:
            if run_id in self.subscribers:
                self.subscribers[run_id].discard(queue)
                logger.info(f"Client unsubscribed from run {run_id}")

    async def add_feedback(self, run_id: str, feedback: Dict[str, Any]) -> None:
        """Store user feedback and emit as feedback.received event"""
        async with self.lock:
            if run_id not in self.feedback:
                self.feedback[run_id] = []
            self.feedback[run_id].append(feedback)

            # Emit feedback.received event (not in current schema, but extensible)
            feedback_event = {
                "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "kind": "feedback.received",
                "run_id": run_id,
                "seq": self.seq_counters.get(run_id, 0),
                "gate_id": feedback.get("gate_id"),
                "selected": feedback.get("selected"),
                "content": feedback.get("content")
            }
            await self.emit_event(run_id, feedback_event)


store = ReasoningEventStore()


def make_event(run_id: str, kind: str, data: Dict[str, Any], seq: Optional[int] = None) -> Dict[str, Any]:
    """Create a JSONL v1 compliant structured event"""
    event = {
        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "kind": kind,
        "run_id": run_id,
        **data
    }
    # seq will be assigned by store on emit if not provided
    if seq is not None:
        event["seq"] = seq
    return event


@app.get("/reasoning/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "version": "0.3.0-alpha"}


@app.get("/reasoning/stream")
async def stream_events(run_id: str = Query(..., description="Run ID")):
    """SSE endpoint for reasoning events"""
    logger.info(f"Client connected to stream: {run_id}")

    queue = await store.subscribe(run_id)

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
                    continue

                yield f"data: {json.dumps(event)}\n\n"

        except asyncio.CancelledError:
            logger.info(f"Stream cancelled for {run_id}")
        finally:
            await store.unsubscribe(run_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/reasoning/feedback")
async def submit_feedback(request: Request):
    """Bidirectional feedback endpoint"""
    try:
        data = await request.json()
        run_id = data.get("run_id")
        feedback_text = data.get("feedback")

        if not run_id or not feedback_text:
            raise HTTPException(status_code=400, detail="run_id and feedback required")

        await store.add_feedback(run_id, {
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "feedback": feedback_text,
        })

        return {"status": "received", "run_id": run_id}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")


@app.post("/reasoning/emit")
async def emit_test_event(request: Request):
    """Internal endpoint for testing event emission"""
    data = await request.json()
    run_id = data.get("run_id")
    kind = data.get("kind", "test.event")
    seq = data.get("seq", 0)
    payload = data.get("payload", {})

    if not run_id:
        raise HTTPException(status_code=400, detail="run_id required")

    event = make_event(run_id, kind, payload, seq)
    await store.emit_event(run_id, event)

    return {"status": "emitted", "event": event}


def signal_handler(sig, frame):
    logger.info("Shutdown signal received")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("Starting Graphlogue SSE Server v0.3.0-alpha")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
