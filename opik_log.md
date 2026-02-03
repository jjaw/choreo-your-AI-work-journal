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

## Experiment Log (Synthetic Dataset)
**Dataset:** `dataset/eval_dataset.json` (30 samples, v1)  
**Model:** gemini-2.5-flash-lite  
**Goal:** Compare prompt variants for summary + task extraction

### Summary Experiment
- **v1_simple:** 93.3%
- **v2_structured:** 94.4% (winner)

### Task Experiment (F1)
- **v1_simple:** 70.5%
- **v2_structured:** 52.0%
- **v3_examples:** 78.1% (winner)

**Decision:** Use `v2_structured` for summaries and `v3_examples` for tasks in production prompts.
**Why v3 improved:** Few-shot examples + softer rules reduced over-filtering and improved task recall.

**Evidence files (for slides):**
- `dataset/experiment_results_combined_*.json`
- `dataset/experiment_results_combined_*.md`
