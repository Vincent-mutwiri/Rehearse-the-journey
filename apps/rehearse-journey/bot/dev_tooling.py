"""SF.4 — Whisker (real-time pipeline frame debugger) & Tail (terminal session dashboard) integration."""

import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List

try:
    from loguru import logger
except ImportError:  # pragma: no cover - fallback when running outside bot/.venv
    import logging

    logger = logging.getLogger("rehearse_journey")


@dataclass
class FrameTraceEntry:
    timestamp: float
    direction: str
    frame_type: str
    summary: str


@dataclass
class DevTelemetrySession:
    session_id: str
    scenario_id: str = "hospital"
    level: int = 1
    mode: str = "practise"
    active_stack: str = "gemini_proxy"
    active_speaker: str = "joy"
    current_node: str = "greet"
    whisker_enabled: bool = False
    tail_enabled: bool = False
    frame_traces: List[FrameTraceEntry] = field(default_factory=list)

    def trace_frame(self, direction: str, frame_type: str, summary: str = "") -> None:
        if not (self.whisker_enabled or self.tail_enabled):
            return
        entry = FrameTraceEntry(
            timestamp=time.time(),
            direction=direction,
            frame_type=frame_type,
            summary=summary,
        )
        self.frame_traces.append(entry)
        if len(self.frame_traces) > 50:
            self.frame_traces.pop(0)
        if self.whisker_enabled:
            logger.debug(f"[Whisker] {direction} | {frame_type} | {summary}")

    def tail_snapshot(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "mode": self.mode,
            "scenario_id": self.scenario_id,
            "level": self.level,
            "active_stack": self.active_stack,
            "active_speaker": self.active_speaker,
            "current_node": self.current_node,
            "whisker_enabled": self.whisker_enabled,
            "tail_enabled": self.tail_enabled,
            "recent_frames": [
                {
                    "direction": f.direction,
                    "frame_type": f.frame_type,
                    "summary": f.summary,
                }
                for f in self.frame_traces[-8:]
            ],
        }


def create_dev_telemetry(session_id: str = "local-dev") -> DevTelemetrySession:
    whisker = os.getenv("ENABLE_WHISKER", "0").strip() == "1"
    tail = os.getenv("ENABLE_TAIL", "0").strip() == "1"
    if whisker or tail:
        logger.info(f"Dev tooling active: Whisker={whisker}, Tail={tail}")
    return DevTelemetrySession(
        session_id=session_id,
        whisker_enabled=whisker,
        tail_enabled=tail,
    )
