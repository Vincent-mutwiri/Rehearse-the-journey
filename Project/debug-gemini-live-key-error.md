# Debug Guide — `GeminiLiveLLMService#0 ... 1007 API key not valid`

**Last updated:** Sat Nov 7, 2026 · **For:** teammates running the Rehearse the Journey bot on their own machine

This guide diagnoses the error:

```
GeminiLiveLLMService#0::_connection_task_handler unexpected exception
(...google/genai/errors.py:220): 1007 None. API key not valid. Please pass a valid API key.
```

---

## TL;DR — the fix

You're missing `GEMINI_PROXY_BASE_URL` in your `.env`. The Lovable proxy carries REST but not the Gemini Live WebSocket, so the bot must use the REST text LLM + Gemini TTS path (not Live). Add this to `apps/rehearse-journey/bot/.env`:

```
GEMINI_PROXY_BASE_URL=https://ai4a11y.lovable.app/api/public/gemini
```

Restart the bot. You should see `Routing Gemini through proxy: https://ai4a11y.lovable.app/api/public/gemini` in the startup logs.

---

## What the error means

`GeminiLiveLLMService` is the **speech-to-speech** path — it opens a WebSocket to Gemini's `bidiGenerateContent` endpoint. The `1007` WebSocket close code means the key was rejected at the WebSocket handshake.

The Lovable team proxy (`https://ai4a11y.lovable.app/api/public/gemini`) carries **REST** (`generateContent`) but **not the Live WebSocket**. We confirmed this: a REST `generateContent` call through the proxy returns `200 OK` ("Connection OK"), but the WebSocket upgrade to `bidiGenerateContent` returns `404 Not Found`.

So: **if the bot tries `GeminiLiveLLMService`, it 401s because Live isn't reachable through the proxy.**

## How the bot decides which path to use

`bot.py` has a `check_keys()` function:

```python
if os.getenv("USE_GEMINI_LIVE", "0").strip() == "1":
    key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError("Set GOOGLE_API_KEY or GEMINI_API_KEY for Gemini Live.")
    # The Lovable proxy carries REST but not Live. When a proxy base URL is
    # set, use the REST text LLM + Gemini TTS path, not Live.
    if os.getenv("GEMINI_PROXY_BASE_URL"):
        return "gemini_text", key   # REST — works through the proxy
    return "gemini", key            # Live WebSocket — 401s through the proxy
```

The decision is:
- `USE_GEMINI_LIVE=1` **+** `GEMINI_PROXY_BASE_URL` set → `gemini_text` (REST, works) → uses `GoogleLLMService` + `GeminiTTSService`
- `USE_GEMINI_LIVE=1` **+** `GEMINI_PROXY_BASE_URL` **NOT set** → `gemini` (Live WebSocket, 401s)

**If you see `GeminiLiveLLMService#0` in the error, you're on the `gemini` branch — which means `GEMINI_PROXY_BASE_URL` is not set.**

## Step-by-step fix

### 1. Check your `.env`

Open `apps/rehearse-journey/bot/.env`. It should contain **all three** of these lines:

```
GOOGLE_API_KEY=<your Lovable proxy key>
USE_GEMINI_LIVE=1
GEMINI_PROXY_BASE_URL=https://ai4a11y.lovable.app/api/public/gemini
```

If `GEMINI_PROXY_BASE_URL` is missing or empty, add it. The exact value is:

```
GEMINI_PROXY_BASE_URL=https://ai4a11y.lovable.app/api/public/gemini
```

### 2. Confirm you pulled the latest code

The `gemini_text` branch (the REST path) was added in the proxy wiring commit. If you're on an older `bot.py`, it doesn't have the `GEMINI_PROXY_BASE_URL` logic at all — it always tries `GeminiLiveLLMService`.

```bash
git pull origin main
```

Then check the error message after restarting:
- If it says **`GeminiLiveLLMService#0`** → you're on the old code (didn't pull) or `GEMINI_PROXY_BASE_URL` is missing.
- If it says **`GoogleLLMService#0`** → you're on the new code; the error is different (see below).

### 3. Restart the bot

```bash
cd apps/rehearse-journey/bot
uv run bot.py
```

### 4. Confirm the proxy path is active

In the startup logs, you should see:

```
🔑  Key check OK — Gemini Live path selected.
Routing Gemini through proxy: https://ai4a11y.lovable.app/api/public/gemini
INFO:     Uvicorn running on http://localhost:7860
```

The **`Routing Gemini through proxy`** line is the confirmation. If you don't see it, `GEMINI_PROXY_BASE_URL` isn't being read — check for typos, a missing `=` or extra whitespace in the env line, or a `#` comment that commented out the line.

### 5. Test the connection

