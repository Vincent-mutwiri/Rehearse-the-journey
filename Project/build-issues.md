# Build Issues — Rehearse the Journey (Problem Statement 6)

A log of build/setup issues found while standing up the Rehearse the Journey demo (Pipecat + React + toolkit). These are **not** toolkit issues — they're our app's keys, Pipecat's dependencies, Pipecat's client SDK, the hub network, and repo hygiene. Genuine toolkit issues (adapters, AbilityModel, Librarian, surfaces, server, extension) go in [`toolkit-issues.md`](./toolkit-issues.md); that file is empty until the toolkit adapters are wired (S3).

> Honest reporting: don't fabricate an issue to hit a count. If none are found, say so.

---

## Index

| ID | Date | Area | Title | Severity | Status |
|---|---|---|---|---|---|
| BLD-001 | 2026-11-07 | keys | OpenAI API key invalid (401) | blocker | blocked |
| BLD-002 | 2026-11-07 | keys | Gemini API key credits depleted (1011) | blocker | blocked |
| BLD-003 | 2026-11-06 | deps | `silero` extra pulls torch (~800MB), blocked `uv sync` | major | resolved |
| BLD-004 | 2026-11-06 | client | TypeScript: `params` not in `PipecatClientOptions` (v1.11 API) | major | resolved |
| BLD-005 | 2026-11-06 | network | `uv sync` slow on hub network (~22 KB/s to PyPI CDN) | major | resolved |
| BLD-006 | 2026-11-06 | repo | `memory/2026-11-06.md` tracked despite `.gitignore` | minor | resolved |

---

## Entries

### BLD-001 — OpenAI API key invalid (401)

- **ID:** BLD-001
- **Date:** 2026-11-07
- **Found by:** Vin (running the bot)
- **Area:** keys
- **What happened:** With `USE_GEMINI_LIVE=0`, the bot boots and the pipeline links, but the first `OpenAILLMService` call 401s. The hub-provided `OPENAI_API_KEY` (`sk-43b40…aaba`, 35 chars) is rejected by the OpenAI API: `Error code: 401 - Incorrect API key provided`.
- **Expected:** The hub key is valid; OpenAI STT + GPT-4o + TTS runs the Level 1 role-play.
- **Actual:** 401 on every completion; the pipeline dies (`OpenAILLMService#0 can no longer do its job`).
- **Severity:** blocker
- **Status:** blocked
- **Upstream:** —
- **Notes:** Switched to the Gemini path (`USE_GEMINI_LIVE=1`) to work around this. The hub team needs to provide a valid OpenAI key, or we need a different fallback. Not a toolkit issue — our app's key, not the toolkit's.

### BLD-002 — Gemini API key credits depleted (1011)

- **ID:** BLD-002
- **Date:** 2026-11-07
- **Found by:** Vin (running the bot)
- **Area:** keys
- **What happened:** With `USE_GEMINI_LIVE=1` and `GOOGLE_API_KEY` set (39 chars), the bot boots, the WebRTC connection establishes, Joy's system prompt composes correctly, and `GeminiLiveLLMService#0` connects — then the Gemini API returns `1011 None. Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing`.
- **Expected:** Gemini Live speech-to-speech runs the Level 1 role-play.
- **Actual:** 1011 on the first turn; the session disconnects.
- **Severity:** blocker
- **Status:** blocked
- **Upstream:** —
- **Notes:** The mechanics all work — the only failure is the provider's billing. Fix: add billing to the AI Studio project, or use a fresh key with free-tier credits. Combined with BLD-001, **both AI paths are blocked** — this is the S0/S1 gate blocker. Not a toolkit issue — our AI Studio billing, not the toolkit's.

### BLD-003 — `silero` extra pulls torch (~800MB), blocked `uv sync`

- **ID:** BLD-003
- **Date:** 2026-11-06
- **Found by:** Megamind (running `uv sync`)
- **Area:** deps
- **What happened:** `pyproject.toml` declared `pipecat-ai[openai,silero,webrtc,runner]`. The `silero` extra pulls `torch` (~800MB). On the hub network (see BLD-005) the torch download timed out repeatedly; `uv sync` never completed after 51+ minutes across multiple attempts.
- **Expected:** `uv sync` installs within a reasonable time.
- **Actual:** Timed out on torch every attempt; the `.venv` stayed at 2 packages.
- **Severity:** major
- **Status:** resolved
- **Upstream:** —
- **Notes:** Dropped `silero` from `pyproject.toml` extras (`pipecat-ai[openai,webrtc,runner]`). OpenAI STT does its own endpointing, so server-side VAD is optional for the demo. Re-add `silero` post-hackathon if server-side VAD is needed. Lock re-resolved to 127 packages. Not a toolkit issue — Pipecat's dependency.

