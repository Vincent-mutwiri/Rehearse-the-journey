"""SC.1–SC.3 — Vendor-agnostic STT/LLM/TTS provider layer + runtime fallback chain.

Supports:
1. GeminiLiveStack (speech-to-speech WebSocket)
2. DeepgramOpenAICartesiaStack (vendor-neutral low-latency STT -> LLM -> TTS)
3. GeminiProxyStack (Gemini REST LLM + Gemini TTS via proxy + browser STT)
4. OpenAIStack (OpenAI Whisper STT + GPT-4o LLM + OpenAI TTS)
5. TextOnlyStack (graceful fallback when audio: off or no voice keys are valid)
"""

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class ProviderSelection:
    stack_id: str
    display_name: str
    reason: str
    audio_enabled: bool
    uses_browser_stt: bool
    api_key: Optional[str] = None
    proxy_base_url: Optional[str] = None


FALLBACK_ORDER: List[str] = [
    "gemini_live",
    "deepgram_openai_cartesia",
    "gemini_proxy",
    "openai",
    "text_only",
]


class ProviderRegistry:
    """SC.1 & SC.2: Inspects environment & AbilityModel preferences to pick a stack."""

    @staticmethod
    def available_stacks(env: Optional[Dict[str, str]] = None) -> List[str]:
        e = env if env is not None else dict(os.environ)
        stacks: List[str] = []
        google_key = (e.get("GOOGLE_API_KEY") or e.get("GEMINI_API_KEY") or "").strip()
        proxy_url = (e.get("GEMINI_PROXY_BASE_URL") or "").strip()
        openai_key = (e.get("OPENAI_API_KEY") or "").strip()
        deepgram_key = (e.get("DEEPGRAM_API_KEY") or "").strip()
        cartesia_key = (e.get("CARTESIA_API_KEY") or "").strip()

        if google_key and not proxy_url and e.get("USE_GEMINI_LIVE", "1").strip() == "1":
            stacks.append("gemini_live")
        if deepgram_key and openai_key and cartesia_key:
            stacks.append("deepgram_openai_cartesia")
        if google_key and proxy_url:
            stacks.append("gemini_proxy")
        elif google_key and "gemini_live" not in stacks:
            stacks.append("gemini_live")
        if openai_key:
            stacks.append("openai")
        stacks.append("text_only")
        return stacks

    @classmethod
    def from_profile(
        cls,
        audio_preference: bool = True,
        env: Optional[Dict[str, str]] = None,
    ) -> ProviderSelection:
        e = env if env is not None else dict(os.environ)
        if not audio_preference:
            return ProviderSelection(
                stack_id="text_only",
                display_name="Text-only LLM (audio off by preference)",
                reason="audio: off in AbilityModel profile → typed path only",
                audio_enabled=False,
                uses_browser_stt=False,
                api_key=(e.get("GOOGLE_API_KEY") or e.get("GEMINI_API_KEY") or e.get("OPENAI_API_KEY")),
                proxy_base_url=e.get("GEMINI_PROXY_BASE_URL"),
            )

        stacks = cls.available_stacks(e)
        chosen = stacks[0] if stacks else "text_only"
        return cls._describe(chosen, e)

    @classmethod
    def _describe(cls, stack_id: str, e: Dict[str, str]) -> ProviderSelection:
        google_key = (e.get("GOOGLE_API_KEY") or e.get("GEMINI_API_KEY") or "").strip()
        openai_key = (e.get("OPENAI_API_KEY") or "").strip()
        proxy_url = (e.get("GEMINI_PROXY_BASE_URL") or "").strip() or None

        if stack_id == "gemini_live":
            return ProviderSelection(
                stack_id="gemini_live",
                display_name="Gemini Live (Speech-to-Speech)",
                reason="audio on, Gemini Live key available → speech-to-speech",
                audio_enabled=True,
                uses_browser_stt=False,
                api_key=google_key,
            )
        if stack_id == "deepgram_openai_cartesia":
            return ProviderSelection(
                stack_id="deepgram_openai_cartesia",
                display_name="Deepgram STT + OpenAI LLM + Cartesia TTS",
                reason="audio on, vendor-neutral low-latency pipeline available",
                audio_enabled=True,
                uses_browser_stt=False,
                api_key=openai_key,
            )
        if stack_id == "gemini_proxy":
            return ProviderSelection(
                stack_id="gemini_proxy",
                display_name="Gemini REST + Gemini TTS (Browser STT)",
                reason="audio on, Gemini proxy configured → REST LLM + Gemini TTS + browser STT",
                audio_enabled=True,
                uses_browser_stt=True,
                api_key=google_key,
                proxy_base_url=proxy_url,
            )
        if stack_id == "openai":
            return ProviderSelection(
                stack_id="openai",
                display_name="OpenAI Stack (Whisper STT + GPT-4o + TTS-1)",
                reason="audio on, OpenAI key available → Whisper + GPT-4o + TTS",
                audio_enabled=True,
                uses_browser_stt=False,
                api_key=openai_key,
            )
        return ProviderSelection(
            stack_id="text_only",
            display_name="Text-only Fallback Mode",
            reason="no valid voice provider keys → safe text-only rehearsal mode",
            audio_enabled=False,
            uses_browser_stt=False,
        )


class FallbackChainCoordinator:
    """SC.3: Switches to the next available provider stack on mid-session 401/503/1011 errors."""

    def __init__(self, audio_preference: bool = True, env: Optional[Dict[str, str]] = None):
        self.env = env if env is not None else dict(os.environ)
        self.audio_preference = audio_preference
        self.failed_stacks: List[str] = []
        self.current: ProviderSelection = ProviderRegistry.from_profile(audio_preference, self.env)

    def handle_provider_error(self, error_code_or_msg: str) -> Tuple[ProviderSelection, Dict[str, Any]]:
        previous = self.current
        if previous.stack_id not in self.failed_stacks and previous.stack_id != "text_only":
            self.failed_stacks.append(previous.stack_id)

        candidates = [
            s for s in ProviderRegistry.available_stacks(self.env)
            if s not in self.failed_stacks
        ]
        next_stack_id = candidates[0] if candidates else "text_only"
        self.current = ProviderRegistry._describe(next_stack_id, self.env)

        notice = {
            "type": "provider_switched",
            "from_stack": previous.stack_id,
            "to_stack": self.current.stack_id,
            "display_name": self.current.display_name,
            "reason": f"Switched from {previous.display_name} to {self.current.display_name} ({error_code_or_msg}).",
        }
        return self.current, notice
