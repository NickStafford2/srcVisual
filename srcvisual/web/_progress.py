from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from queue import Queue
from threading import Lock
from typing import Iterator, Literal

ProgressEventType = Literal["connected", "progress", "complete", "error"]
CHANNEL_TTL_SECONDS = 600.0


@dataclass
class ProgressChannel:
    queue: Queue["ProgressEvent"] = field(default_factory=Queue)
    created_at: float = field(default_factory=time.monotonic)
    last_event_at: float = field(default_factory=time.monotonic)
    expires_at: float = field(default_factory=lambda: time.monotonic() + CHANNEL_TTL_SECONDS)


@dataclass(frozen=True)
class ProgressEvent:
    type: ProgressEventType
    message: str
    elapsed_ms: int
    delta_ms: int


class ProgressBroker:
    def __init__(self) -> None:
        self._channels: dict[str, ProgressChannel] = {}
        self._lock = Lock()

    def stream(self, token: str) -> Iterator[str]:
        channel = self._get_or_create_channel(token)
        yield format_sse_event(
            ProgressEvent(
                type="connected",
                message="Connected.",
                elapsed_ms=0,
                delta_ms=0,
            )
        )

        try:
            while True:
                event = channel.queue.get()
                yield format_sse_event(event)

                if event.type in {"complete", "error"}:
                    break
        finally:
            self._remove_channel(token, channel)

    def publish_progress(self, token: str, message: str) -> None:
        self._publish(token, self._build_event(token, "progress", message))

    def publish_complete(self, token: str, message: str) -> None:
        self._publish(token, self._build_event(token, "complete", message))

    def publish_error(self, token: str, message: str) -> None:
        self._publish(token, self._build_event(token, "error", message))

    def _publish(self, token: str, event: ProgressEvent) -> None:
        channel = self._get_or_create_channel(token)
        channel.queue.put(event)
        self._refresh_channel(channel)

    def _build_event(
        self,
        token: str,
        event_type: ProgressEventType,
        message: str,
    ) -> ProgressEvent:
        channel = self._get_or_create_channel(token)
        now = time.monotonic()
        elapsed_ms = int(round((now - channel.created_at) * 1000))
        delta_ms = int(round((now - channel.last_event_at) * 1000))
        channel.last_event_at = now

        return ProgressEvent(
            type=event_type,
            message=message,
            elapsed_ms=max(0, elapsed_ms),
            delta_ms=max(0, delta_ms),
        )

    def _get_or_create_channel(self, token: str) -> ProgressChannel:
        with self._lock:
            self._prune_expired_channels_locked()
            channel = self._channels.get(token)

            if channel is None:
                channel = ProgressChannel()
                self._channels[token] = channel

            self._refresh_channel(channel)
            return channel

    def _refresh_channel(self, channel: ProgressChannel) -> None:
        channel.expires_at = time.monotonic() + CHANNEL_TTL_SECONDS

    def _remove_channel(self, token: str, channel: ProgressChannel) -> None:
        with self._lock:
            current = self._channels.get(token)
            if current is channel:
                self._channels.pop(token, None)

    def _prune_expired_channels_locked(self) -> None:
        now = time.monotonic()
        expired_tokens = [
            token
            for token, channel in self._channels.items()
            if channel.expires_at <= now
        ]

        for token in expired_tokens:
            self._channels.pop(token, None)


def format_sse_event(event: ProgressEvent) -> str:
    payload = json.dumps(
        {
            "type": event.type,
            "message": event.message,
            "elapsed_ms": event.elapsed_ms,
            "delta_ms": event.delta_ms,
        },
        separators=(",", ":"),
    )
    return f"data: {payload}\n\n"


progress_broker = ProgressBroker()