### BLD-004 — TypeScript: `params` not in `PipecatClientOptions` (v1.11 API)

- **ID:** BLD-004
- **Date:** 2026-11-06
- **Found by:** Megamind (running `tsc --noEmit`)
- **Area:** client
- **What happened:** The scaffolded `App.tsx` constructed `new PipecatClient({ transport, enableMic, enableCam, params: { baseUrl: '/api', endpoints: { connect: '/connect' } } })`. `tsc --noEmit` errored: `Object literal may only specify known properties, and 'params' does not exist in type 'PipecatClientOptions'`. The `params` field was valid in an older client-js API but not in `@pipecat-ai/client-js` 1.16.0.
- **Expected:** The client compiles and connects to the bot's SmallWebRTC endpoint.
- **Actual:** TypeScript compile error; no connection config reached the transport.
- **Severity:** major
- **Status:** resolved
- **Upstream:** —
- **Notes:** Verified the actual `PipecatClientOptions` interface in `node_modules/@pipecat-ai/client-js/dist/index.d.ts` (line 1424) and the Pipecat runner source: the SmallWebRTC SDP exchange is `POST /api/offer` (not `/connect`). Fixed: `webrtcRequestParams: { endpoint: '/api/offer' }` on the `SmallWebRTCTransport` constructor; removed `params` from `PipecatClient`. Vite proxy already routes `/api` → `localhost:7860`. `tsc --noEmit` and `vite build` now pass clean. Not a toolkit issue — Pipecat's client SDK.

### BLD-005 — `uv sync` slow on hub network (~22 KB/s to PyPI CDN)

- **ID:** BLD-005
- **Date:** 2026-11-06
- **Found by:** Megamind (running `uv sync`)
- **Area:** network
- **What happened:** `uv sync` downloads from `files.pythonhosted.org` (PyPI's CDN) ran at ~22 KB/s on the hub Wi-Fi. The 4 large wheels (opencv-python-headless 59MB, llvmlite 57MB, av 33MB, onnxruntime 22MB) each needed ~25–45 min at that speed. uv's default `UV_HTTP_TIMEOUT=30s` couldn't finish a single 57MB file; even `UV_HTTP_TIMEOUT=900` (15 min) wasn't enough. General internet (google.com, pypi.org) was fast — only the PyPI CDN was slow.
- **Expected:** `uv sync` completes within a few minutes.
- **Actual:** 51 min total for 17 packages, with multiple timeout failures before the 2h-per-download timeout (`UV_HTTP_TIMEOUT=7200`) finally let it grind through.
- **Severity:** major
- **Status:** resolved
- **Upstream:** —
- **Notes:** Root cause is the hub network's throughput to PyPI's CDN, not uv or Pipecat. Mitigation for future: set `UV_HTTP_TIMEOUT=7200` upfront on slow networks, or pre-download wheels on a faster connection. Not a toolkit issue — the hub's network.

### BLD-006 — `memory/2026-11-06.md` tracked despite `.gitignore`

- **ID:** BLD-006
- **Date:** 2026-11-06
- **Found by:** Vin
- **Area:** repo
- **What happened:** `memory/` is listed in `.gitignore`, but `memory/2026-11-06.md` was already committed (in `b613638`) before the ignore rule was added. `.gitignore` only stops untracked files from being added — it doesn't untrack already-tracked files. Edits to the file showed up as modifications in `git status` despite the ignore rule.
- **Expected:** The file is ignored and untracked.
- **Actual:** The file stayed tracked; edits showed as modifications.
- **Severity:** minor
- **Status:** resolved
- **Upstream:** —
- **Notes:** `git rm --cached memory/2026-11-06.md` untracked it (keeps the file on disk). Committed alongside the `.gitignore` edit. The file still exists in git history (`b613638`) — fine for a hackathon repo; a `git filter-repo` purge isn't worth it. Not a toolkit issue — repo hygiene.