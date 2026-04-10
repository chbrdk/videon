# Video upload → automatic analysis pipeline

Central URLs (do not hardcode in app code; use env):

| Purpose | Value |
|--------|--------|
| Analyzer HTTP base | `ANALYZER_SERVICE_URL` (backend) |
| Backend base (from analyzer) | `BACKEND_URL` |
| Service auth (optional) | `INTERNAL_SERVICE_TOKEN` on backend, `BACKEND_INTERNAL_TOKEN` on analyzer (same value) |

## Analyzer concurrency (CPU protection)

Inside the **single** analyzer process, heavy work is gated by semaphores:

| Variable | Default | Effect |
|----------|---------|--------|
| `ANALYZER_MAX_CONCURRENT_HEAVY_JOBS` | `2` | Max parallel **scene pipelines** (`/analyze`), **full-video Demucs** (`/separate-audio`), **Spleeter**, **saliency** |
| `ANALYZER_MAX_CONCURRENT_TRANSCRIPTIONS` | `1` | Max parallel **Whisper** runs (pipeline + `POST /api/transcribe/:id`) |

This does **not** cap concurrent uploads at the HTTP layer across multiple analyzer replicas—each replica has its own limits. For hard caps on the host, set **CPU/memory limits** on the analyzer container in Coolify/Docker.

## Flow

1. **Upload** (`POST /api/videos` or chunked): backend creates the video row, responds immediately, then `VideosController.triggerBackgroundProcesses` runs (delayed).
2. **Parallel jobs** (all fire-and-forget from the backend):
   - Optional STORION upload when `config.storage.type === 'storion'`.
   - `AnalyzerClient.analyzeVideo` → `POST {ANALYZER}/analyze` (scene detection, keyframes, per-scene Swift vision if configured).
   - `AnalyzerClient.separateAudioForVideo` → `POST {ANALYZER}/separate-audio`.
   - `SaliencyClient.analyzeSaliency` → `POST {ANALYZER}/saliency/analyze`.
3. **Inside analyzer** (`process_video_analysis` after scenes):
   - **Transcription** (Whisper) once per video if no transcription row exists yet.
   - **Semantic scene descriptions** via backend `POST /api/videos/:id/qwenVL/analyze` (OpenAI or Qwen depending on env).
   - **Search index** via `POST /api/search/videos/:id/index` (fixed path; previously a wrong `/api/videos/:id/index` was a no-op).

401 on those calls means the backend requires a session; set `INTERNAL_SERVICE_TOKEN` / `BACKEND_INTERNAL_TOKEN` to the same secret so the analyzer can send `x-internal-service`.

## Notes

- Scene + Swift vision and audio separation still run in parallel from the backend; only the **post-scene** steps (transcribe → Qwen → index) are ordered inside the analyzer.
- Re-upload / re-analysis should avoid duplicate transcriptions via `has_transcription` check.
