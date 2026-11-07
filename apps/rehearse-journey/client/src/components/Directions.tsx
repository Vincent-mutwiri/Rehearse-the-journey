/**
 * Directions — enter a destination, get a real route on a Leaflet map.
 *
 * Uses the Maps Routes API (v2) via the bot, which calls the API with the
 * maps_api key and returns the route data (polyline + steps + distance).
 * The route is drawn on a free OSM Leaflet map, labelled
 * "candidate path — confirm with your co-designer."
 */

import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, Navigation, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RouteData } from '@/stories'

// Fix the default Leaflet marker icon (it breaks with bundlers).
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = defaultIcon

export interface DirectionsProps {
  onBack: () => void
}

const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY || ''

export default function Directions({ onBack }: DirectionsProps) {
  const [origin, setOrigin] = useState('Nairobi CBD')
  const [destination, setDestination] = useState('')
  const [route, setRoute] = useState<RouteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGetDirections = async () => {
    if (!destination.trim()) {
      setError('Enter a destination first.')
      return
    }
    setLoading(true)
    setError('')
    setRoute(null)
    try {
      // Call the bot's Maps endpoint (or the Maps API directly via a proxy).
      // For now, we call the Maps Routes API v2 directly from the client
      // using the maps_api key. In production, this goes through the bot.
      const key = MAPS_API_KEY
      if (!key) {
        setError('No Maps API key configured. Ask the team to set VITE_MAPS_API_KEY in the client .env.local')
        setLoading(false)
        return
      }
      const res = await fetch(
        `/maps-routes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.legs.steps.navigationInstruction,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify({
            origin: { address: origin },
            destination: { address: destination },
            travelMode: 'DRIVE',
          }),
        },
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        setError(errBody?.error?.message || `Could not get directions (HTTP ${res.status}).`)
        setLoading(false)
        return
      }
      const data = await res.json()
      console.log('Routes API response:', JSON.stringify(data).slice(0, 300))
      const routes = data.routes || []
      if (!routes.length) {
        setError('No route found. Try being more specific — e.g. "KCA University, Nairobi, Kenya".')
        setLoading(false)
        return
      }
      const r = routes[0]
      // Decode the encoded polyline
      const polyline = decodePolyline(r.polyline?.encodedPolyline || '')
      const steps = (r.legs?.[0]?.steps || []).slice(0, 10).map((s: any) => ({
        instruction: s.navigationInstruction?.instructions || '',
        maneuver: s.navigationInstruction?.maneuver || '',
      }))
      setRoute({
        distance_meters: r.distanceMeters || 0,
        duration: r.duration || '',
        steps,
        polyline,
        label: `${origin} → ${destination}`,
      })
    } catch (e) {
      setError('Could not reach the Maps API. Check your network.')
    } finally {
      setLoading(false)
    }
  }

  const pts = route?.polyline.map(p => [p.lat, p.lng] as [number, number]) || []
  const bounds = pts.length > 1 ? L.latLngBounds(pts) : null

  return (
    <section className="directions-section" aria-label="Get directions">
      <header className="directions-header">
        <div className="directions-header-row">
          <Button variant="outline" size="sm" className="rounded-full directions-back-btn" onClick={onBack}>
            <ArrowLeft aria-hidden="true" /> Back to dashboard
          </Button>
          <h2 className="directions-title">Get directions</h2>
        </div>
      </header>

      <div className="directions-form" role="group" aria-label="Route search">
        <label className="directions-field">
          <span className="directions-field-label">From</span>
          <input
            type="text"
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="Starting point (e.g. Nairobi CBD)"
            className="directions-input"
          />
        </label>
        <label className="directions-field">
          <span className="directions-field-label">To</span>
          <input
            type="text"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="Where do you want to go? (e.g. Mbagathi Hospital)"
            className="directions-input"
            onKeyDown={e => { if (e.key === 'Enter') handleGetDirections() }}
          />
        </label>
        <Button
          onClick={handleGetDirections}
          disabled={loading}
          className="rounded-full directions-go"
        >
          <Navigation aria-hidden="true" />
          {loading ? 'Finding route…' : 'Get directions'}
        </Button>
      </div>

      {error && <p role="alert" className="directions-error">{error}</p>}

      {route && pts.length > 1 && bounds && (
        <div className="directions-result">
          <div className="directions-map">
            <MapContainer
              center={bounds.getCenter()}
              zoom={14}
              scrollWheelZoom={false}
              style={{ height: 320, width: '100%', borderRadius: 16 }}
              bounds={bounds}
              boundsOptions={{ padding: [30, 30] }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Polyline
                positions={pts}
                pathOptions={{ color: '#8fb39b', weight: 5, opacity: 0.85 }}
              />
              <Marker position={pts[0]}>
                <Popup>Start: {origin}</Popup>
              </Marker>
              <Marker position={pts[pts.length - 1]}>
                <Popup>Destination: {destination}</Popup>
              </Marker>
            </MapContainer>
          </div>

          <div className="directions-summary">
            <span className="directions-distance">
              <MapPin aria-hidden="true" />
              {(route.distance_meters / 1000).toFixed(1)} km · {route.steps.length} steps
            </span>
            <span className="directions-candidate-label">
              Candidate path — confirm with your co-designer.
            </span>
          </div>

          <ol className="directions-steps" aria-label="Turn-by-turn directions">
            {route.steps.map((s, i) => (
              <li key={i} className="directions-step">
                <span className="directions-step-num">{i + 1}</span>
                <span className="directions-step-text">{s.instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

// Decode a Google encoded polyline into [{lat, lng}, ...]
function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  if (!encoded) return []
  const coords: { lat: number; lng: number }[] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    let result = 1
    let shift = 0
    while (true) {
      const b = encoded.charCodeAt(index) - 63 - 1
      index++
      result += b << shift
      shift += 5
      if (b < 0x1f) break
    }
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    result = 1
    shift = 0
    while (true) {
      const b = encoded.charCodeAt(index) - 63 - 1
      index++
      result += b << shift
      shift += 5
      if (b < 0x1f) break
    }
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    coords.push({ lat: lat * 1e-5, lng: lng * 1e-5 })
  }
  return coords
}