Open `http://localhost:3000` in Chrome (not Firefox — Firefox doesn't support `SpeechRecognition`, which the browser STT path needs). Click **Start Rehearsal**. You should:
- See Joy's mascot
- Hear Joy's greeting (Gemini TTS through the proxy)
- Be able to type a reply and hear Joy respond

---

## How the working path is wired

When `GEMINI_PROXY_BASE_URL` is set, the bot uses:

| Service | What it does | Endpoint |
|---|---|---|
| `GoogleLLMService` | Text LLM — generates Joy's replies | `generateContent` (REST, through the proxy) |
| `GeminiTTSService` | Text-to-speech — speaks Joy's replies | `generateContent` (REST, through the proxy) |
| Browser `SpeechRecognition` | Speech-to-text — transcribes the person's speech | In the React client, sends the transcript as RTVI `sendText` |

No `GeminiLiveLLMService` — no WebSocket. The person's speech is transcribed in the browser (Chrome's Web Speech API) and sent as text; Joy's reply is generated by the text LLM and spoken by the TTS. Both go through the proxy as REST.

---

## If you still see `GeminiLiveLLMService#0` after the fix

Three possibilities:

1. **You didn't restart the bot.** `load_dotenv()` reads the `.env` at startup. A running bot won't pick up a `.env` change. Stop it (Ctrl+C) and `uv run bot.py` again.

2. **You didn't pull the latest code.** The `gemini_text` branch was added in a recent commit. Run `git pull origin main` and check `git log --oneline -3` — you should see a commit mentioning "proxy wiring" or "gemini_text".

3. **Your `.env` isn't being read.** The `.env` must be at `apps/rehearse-journey/bot/.env` (same directory as `bot.py`). Check the file is there and the lines don't have leading/trailing whitespace or a BOM. On Windows, make sure the file is `.env` (not `.env.txt` with a hidden extension).

---

## If you see `GoogleLLMService#0 ... 404` (not `GeminiLiveLLMService`)

You're on the new code and the REST path is running, but the model name is wrong. The proxy serves `gemini-3.8-flash` and `gemini-4-argon`, not `gemini-2.5-flash`. Check:

```bash
grep GEMINI_TEXT_MODEL apps/rehearse-journey/bot/.env
```

If set, it should be `gemini-3.8-flash` (the fast one, for Joy's conversation turns) or `gemini-4-argon` (the reasoning one, slower). The default in `bot.py` is `gemini-3.8-flash`. If you're seeing `gemini-2.5-flash` in the error, either remove the `GEMINI_TEXT_MODEL` line (use the default) or set it to `gemini-3.8-flash`.

---

## If you see `GeminiTTSService#0 ... completed with no audio`

This is a transient — the first TTS chunk came back empty once and Pipecat retried it. It self-heals (the second attempt produces audio). If it happens on every turn, the TTS model name might be wrong — the proxy serves `gemini-3.8-flash-lite-tts`. The default in `bot.py` is `gemini-3.8-flash-lite-tts` with voice `Leda`. If you've set `GEMINI_TTS_MODEL` or `GEMINI_TTS_VOICE` in `.env`, check they're valid.

---

## Quick env reference (working config)

```
# apps/rehearse-journey/bot/.env — the working config
GOOGLE_API_KEY=<your Lovable proxy key>
USE_GEMINI_LIVE=1
GEMINI_PROXY_BASE_URL=https://ai4a11y.lovable.app/api/public/gemini
# GEMINI_PROXY_API_VERSION=v1beta   # optional — default is v1beta
# GEMINI_TEXT_MODEL=gemini-3.8-flash  # optional — default is gemini-3.8-flash
# GEMINI_TTS_MODEL=gemini-3.8-flash-lite-tts  # optional — default
# GEMINI_TTS_VOICE=Leda              # optional — default

LOG_LEVEL=DEBUG
```

`OPENAI_API_KEY` is not needed for this path — the proxy + browser STT handle everything. Leave it empty or remove it.

---

## Test the proxy key from the terminal

If you're unsure whether the key works, test it with `curl` (on macOS/Linux; on Windows use `curl.exe` in PowerShell):

```bash
curl --fail-with-body "https://ai4a11y.lovable.app/api/public/gemini/v1beta/models/gemini-3.8-flash:generateContent" \
  -H "x-goog-api-key: $GOOGLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with: Connection OK"}]}]}'
```

You should see `"text": "Connection OK"` in the response. If you see `401 Unauthorized`, the key is wrong. If you see `404 Not Found`, the model name is wrong. If you see `403 closed` or `429`, ask the hackathon organizers.

**The key needs to be in your shell env** for the `curl` test. If you only have it in `.env`, substitute it directly:

```bash
curl --fail-with-body "https://ai4a11y.lovable.app/api/public/gemini/v1beta/models/gemini-3.8-flash:generateContent" \
  -H "x-goog-api-key: PASTE_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with: Connection OK"}]}]}'
```

---

## Still stuck?

Paste the **full startup log** (from `uv run bot.py` to the first error) and the contents of `apps/rehearse-journey/bot/.env` **with the key value redacted** (replace the key with `<key>`). The key tells in the log:
- `🔑 Key check OK — Gemini Live path selected.` → you're on the `gemini` or `gemini_text` branch
- `Routing Gemini through proxy: ...` → the proxy is active (correct)
- `GeminiLiveLLMService#0` → old code or missing `GEMINI_PROXY_BASE_URL`
- `GoogleLLMService#0` → new code, proxy active, REST path running

The working path shows `GoogleLLMService#0` + `GeminiTTSService#0`, not `GeminiLiveLLMService#0`.