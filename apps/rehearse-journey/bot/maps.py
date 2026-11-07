"""Google Maps Platform API helper for the Rehearse-the-Journey story cards.

Calls the Routes API (v2), Geocoding, and Places API (New) with the
`maps_api` key from .env, Returns route data the client renders on a real
Leaflet map in the StoryCard's render() slot.

All calls go directly to Google's endpoints (no proxy). The key is read from
the `maps_api` env var. Results are cached per story_id so a route is fetched
once per session, not on every node entry.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import urllib.request
import urllib.parse
import json

from loguru import logger

# ── Per-story route definitions ─────────────────────────────────────────────
# Each story_id maps to an origin + destination the Routes API will compute.
# These are fictional practice locations, but the routes are real Nairobi
# streets — the PRD's "candidate path, confirm with your co-designer" label
# applies.

_STORY_ROUTES: Dict[str, Dict[str, str]] = {
    "hospital-waiting-area": {
        "origin": "Mbagathi Hospital, Nairobi, Kenya",
        "destination": "Mbagathi Hospital Reception, Nairobi, Kenya",
        "label": "Reception → Waiting Area B (candidate path — confirm)",
    },
    "hospital-room-4": {
        "origin": "Mbagathi Way, Nairobi, Kenya",
        "destination": "Mbagathi Hospital, Nairobi, Kenya",
        "label": "Waiting Area → Room 4 (candidate path — confirm)",
    },
    "matatu-stage-route": {
        "origin": "Nairobi CBD, Kenya",
        "destination": "Mbagathi Stage, Nairobi, Kenya",
        "label": "CBD → Matatu Stage (candidate path — confirm)",
    },
    "gov-counter-directions": {
        "origin": "Nairobi CBD, Kenya",
        "destination": "Huduma Centre, Nairobi, Kenya",
        "label": "CBD → Huduma Centre (candidate path — confirm)",
    },
    "directions-landmarks": {
        "origin": "Nairobi CBD, Kenya",
        "destination": "Nairobi National Library, Nairobi, Kenya",
        "label": "CBD → Library (candidate path — confirm)",
    },
    "matatu-diversion-route": {
        "origin": "Nairobi CBD, Kenya",
        "destination": "Upper Hill Roundabout, Nairobi, Kenya",
        "label": "CBD → Roundabout Stage Diversion (candidate path — confirm)",
    },
    "gov-counter-5-outage": {
        "origin": "Kencom Stage, Nairobi, Kenya",
        "destination": "Huduma Centre GPO, Nairobi, Kenya",
        "label": "Kencom → Service Hall Counter 5 (candidate path — confirm)",
    },
    "directions-detour": {
        "origin": "GPO Post Office, Nairobi, Kenya",
        "destination": "Kenya National Library Service, Nairobi, Kenya",
        "label": "Post Office Arcade → Library Detour (candidate path — confirm)",
    },
}

_cache: Dict[str, Dict[str, Any]] = {}


def _maps_key() -> Optional[str]:
    return (os.getenv("maps_api") or "").strip() or None


def _http_get(url: str) -> Dict[str, Any]:
    """Simple GET returning parsed JSON."""
    with urllib.request.urlopen(url, timeout=15) as resp:
        return json.loads(resp.read())


def _http_post(url: str, headers: Dict[str, str], body: Dict[str, Any]) -> Any:
    """Simple POST returning parsed JSON (or raw text)."""
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw


def geocode(address: str) -> Optional[Dict[str, float]]:
    """Geocode an address → {lat, lng} or None."""
    key = _maps_key()
    if not key:
        return None
    try:
        url = (
            "https://maps.googleapis.com/maps/api/geocode/json"
            f"?address={urllib.parse.quote(address)}&key={key}"
        )
        d = _http_get(url)
        if d.get("status") == "OK" and d.get("results"):
            loc = d["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lng": loc["lng"]}
    except Exception as exc:
        logger.warning(f"Geocode failed for '{address}': {exc}")
    return None


def compute_route(origin: str, destination: str) -> Optional[Dict[str, Any]]:
    """Call the Routes API (v2) for turn-by-turn directions.

    Returns {distance_meters, duration, steps: [...], polyline: [...]} or None.
    The polyline is a list of {lat, lng} points the client draws on Leaflet.
    """
    key = _maps_key()
    if not key:
        logger.warning("No maps_api key; skipping route computation.")
        return None

    try:
        url = "https://routes.googleapis.com/directions/v2:computeRoutes"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": (
                "routes.distanceMeters,"
                "routes.duration,"
                "routes.legs.steps.navigationInstruction,"
                "routes.legs.steps.startLocation,"
                "routes.legs.steps.endLocation,"
                "routes.polyline.encodedPolyline"
            ),
        }
        body = {
            "origin": {"address": origin},
            "destination": {"address": destination},
            "travelMode": "DRIVE",
        }
        d = _http_post(url, headers, body)
        routes = d.get("routes", []) if isinstance(d, dict) else []
        if not routes:
            logger.warning(f"Routes API returned no routes: {d}")
            return None
        r = routes[0]
        # Extract steps with navigation instructions
        steps: List[Dict[str, Any]] = []
        for leg in r.get("legs", []):
            for step in leg.get("steps", []):
                ni = step.get("navigationInstruction", {})
                start_loc = (
                    step.get("startLocation", {}).get("latLng")
                    or step.get("startLocationLatLng")
                    or {}
                )
                end_loc = (
                    step.get("endLocation", {}).get("latLng")
                    or step.get("endLocationLatLng")
                    or {}
                )
                steps.append({
                    "instruction": ni.get("instructions", ""),
                    "maneuver": ni.get("maneuver", ""),
                    "start": start_loc,
                    "end": end_loc,
                })
        # Decode the encoded polyline for the Leaflet overlay
        polyline = _decode_polyline(r.get("polyline", {}).get("encodedPolyline", ""))
        return {
            "distance_meters": r.get("distanceMeters", 0),
            "duration": r.get("duration", ""),
            "steps": steps[:10],  # cap at 10 for the demo
            "polyline": polyline,
            "label": f"{origin} → {destination}",
        }
    except Exception as exc:
        logger.warning(f"Route computation failed: {exc}")
        return None


def _decode_polyline(encoded: str) -> List[Dict[str, float]]:
    """Decode a Google encoded polyline into [{lat, lng}, ...]."""
    if not encoded:
        return []
    coords: List[Dict[str, float]] = []
    index = 0
    lat = 0
    lng = 0
    while index < len(encoded):
        result = 1
        shift = 0
        while True:
            b = ord(encoded[index]) - 63 - 1
            index += 1
            result += b << shift
            shift += 5
            if b < 0x1F:
                break
        lat += (~(result >> 1) if (result & 1) else (result >> 1))
        result = 1
        shift = 0
        while True:
            b = ord(encoded[index]) - 63 - 1
            index += 1
            result += b << shift
            shift += 5
            if b < 0x1F:
                break
        lng += (~(result >> 1) if (result & 1) else (result >> 1))
        coords.append({"lat": lat * 1e-5, "lng": lng * 1e-5})
    return coords


def get_story_route(story_id: str) -> Optional[Dict[str, Any]]:
    """Get the route for a story_id (cached). Returns the route dict or None."""
    if story_id in _cache:
        return _cache[story_id]
    route_def = _STORY_ROUTES.get(story_id)
    if not route_def:
        return None
    logger.info(f"Computing route for {story_id}: {route_def['origin']} → {route_def['destination']}")
    route = compute_route(route_def["origin"], route_def["destination"])
    if route:
        route["label"] = route_def["label"]
        _cache[story_id] = route
        logger.info(
            f"Route for {story_id}: {route['distance_meters']}m, "
            f"{len(route['steps'])} steps, {len(route['polyline'])} polyline points"
        )
    return route


def clear_route_cache() -> None:
    _cache.clear()