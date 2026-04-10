"""Unit tests for analyzer global job concurrency limits."""
import asyncio
import os
from unittest.mock import patch

import pytest


@pytest.mark.unit
def test_heavy_job_respects_max_concurrent():
    from src.utils import job_limits

    job_limits.reset_job_limits_for_testing()
    active = 0
    max_active = 0

    async def work():
        nonlocal active, max_active

        async def _inner():
            nonlocal active, max_active
            active += 1
            max_active = max(max_active, active)
            await asyncio.sleep(0.04)
            active -= 1

        await job_limits.run_heavy_job('x', _inner())

    async def main_two():
        await asyncio.gather(work(), work())

    with patch.dict(os.environ, {'ANALYZER_MAX_CONCURRENT_HEAVY_JOBS': '1'}):
        asyncio.run(main_two())

    assert max_active == 1

    job_limits.reset_job_limits_for_testing()
    max_active = 0
    active = 0

    async def main_three():
        await asyncio.gather(work(), work(), work())

    with patch.dict(os.environ, {'ANALYZER_MAX_CONCURRENT_HEAVY_JOBS': '2'}):
        asyncio.run(main_three())

    assert max_active == 2


@pytest.mark.unit
def test_transcription_jobs_respect_max_concurrent():
    from src.utils import job_limits

    job_limits.reset_job_limits_for_testing()
    active = 0
    max_active = 0

    async def fake_run(tag: str):
        nonlocal active, max_active
        active += 1
        max_active = max(max_active, active)
        await asyncio.sleep(0.04)
        active -= 1
        return tag

    async def main_tr():
        await asyncio.gather(
            job_limits.run_transcription_job('t1', fake_run('a')),
            job_limits.run_transcription_job('t2', fake_run('b')),
        )

    with patch.dict(os.environ, {'ANALYZER_MAX_CONCURRENT_TRANSCRIPTIONS': '1'}):
        asyncio.run(main_tr())

    assert max_active == 1
