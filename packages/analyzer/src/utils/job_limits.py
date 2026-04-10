"""
Global concurrency limits for CPU-heavy analyzer work (single process / one event loop).

Tune via environment:
- ANALYZER_MAX_CONCURRENT_HEAVY_JOBS: max parallel scene pipelines, full-video audio stems, saliency (default 2)
- ANALYZER_MAX_CONCURRENT_TRANSCRIPTIONS: max parallel Whisper runs (default 1)
"""
from __future__ import annotations

import asyncio
import os
import threading
from typing import Awaitable, TypeVar

from .logger import logger

T = TypeVar("T")

_init_lock = threading.Lock()
_heavy_sem: asyncio.Semaphore | None = None
_transcription_sem: asyncio.Semaphore | None = None


def reset_job_limits_for_testing() -> None:
    """Clear semaphores so tests can patch env before first use."""
    global _heavy_sem, _transcription_sem
    with _init_lock:
        _heavy_sem = None
        _transcription_sem = None


def _int_env(name: str, default: int, minimum: int = 1) -> int:
    try:
        v = int(os.getenv(name, str(default)))
        return max(minimum, v)
    except ValueError:
        return default


def _get_heavy_sem() -> asyncio.Semaphore:
    global _heavy_sem
    with _init_lock:
        if _heavy_sem is None:
            n = _int_env("ANALYZER_MAX_CONCURRENT_HEAVY_JOBS", 2)
            _heavy_sem = asyncio.Semaphore(n)
            logger.info(f"Analyzer heavy-job concurrency limit: {n} (ANALYZER_MAX_CONCURRENT_HEAVY_JOBS)")
        return _heavy_sem


def _get_transcription_sem() -> asyncio.Semaphore:
    global _transcription_sem
    with _init_lock:
        if _transcription_sem is None:
            n = _int_env("ANALYZER_MAX_CONCURRENT_TRANSCRIPTIONS", 1)
            _transcription_sem = asyncio.Semaphore(n)
            logger.info(f"Analyzer transcription concurrency limit: {n} (ANALYZER_MAX_CONCURRENT_TRANSCRIPTIONS)")
        return _transcription_sem


async def run_heavy_job(job_name: str, coro: Awaitable[T]) -> T:
    """Run a coroutine while holding one heavy-job slot (scene pipeline, stems, saliency)."""
    sem = _get_heavy_sem()
    logger.info(f"Heavy job '{job_name}' waiting for slot")
    async with sem:
        logger.info(f"Heavy job '{job_name}' started")
        return await coro


async def run_transcription_job(job_name: str, coro: Awaitable[T]) -> T:
    """Run a coroutine while holding one transcription slot (Whisper)."""
    sem = _get_transcription_sem()
    logger.info(f"Transcription '{job_name}' waiting for slot")
    async with sem:
        logger.info(f"Transcription '{job_name}' started")
        return await coro
