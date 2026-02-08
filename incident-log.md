# Incident Log

## 2026-02-08 — Bot traffic on `/api/transcribe`

**Summary:** Unexpected spike in transcription requests hit the public `/api/transcribe` endpoint.

**Detection:**  
- Google Studio budget alert.  
- Vercel logs showed repeated `/api/transcribe` POSTs with `Python/3.11 aiohttp/3.13.3`.  
- Opik traces contained short‑wave audio / non‑human content.

**Indicators:**  
- IP: `124.122.xxx.xxx`  
- User‑Agent: `Python/3.11 aiohttp/3.13.3`  
- Route: `/api/transcribe`

**Impact:**  
- Unauthenticated requests drove Gemini usage and cost spikes.

**Mitigation:**  
- Added auth guard for `/api/transcribe`, `/api/generate-summary`, `/api/extract-tasks` in production.  
- Added guest rate limit (1 request per IP per day).  
- Added minimum audio size check to block tiny/bot audio.  
- Added request meta logging (IP/UA/origin/referer) for blocked attempts.

**Status:** Resolved after deploy. Monitoring Vercel logs for blocked attempts.
