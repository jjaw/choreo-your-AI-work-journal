# Opik Trace Notes

## Current tracing setup
- Provider: `opik-gemini` (automatic Gemini tracing)
- Trace location: Opik project `choreo-hackathon` in workspace `jjaw`

## Traces captured
- `transcription`
  - tags: `choreo`, `transcribe`
  - metadata:
    - `route`: `transcribe`
    - `hasAudio`: true
    - `audioMimeType`
    - `audioSizeBytes`
- `summary_generation`
  - tags: `choreo`, `summary`
  - metadata:
    - `route`: `generate-summary`
    - `transcriptLength`
    - `hasAudio`
    - `audioMimeType`
    - `audioSizeBytes`
- `task_extraction`
  - tags: `choreo`, `tasks`
  - metadata:
    - `route`: `extract-tasks`
    - `transcriptLength`
