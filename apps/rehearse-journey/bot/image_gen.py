"""Gemini image generation for the Rehearse-the-Journey story cards.

The bot generates a warm, child-friendly scene illustration for a story node
via `gemini-3.1-flash-image` (through the Lovable proxy when
GEMINI_PROXY_BASE_URL is set), base64-encodes the JPEG, and returns a data URL
the client can render directly in a StoryCard slide.

The prompt is built from the story_id + a short scene description, and pinned
to the soft-mirror palette so the illustrations feel like one set. Keep the
prompts short and explicit about "no text labels" — image models love to render
text, and we want the map/labels to come from the SVG overlay or a real Maps
integration, not the illustration.

Cache: one generated image per story_id per process. The illustrations are
static across a session, so we memoize on story_id to avoid regenerating on
every node entry. Clear with clear_image_cache() on session end if needed.
"""

from __future__ import annotations

import base64
import os
from typing import Dict, Optional

try:
    from loguru import logger
except ImportError:  # pragma: no cover - fallback outside bot/.venv
    import logging

    logger = logging.getLogger("rehearse_journey.image_gen")

# ── Prompt palette ──────────────────────────────────────────────────────────
# One tone across all story illustrations so they read as one set. The
# palette is the soft-mirror system (lavender/peach/sage on cream), and the
# style is warm, rounded, child-friendly — not photoreal, not clinical.

_STYLE = (
    "Warm, soft, child-friendly illustration in a rounded storybook style. "
    "Palette: lavender (#a89bd4), peach (#f4c6a6), sage (#8fb39b), cream "
    "(#fbf7f2), soft ink (#3a3550). Gentle shading, no harsh outlines, "
    "no text, no labels, no words, no letters, no signage. "
    "Calm, welcoming, supportive mood — not clinical, not scary."
)

# Per-story scene descriptions. Keep these short and visual; the style prompt
# above does the heavy lifting. If a story_id isn't here, we fall back to a
# generic "hospital waiting area" scene so the card never renders empty.
_SCENES: Dict[str, str] = {
    "hospital-waiting-area": (
        "A hospital waiting area: a reception desk on the right, a corridor "
        "leading left to a seating area with a few soft chairs, and a sign "
        "pointing the way. A small calm plant in the corner."
    ),
    "hospital-room-4": (
        "A hospital corridor with a door marked with a number plate, and a "
        "warm view through a window. A person carrying a small bag walking "
        "toward the door."
    ),
    "matatu-stage-route": (
        "A Nairobi matatu stage: a colorful minibus parked at a stage, a "
        "conductor leaning out, a few people waiting to board, and a road "
        "leading away toward the next stop."
    ),
    "gov-counter-directions": (
        "A government service office interior: a queue ticket machine, a "
        "counter with a friendly officer, signs above pointing to different "
        "counters, and a few people waiting in line."
    ),
    "directions-landmarks": (
        "A Nairobi street corner with a clear landmark (a tall tree, a "
        "painted shop sign, a small roundabout), and a person asking a "
        "passerby for directions. Warm afternoon light."
    ),
    "matatu-diversion-route": (
        "A friendly matatu conductor pointing out a calm, shaded pedestrian "
        "walkway next to a small roundabout stage in Nairobi."
    ),
    "gov-counter-5-outage": (
        "A calm public service hall where a friendly officer hands a visitor "
        "a paper queue card pointing toward Counter 5."
    ),
    "directions-detour": (
        "A quiet, wide pedestrian arcade next to a green bookshop leading "
        "toward a community library courtyard."
    ),
}

_FALLBACK_SCENE = "A hospital waiting area with a reception desk and soft chairs."

_cache: Dict[str, str] = {}


def clear_image_cache() -> None:
    """Drop cached illustrations. Call on session end if you need a fresh set."""
    _cache.clear()


async def generate_story_image(
    story_id: str,
    *,
    api_key: Optional[str] = None,
    http_options=None,
    model: Optional[str] = None,
) -> Optional[str]:
    """Generate a scene illustration for a story_id and return a data URL.

    Returns a ``data:image/jpeg;base64,...`` URL the client can drop into an
    ``<img src>`` directly, or None if generation failed (the client falls
    back to the SVG placeholder in that case).

    Args:
        story_id: The story_id from the FlowNode (e.g. "hospital-waiting-area").
        api_key: Google AI API key. If None, reads GOOGLE_API_KEY / GEMINI_API_KEY.
        http_options: HttpOptions for the google-genai Client (the proxy).
        model: Image model to use. Defaults to GEMINI_IMAGE_MODEL env var or
            "gemini-3.1-flash-image" (the fastest one the proxy serves).
    """
    if story_id in _cache:
        return _cache[story_id]

    key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        logger.warning("No Google API key for image generation; skipping.")
        return None

    model_name = model or os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
    scene = _SCENES.get(story_id, _FALLBACK_SCENE)
    prompt = f"{scene}\n\n{_STYLE}"

    try:
        from google import genai
        client = genai.Client(api_key=key, http_options=http_options)
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config={"response_modalities": ["IMAGE"]},
        )
    except Exception as exc:
        logger.warning(f"Image generation failed for {story_id}: {exc}")
        return None

    # Extract the first image part from the response.
    try:
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            logger.warning(f"Image generation returned no candidates for {story_id}.")
            return None
        parts = candidates[0].content.parts
        for part in parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                mime = getattr(inline, "mime_type", None) or "image/jpeg"
                encoded = base64.b64encode(inline.data).decode("ascii")
                data_url = f"data:{mime};base64,{encoded}"
                _cache[story_id] = data_url
                logger.info(f"Generated illustration for {story_id} ({len(encoded)} b64 chars).")
                return data_url
    except Exception as exc:
        logger.warning(f"Image response parsing failed for {story_id}: {exc}")
        return None

    logger.warning(f"Image generation returned no image part for {story_id}.")
    return None


def story_image_sync(
    story_id: str,
    *,
    api_key: Optional[str] = None,
    http_options=None,
    model: Optional[str] = None,
) -> Optional[str]:
    """Synchronous version for use in non-async contexts (e.g. a pre-warm).

    Same return contract as generate_story_image. Calls the sync
    generate_content. Falls back to None on any failure.
    """
    if story_id in _cache:
        return _cache[story_id]

    key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        return None

    model_name = model or os.getenv("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
    scene = _SCENES.get(story_id, _FALLBACK_SCENE)
    prompt = f"{scene}\n\n{_STYLE}"

    try:
        from google import genai
        client = genai.Client(api_key=key, http_options=http_options)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={"response_modalities": ["IMAGE"]},
        )
        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            return None
        parts = candidates[0].content.parts
        for part in parts:
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                mime = getattr(inline, "mime_type", None) or "image/jpeg"
                encoded = base64.b64encode(inline.data).decode("ascii")
                data_url = f"data:{mime};base64,{encoded}"
                _cache[story_id] = data_url
                return data_url
    except Exception as exc:
        logger.warning(f"Sync image generation failed for {story_id}: {exc}")
        return None
    return None