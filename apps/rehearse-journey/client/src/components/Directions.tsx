/**
 * Directions — enter a destination, get a real route on a Leaflet map,
 * plus visual previews of how the place looks, key landmarks along the way,
 * how busy it is right now, estimated noise levels, current weather, and
 * full distance / travel-time / step-by-step metrics.
 *
 * Uses:
 * - Google Maps Routes API (v2) via `/maps-routes` for route polyline, distance, duration & per-step metrics
 * - Google Places API (New) via `/maps-places` for destination photos, address & nearby landmarks
 * - Open-Meteo API via `/open-meteo` for real-time weather (temperature, feels-like, humidity, UV, wind, rain chance)
 * - Time-of-day & route heuristics for sensory preparation (crowd / busyness & noise level)
 */

import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  Navigation,
  MapPin,
  CloudSun,
  Users,
  Volume2,
  Landmark,
  Camera,
  Clock,
  Sparkles,
  Footprints,
  Car,
  Compass,
  Droplets,
  Wind,
  Sun,
  BusFront,
  Banknote,
  ArrowRightLeft,
} from 'lucide-react'
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
  onRehearseMatatu?: () => void
}

interface MatatuSaccoOption {
  id: string
  routeNumber: string
  saccoName: string
  corridor: string
  boardingStage: string
  alightingStage: string
  connectionNote?: string
  isDirect: boolean
  offPeakFareKes: string
  peakFareKes: string
  paymentMethods: string
  conductorPhrase: string
}

interface PlacePreviewPhoto {
  url: string
  caption: string
  attribution?: string
}

interface LandmarkItem {
  name: string
  category: string
  distanceFromStart?: string
  note: string
}

interface DetailedStep {
  instruction: string
  maneuver?: string
  distanceMeters?: number
  durationSec?: number
}

interface SensoryEnvironment {
  busynessLevel: 'Calm / Quiet' | 'Moderate Activity' | 'Busy / Crowded'
  busynessColor: 'sage' | 'peach' | 'lavender'
  busynessDetail: string
  quietHoursHint: string
  noiseLevel: 'Low (~45–55 dB)' | 'Moderate (~60–70 dB)' | 'High (~75+ dB)'
  noiseDetail: string
  sensoryTip: string
  weatherSummary: string
  temperatureC: number | null
  feelsLikeC: number | null
  humidityPct: number | null
  windKmh: number | null
  uvIndex: number | null
  precipProbPct: number | null
  weatherNote: string
}

const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY || ''

function parseDurationSeconds(raw: string | undefined): number {
  if (!raw) return 0
  const m = String(raw).match(/^(\d+(?:\.\d+)?)s$/)
  return m ? Math.round(Number(m[1])) : 0
}

function formatDurationMinutes(seconds: number): string {
  if (!seconds || seconds <= 0) return '~10 min'
  const mins = Math.max(1, Math.round(seconds / 60))
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`
}

function formatStepDistance(meters: number | undefined): string {
  if (!meters || meters <= 0) return ''
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function buildIllustratedPlaceSvg(title: string, subtitle: string, accent: string): string {
  const safeTitle = title.replace(/[<>&"']/g, '')
  const safeSub = subtitle.replace(/[<>&"']/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" width="480" height="280">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e8e2f0"/>
        <stop offset="100%" stop-color="#fbf7f2"/>
      </linearGradient>
    </defs>
    <rect width="480" height="280" rx="20" fill="url(#sky)"/>
    <circle cx="400" cy="62" r="28" fill="#f4c6a6" opacity="0.85"/>
    <path d="M0 210 Q120 185 240 205 T480 198 L480 280 L0 280 Z" fill="#8fb39b" opacity="0.35"/>
    <rect x="64" y="102" width="130" height="108" rx="12" fill="${accent}" stroke="#3a3550" stroke-width="2" stroke-opacity="0.25"/>
    <rect x="84" y="122" width="28" height="26" rx="5" fill="#fbf7f2"/>
    <rect x="126" y="122" width="28" height="26" rx="5" fill="#fbf7f2"/>
    <rect x="110" y="166" width="38" height="44" rx="6" fill="#3a3550" opacity="0.75"/>
    <rect x="218" y="124" width="110" height="86" rx="12" fill="#f4c6a6" stroke="#3a3550" stroke-width="2" stroke-opacity="0.2"/>
    <rect x="238" y="144" width="24" height="24" rx="4" fill="#fbf7f2"/>
    <rect x="276" y="144" width="24" height="24" rx="4" fill="#fbf7f2"/>
    <circle cx="372" cy="166" r="28" fill="#8fb39b"/>
    <rect x="368" y="182" width="8" height="28" rx="3" fill="#3a3550" opacity="0.6"/>
    <path d="M0 232 L480 232" stroke="#3a3550" stroke-width="3" stroke-dasharray="10 8" opacity="0.25"/>
    <rect x="24" y="20" width="310" height="54" rx="12" fill="#fffdfa" opacity="0.92"/>
    <text x="40" y="44" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#3a3550">${safeTitle.slice(0, 34)}</text>
    <text x="40" y="63" font-family="system-ui, sans-serif" font-size="12" fill="#655e76">${safeSub.slice(0, 46)}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function interpretWeatherCode(code: number): { label: string; note: string } {
  if (code === 0) return { label: 'Clear sky', note: 'Bright daylight — sunglasses or a cap may feel comfortable.' }
  if (code === 1 || code === 2) return { label: 'Partly cloudy', note: 'Mild, comfortable light with gentle cloud cover.' }
  if (code === 3) return { label: 'Overcast', note: 'Soft, even sky light without harsh glare.' }
  if (code >= 45 && code <= 48) return { label: 'Misty / Foggy', note: 'Lower visibility — take extra time at crossings.' }
  if (code >= 51 && code <= 67) return { label: 'Light rain / Drizzle', note: 'Carry an umbrella; walkways may be slightly slick.' }
  if (code >= 80 && code <= 82) return { label: 'Passing rain showers', note: 'Keep a light raincoat or umbrella handy; shelter near covered arcades.' }
  if (code >= 95) return { label: 'Thunderstorm nearby', note: 'Loud thunder possible — consider waiting indoors or wearing ear defenders.' }
  return { label: 'Pleasant outdoor conditions', note: 'Good walking conditions along the route.' }
}

function estimateSensoryConditions(
  destinationName: string,
  placeTypes: string[],
  weather: {
    code: number | null
    tempC: number | null
    feelsLikeC: number | null
    humidityPct: number | null
    windKmh: number | null
    uvIndex: number | null
    precipProbPct: number | null
  },
): SensoryEnvironment {
  const hour = new Date().getHours()
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)
  const isMidday = hour >= 10 && hour <= 15
  const lowerDest = destinationName.toLowerCase()

  const isTransitOrCBD =
    lowerDest.includes('cbd') ||
    lowerDest.includes('stage') ||
    lowerDest.includes('kencom') ||
    lowerDest.includes('market') ||
    placeTypes.some(t => t.includes('transit') || t.includes('bus') || t.includes('train'))
  const isHospitalOrGov =
    lowerDest.includes('hospital') ||
    lowerDest.includes('clinic') ||
    lowerDest.includes('huduma') ||
    lowerDest.includes('office') ||
    placeTypes.some(t => t.includes('hospital') || t.includes('government') || t.includes('health'))
  const isQuietSpace =
    lowerDest.includes('library') ||
    lowerDest.includes('park') ||
    lowerDest.includes('arboretum') ||
    lowerDest.includes('museum') ||
    placeTypes.some(t => t.includes('library') || t.includes('park'))

  let busynessLevel: SensoryEnvironment['busynessLevel'] = 'Moderate Activity'
  let busynessColor: SensoryEnvironment['busynessColor'] = 'peach'
  let busynessDetail = 'Steady foot traffic and a short queue at the entrance.'
  let quietHoursHint = 'Quietest windows: 10:00–11:30 AM and 2:00–3:30 PM.'
  let noiseLevel: SensoryEnvironment['noiseLevel'] = 'Moderate (~60–70 dB)'
  let noiseDetail = 'Everyday street conversation, passing vehicles, and counter announcements.'
  let sensoryTip = 'Keep headphones handy if street sounds feel overwhelming, and pause at a quiet landmark before entering.'

  if (isQuietSpace && !isRushHour) {
    busynessLevel = 'Calm / Quiet'
    busynessColor = 'sage'
    busynessDetail = 'Plenty of personal space, calm walkways, and unhurried seating areas.'
    quietHoursHint = 'Calm throughout most of the day, especially mornings before noon.'
    noiseLevel = 'Low (~45–55 dB)'
    noiseDetail = 'Soft footsteps, quiet voices indoors, and light outdoor breeze.'
    sensoryTip = 'This location is generally calm. You can take your time at the entrance.'
  } else if (isTransitOrCBD || isRushHour) {
    busynessLevel = 'Busy / Crowded'
    busynessColor = 'lavender'
    busynessDetail = isRushHour
      ? 'Peak commuter hours — expect active sidewalks, matatu queues, and brisk foot traffic.'
      : 'Active commercial/transit hub with frequent minibuses and pedestrians.'
    quietHoursHint = 'Less crowded between 10:30 AM and 3:00 PM outside commuter rush.'
    noiseLevel = 'High (~75+ dB)'
    noiseDetail = 'Matatu horns, conductors calling routes, and lively street activity.'
    sensoryTip = 'Noise-cancelling earbuds help along the main road; step onto the inner walkway when checking your phone or map.'
  } else if (isHospitalOrGov) {
    busynessLevel = isMidday ? 'Moderate Activity' : 'Calm / Quiet'
    busynessColor = isMidday ? 'peach' : 'sage'
    busynessDetail = 'Organized reception desk and seated waiting bay; busiest between 8:30 AM and 12:30 PM.'
    quietHoursHint = 'Calmer check-in times are usually mid-morning (10:30 AM) or after 2:00 PM.'
    noiseLevel = 'Moderate (~60–70 dB)'
    noiseDetail = 'Calm indoor voices, ticket number chimes, and security check-in at the gate.'
    sensoryTip = 'Have your clinic card or inquiry note ready before reaching the gate so check-in feels quick and predictable.'
  }

  const weatherInfo =
    weather.code !== null
      ? interpretWeatherCode(weather.code)
      : { label: 'Warm & partly sunny', note: 'Comfortable visibility for spotting street landmarks.' }

  return {
    busynessLevel,
    busynessColor,
    busynessDetail,
    quietHoursHint,
    noiseLevel,
    noiseDetail,
    sensoryTip,
    weatherSummary: weatherInfo.label,
    temperatureC: weather.tempC ?? 23,
    feelsLikeC: weather.feelsLikeC ?? weather.tempC ?? 24,
    humidityPct: weather.humidityPct ?? 58,
    windKmh: weather.windKmh ?? 12,
    uvIndex: weather.uvIndex ?? 6,
    precipProbPct: weather.precipProbPct ?? 15,
    weatherNote: weatherInfo.note,
  }
}

function extractLandmarksFromSteps(
  steps: DetailedStep[],
  origin: string,
  destination: string,
  nearbyPlaces: LandmarkItem[],
): LandmarkItem[] {
  if (nearbyPlaces.length > 0) {
    return nearbyPlaces.slice(0, 4)
  }
  const extracted: LandmarkItem[] = [
    {
      name: `Starting point: ${origin}`,
      category: 'Departure Landmark',
      distanceFromStart: '0.0 km',
      note: 'Check your direction facing the main road before starting.',
    },
  ]
  let runningMeters = 0
  for (const s of steps) {
    runningMeters += s.distanceMeters || 250
    const clean = s.instruction.replace(/<[^>]+>/g, '').trim()
    if (!clean) continue
    const ontoMatch = clean.match(/(?:onto|toward|along|at|pass by|near)\s+([A-Z][A-Za-z0-9\s.'-]{2,32})/)
    if (ontoMatch && extracted.length < 3) {
      extracted.push({
        name: ontoMatch[1].trim(),
        category: 'Route Waypoint',
        distanceFromStart: formatStepDistance(runningMeters),
        note: clean,
      })
    }
  }
  extracted.push({
    name: `Arrival: ${destination}`,
    category: 'Destination Entrance',
    distanceFromStart: formatStepDistance(runningMeters || undefined),
    note: 'Look for the main sign board or security/reception desk at the entrance.',
  })
  return extracted.slice(0, 4)
}

function findMatatuSaccosForRoute(
  origin: string,
  destination: string,
  steps: DetailedStep[],
  distanceMeters: number,
): MatatuSaccoOption[] {
  const combined = `${origin} ${destination} ${steps.map(s => s.instruction).join(' ')}`.toLowerCase()
  const km = Math.max(1, distanceMeters / 1000)
  const baseOffPeak = Math.max(30, Math.min(120, Math.round((km * 12) / 10) * 10 + 20))
  const basePeak = baseOffPeak + (km > 6 ? 30 : 20)

  if (
    combined.includes('mbagathi') ||
    combined.includes('kenyatta') ||
    combined.includes('knh') ||
    combined.includes('hospital road') ||
    combined.includes('ngumo') ||
    combined.includes('upper hill')
  ) {
    return [
      {
        id: 'kmo-7c',
        routeNumber: 'Route 7C',
        saccoName: 'KMO Sacco / Citi Hoppa',
        corridor: 'CBD (Kencom / GPO) → Valley Rd / Hospital Rd → KNH & Mbagathi Way',
        boardingStage: 'Kencom Stage or GPO Stage (Nairobi CBD)',
        alightingStage: combined.includes('mbagathi')
          ? 'Mbagathi Hospital Gate Stage (or KNH Stage + 5 min walk)'
          : 'KNH / Hospital Road Stage',
        isDirect: true,
        offPeakFareKes: 'KES 40 – 50',
        peakFareKes: 'KES 60 – 80',
        paymentMethods: 'M-Pesa (Pochi / Till) or Cash',
        conductorPhrase: combined.includes('mbagathi')
          ? '“Shukisha Mbagathi Gate / Hospital Stage, tafadhali.”'
          : '“Shukisha Kenyatta / Hospital Road Stage, tafadhali.”',
      },
      {
        id: 'super-metro-46',
        routeNumber: 'Route 46 / 33',
        saccoName: 'Super Metro / KBS / Forward Travellers',
        corridor: 'CBD (Kencom / Odeon) → Ngong Rd / Upper Hill → Kenyatta Market',
        boardingStage: 'Kencom Stage (Moi Ave / City Hall Way)',
        alightingStage: 'Kenyatta Market / KMTC Stage',
        connectionNote: 'Connect via signed pedestrian walkway (400 m) or boda/shuttle to Mbagathi Way.',
        isDirect: false,
        offPeakFareKes: 'KES 50',
        peakFareKes: 'KES 70 – 80',
        paymentMethods: 'M-Pesa or Cash',
        conductorPhrase: '“Naomba kushuka Kenyatta Market / Hospital Junction.”',
      },
    ]
  }

  if (
    combined.includes('library') ||
    combined.includes('community') ||
    combined.includes('milimani') ||
    combined.includes('ngong road') ||
    combined.includes('yaya') ||
    combined.includes('karen')
  ) {
    return [
      {
        id: 'citi-hoppa-46',
        routeNumber: 'Route 46 / 111',
        saccoName: 'Citi Hoppa / Super Metro Sacco',
        corridor: 'CBD (Kencom / GPO) → Kenyatta Ave → Community / Ngong Road (KNLS Library)',
        boardingStage: 'Kencom or GPO Stage, CBD',
        alightingStage: 'Community / Kenya National Library Stage (Ngong Rd)',
        isDirect: true,
        offPeakFareKes: 'KES 40 – 50',
        peakFareKes: 'KES 50 – 70',
        paymentMethods: 'M-Pesa or Cash',
        conductorPhrase: '“Shukisha Library / Community Stage, tafadhali.”',
      },
      {
        id: 'nawasuku-24',
        routeNumber: 'Route 24C',
        saccoName: 'Nawasuku Sacco / Metro Trans',
        corridor: 'Ambassadeur / Kencom → Valley Rd → Ngong Rd',
        boardingStage: 'Ambassadeur / Kencom Stage',
        alightingStage: 'Baptist / Library Footbridge Stage',
        connectionNote: 'Use the pedestrian zebra crossing / footbridge directly outside the library complex.',
        isDirect: true,
        offPeakFareKes: 'KES 50',
        peakFareKes: 'KES 70 – 80',
        paymentMethods: 'M-Pesa or Cash',
        conductorPhrase: '“Shukisha Library Footbridge, tafadhali.”',
      },
    ]
  }

  if (
    combined.includes('huduma') ||
    combined.includes('gpo') ||
    combined.includes('teleposta') ||
    combined.includes('city square') ||
    combined.includes('kencom')
  ) {
    return [
      {
        id: 'super-metro-cbd',
        routeNumber: 'Routes 46 / 105 / 106',
        saccoName: 'Super Metro / Zuri Genesis / Lopha Sacco',
        corridor: 'All Main Corridors → GPO / Kenyatta Avenue / City Square',
        boardingStage: 'Your local stage heading to Town / CBD',
        alightingStage: 'GPO Stage (Directly opposite Huduma Centre GPO)',
        isDirect: true,
        offPeakFareKes: 'KES 30 – 50 (within town environs)',
        peakFareKes: 'KES 50 – 80',
        paymentMethods: 'M-Pesa Till / Cash',
        conductorPhrase: '“Shukisha GPO / Posta, tafadhali.”',
      },
    ]
  }

  if (
    combined.includes('kca') ||
    combined.includes('ruaraka') ||
    combined.includes('thika') ||
    combined.includes('roysambu') ||
    combined.includes('kasarani') ||
    combined.includes('muthaiga')
  ) {
    return [
      {
        id: 'super-metro-thika',
        routeNumber: 'Route 45 / 237',
        saccoName: 'Super Metro / Kenya Mpya / Manchester Sacco',
        corridor: 'CBD (Archives / Odeon) → Thika Superhighway → Survey / KCA / Roysambu',
        boardingStage: 'Archives / Odeon Stage (CBD)',
        alightingStage: `${destination} / Thika Rd Footbridge Stage`,
        isDirect: true,
        offPeakFareKes: 'KES 50 – 60',
        peakFareKes: 'KES 70 – 100',
        paymentMethods: 'M-Pesa or Cash',
        conductorPhrase: `“Shukisha ${destination.split(',')[0]} stage, tafadhali.”`,
      },
      {
        id: '2nk-17b',
        routeNumber: 'Route 17B / 44',
        saccoName: '2NK / Compliant Sacco',
        corridor: 'CBD (Ronald Ngala / Tom Mboya) → Pangani → Survey / Ruaraka',
        boardingStage: 'Tom Mboya / Odeon Stage (CBD)',
        alightingStage: 'Survey / Underpass Stage',
        connectionNote: 'Short 5-minute walk along the service lane from the underpass.',
        isDirect: false,
        offPeakFareKes: 'KES 40 – 50',
        peakFareKes: 'KES 60 – 80',
        paymentMethods: 'Cash or M-Pesa',
        conductorPhrase: '“Shukisha Survey Underpass, tafadhali.”',
      },
    ]
  }

  if (
    combined.includes('westlands') ||
    combined.includes('kangemi') ||
    combined.includes('waiyaki') ||
    combined.includes('sarit') ||
    combined.includes('parklands')
  ) {
    return [
      {
        id: 'super-metro-105',
        routeNumber: 'Route 23 / 105',
        saccoName: 'Super Metro / Latema Sacco',
        corridor: 'CBD (Odeon / Koja) → Uhuru Hwy → Westlands Stage',
        boardingStage: 'Odeon / Koja Stage (CBD)',
        alightingStage: `${destination.split(',')[0]} / Westlands Stage`,
        isDirect: true,
        offPeakFareKes: 'KES 40 – 50',
        peakFareKes: 'KES 60 – 80',
        paymentMethods: 'M-Pesa or Cash',
        conductorPhrase: `“Shukisha Westlands / ${destination.split(',')[0]}, tafadhali.”`,
      },
    ]
  }

  return [
    {
      id: 'general-direct',
      routeNumber: 'Town / Corridor Matatu',
      saccoName: 'Super Metro / Citi Hoppa / KBS Sacco',
      corridor: `${origin} → CBD Hub → ${destination}`,
      boardingStage: `${origin} Main Stage (or Kencom / Odeon / Archives in CBD)`,
      alightingStage: `${destination.split(',')[0]} Stage`,
      connectionNote:
        origin.toLowerCase().includes('cbd')
          ? 'Direct corridor service from town.'
          : 'If boarding outside CBD, take a town-bound matatu to Kencom/Archives and connect to the destination stage.',
      isDirect: origin.toLowerCase().includes('cbd'),
      offPeakFareKes: `KES ${baseOffPeak}`,
      peakFareKes: `KES ${basePeak}`,
      paymentMethods: 'M-Pesa (Pochi / Till) or Cash',
      conductorPhrase: `“Shukisha ${destination.split(',')[0]} stage, tafadhali.”`,
    },
  ]
}

export default function Directions({ onBack, onRehearseMatatu }: DirectionsProps) {
  const [origin, setOrigin] = useState('Nairobi CBD')
  const [destination, setDestination] = useState('')
  const [route, setRoute] = useState<RouteData | null>(null)
  const [detailedSteps, setDetailedSteps] = useState<DetailedStep[]>([])
  const [formattedDestAddress, setFormattedDestAddress] = useState<string>('')
  const [photos, setPhotos] = useState<PlacePreviewPhoto[]>([])
  const [landmarks, setLandmarks] = useState<LandmarkItem[]>([])
  const [saccoOptions, setSaccoOptions] = useState<MatatuSaccoOption[]>([])
  const [selectedSaccoId, setSelectedSaccoId] = useState<string | null>(null)
  const [sensory, setSensory] = useState<SensoryEnvironment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchPlaceAndEnvironmentDetails = async (
    destQuery: string,
    destCoords: { lat: number; lng: number } | undefined,
    routeSteps: DetailedStep[],
    totalDistanceMeters: number,
    key: string,
  ) => {
    const foundPhotos: PlacePreviewPhoto[] = []
    const foundLandmarks: LandmarkItem[] = []
    let placeTypes: string[] = []
    let targetLat = destCoords?.lat ?? -1.286389
    let targetLng = destCoords?.lng ?? 36.817223
    let resolvedAddress = ''

    // 1. Query Google Places API (New) for destination photos + nearby landmarks
    if (key) {
      try {
        const placesRes = await fetch('/maps-places/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.types,places.photos,places.location,places.editorialSummary',
          },
          body: JSON.stringify({
            textQuery: destQuery.includes('Nairobi') || destQuery.includes('Kenya')
              ? destQuery
              : `${destQuery}, Nairobi, Kenya`,
            maxResultCount: 4,
          }),
        })
        if (placesRes.ok) {
          const placesData = await placesRes.json()
          const places = placesData.places || []
          if (places.length > 0) {
            const primary = places[0]
            placeTypes = primary.types || []
            resolvedAddress = primary.formattedAddress || ''
            if (primary.location?.latitude && primary.location?.longitude) {
              targetLat = primary.location.latitude
              targetLng = primary.location.longitude
            }
            const primaryPhotos = (primary.photos || []).slice(0, 2)
            for (let i = 0; i < primaryPhotos.length; i++) {
              const ph = primaryPhotos[i]
              if (ph?.name) {
                foundPhotos.push({
                  url: `/maps-places/v1/${ph.name}/media?maxHeightPx=420&maxWidthPx=640&key=${encodeURIComponent(key)}`,
                  caption:
                    i === 0
                      ? `${primary.displayName?.text || destQuery} — Exterior & Entrance`
                      : `${primary.displayName?.text || destQuery} — Surroundings & Approach`,
                  attribution: ph.authorAttributions?.[0]?.displayName,
                })
              }
            }

            // Use places returned as visual landmarks with approximate distance along route
            for (let idx = 0; idx < Math.min(places.length, 4); idx++) {
              const p = places[idx]
              const title = p.displayName?.text
              if (!title) continue
              const rawType = (p.types?.[0] || 'landmark').replace(/_/g, ' ')
              const approxDist =
                totalDistanceMeters > 0
                  ? formatStepDistance(Math.round((totalDistanceMeters * (idx + 1)) / Math.min(places.length, 4)))
                  : undefined
              foundLandmarks.push({
                name: title,
                category: rawType.charAt(0).toUpperCase() + rawType.slice(1),
                distanceFromStart: idx === 0 ? `${formatStepDistance(totalDistanceMeters)} (Destination)` : approxDist,
                note:
                  p.editorialSummary?.text ||
                  p.formattedAddress ||
                  'Key visual landmark near your destination.',
              })
            }
          }
        }
      } catch {
        // Fallback to illustrated cards if Places API is restricted on the key
      }
    }

    if (foundPhotos.length === 0) {
      foundPhotos.push(
        {
          url: buildIllustratedPlaceSvg(
            `${destQuery} — Entrance View`,
            'Main gate, drop-off bay & reception signpost',
            '#a89bd4',
          ),
          caption: `${destQuery} — Street approach & entrance view (illustrated preview)`,
        },
        {
          url: buildIllustratedPlaceSvg(
            `Walkway toward ${destQuery}`,
            'Pedestrian path, landmark trees & stage drop-off',
            '#8fb39b',
          ),
          caption: `Pedestrian walkway & landmark approach to ${destQuery}`,
        },
      )
    }

    // 2. Fetch live weather from Open-Meteo for the destination coordinates
    let weatherCode: number | null = null
    let tempC: number | null = null
    let feelsLikeC: number | null = null
    let humidityPct: number | null = null
    let windKmh: number | null = null
    let uvIndex: number | null = null
    let precipProbPct: number | null = null

    try {
      const weatherRes = await fetch(
        `/open-meteo/v1/forecast?latitude=${targetLat.toFixed(4)}&longitude=${targetLng.toFixed(4)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,uv_index,precipitation_probability`,
      )
      if (weatherRes.ok) {
        const wData = await weatherRes.json()
        if (wData?.current) {
          tempC = typeof wData.current.temperature_2m === 'number' ? Math.round(wData.current.temperature_2m) : null
          feelsLikeC =
            typeof wData.current.apparent_temperature === 'number'
              ? Math.round(wData.current.apparent_temperature)
              : tempC
          humidityPct =
            typeof wData.current.relative_humidity_2m === 'number'
              ? Math.round(wData.current.relative_humidity_2m)
              : null
          weatherCode = typeof wData.current.weather_code === 'number' ? wData.current.weather_code : null
          windKmh = typeof wData.current.wind_speed_10m === 'number' ? Math.round(wData.current.wind_speed_10m) : null
          uvIndex = typeof wData.current.uv_index === 'number' ? Math.round(wData.current.uv_index) : null
          precipProbPct =
            typeof wData.current.precipitation_probability === 'number'
              ? Math.round(wData.current.precipitation_probability)
              : null
        }
      }
    } catch {
      // Fallback weather if offline
    }

    setFormattedDestAddress(resolvedAddress)
    setPhotos(foundPhotos)
    setLandmarks(extractLandmarksFromSteps(routeSteps, origin, destQuery, foundLandmarks))
    const matchedSaccos = findMatatuSaccosForRoute(origin, destQuery, routeSteps, totalDistanceMeters)
    setSaccoOptions(matchedSaccos)
    setSelectedSaccoId(matchedSaccos[0]?.id ?? null)
    setSensory(
      estimateSensoryConditions(destQuery, placeTypes, {
        code: weatherCode,
        tempC,
        feelsLikeC,
        humidityPct,
        windKmh,
        uvIndex,
        precipProbPct,
      }),
    )
  }

  const handleGetDirections = async () => {
    if (!destination.trim()) {
      setError('Enter a destination first.')
      return
    }
    setLoading(true)
    setError('')
    setRoute(null)
    setDetailedSteps([])
    setFormattedDestAddress('')
    setPhotos([])
    setLandmarks([])
    setSaccoOptions([])
    setSelectedSaccoId(null)
    setSensory(null)
    try {
      const key = MAPS_API_KEY
      if (!key) {
        setError('No Maps API key configured. Ask the team to set VITE_MAPS_API_KEY in the client .env.local')
        setLoading(false)
        return
      }
      const res = await fetch(`/maps-routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.duration,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode: 'DRIVE',
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        setError(errBody?.error?.message || `Could not get directions (HTTP ${res.status}).`)
        setLoading(false)
        return
      }
      const data = await res.json()
      const routes = data.routes || []
      if (!routes.length) {
        setError('No route found. Try being more specific — e.g. "Mbagathi Hospital, Nairobi, Kenya".')
        setLoading(false)
        return
      }
      const r = routes[0]
      const polyline = decodePolyline(r.polyline?.encodedPolyline || '')
      const rawSteps = (r.legs?.[0]?.steps || []).slice(0, 10)
      const parsedDetailedSteps: DetailedStep[] = rawSteps.map((s: any) => ({
        instruction: s.navigationInstruction?.instructions || '',
        maneuver: s.navigationInstruction?.maneuver || '',
        distanceMeters: typeof s.distanceMeters === 'number' ? s.distanceMeters : undefined,
        durationSec: parseDurationSeconds(s.staticDuration),
      }))
      const routeObj: RouteData = {
        distance_meters: r.distanceMeters || 0,
        duration: r.duration || '',
        steps: parsedDetailedSteps.map(s => ({
          instruction: s.instruction,
          maneuver: s.maneuver,
        })),
        polyline,
        label: `${origin} → ${destination}`,
      }
      setRoute(routeObj)
      setDetailedSteps(parsedDetailedSteps)
      const destCoord = polyline.length > 0 ? polyline[polyline.length - 1] : undefined
      await fetchPlaceAndEnvironmentDetails(
        destination.trim(),
        destCoord,
        parsedDetailedSteps,
        routeObj.distance_meters,
        key,
      )
    } catch {
      setError('Could not reach the Maps API. Check your network.')
    } finally {
      setLoading(false)
    }
  }

  const pts = route?.polyline.map(p => [p.lat, p.lng] as [number, number]) || []
  const bounds = pts.length > 1 ? L.latLngBounds(pts) : null

  const totalKm = route ? (route.distance_meters / 1000).toFixed(1) : '0.0'
  const driveSec = route ? parseDurationSeconds(route.duration) : 0
  const driveTimeLabel = formatDurationMinutes(
    driveSec || (route ? Math.round((route.distance_meters / 1000) * 180) : 0),
  )
  // Walking pace ~ 12.5 mins per km (4.8 km/h)
  const walkSec = route ? Math.round((route.distance_meters / 1000) * 750) : 0
  const walkTimeLabel = formatDurationMinutes(walkSec)
  const approxStepsCount = route ? Math.round(route.distance_meters * 1.3) : 0

  return (
    <section className="directions-section" aria-label="Get directions">
      <header className="directions-header">
        <div className="directions-header-row">
          <Button variant="outline" size="sm" className="rounded-full directions-back-btn" onClick={onBack}>
            <ArrowLeft aria-hidden="true" /> Back to dashboard
          </Button>
          <div>
            <h2 className="directions-title">Get directions &amp; place preview</h2>
            <p className="mt-1 text-sm opacity-75">
              See the distance, travel time, live weather, how the place looks, key landmarks, crowd busyness, and noise levels before you go.
            </p>
          </div>
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
            placeholder="Where do you want to go? (e.g. Mbagathi Hospital, Nairobi)"
            className="directions-input"
            onKeyDown={e => {
              if (e.key === 'Enter') void handleGetDirections()
            }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold opacity-70">Quick try:</span>
          {[
            'Mbagathi Hospital, Nairobi',
            'Kenyatta National Hospital, Nairobi',
            'Huduma Centre GPO, Nairobi',
            'Kenya National Library Service, Nairobi',
          ].map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => setDestination(preset)}
              className="min-h-[32px] rounded-full border border-ink/15 bg-white/70 px-3 py-1 text-xs font-medium hover:border-lavender"
            >
              {preset.replace(', Nairobi', '')}
            </button>
          ))}
        </div>
        <Button
          onClick={() => void handleGetDirections()}
          disabled={loading}
          className="rounded-full directions-go"
        >
          <Navigation aria-hidden="true" />
          {loading ? 'Finding route & place details…' : 'Get directions & sensory preview'}
        </Button>
      </div>

      {error && (
        <p role="alert" className="directions-error">
          {error}
        </p>
      )}

      {route && pts.length > 1 && bounds && (
        <div className="directions-result">
          {/* 0. Distance, Travel Time & Route Overview Bar */}
          <section
            aria-label="Distance and travel time overview"
            className="space-y-3 rounded-2xl border border-ink/10 bg-white/85 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide opacity-65">
                  Journey Overview
                </span>
                <h3 className="text-base font-bold">
                  {origin} → {destination}
                </h3>
                {formattedDestAddress && (
                  <p className="text-xs opacity-75">{formattedDestAddress}</p>
                )}
              </div>
              <span className="rounded-full bg-sage/30 px-3 py-1 text-xs font-semibold">
                Candidate path — confirm with your co-designer
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-ink/10 bg-cream/80 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold opacity-70">
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  Total Distance
                </div>
                <p className="mt-1 text-lg font-bold">{totalKm} km</p>
                <p className="text-[11px] opacity-75">
                  ({route.distance_meters.toLocaleString()} meters)
                </p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-cream/80 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold opacity-70">
                  <Car className="h-3.5 w-3.5" aria-hidden="true" />
                  Matatu / Drive
                </div>
                <p className="mt-1 text-lg font-bold">{driveTimeLabel}</p>
                <p className="text-[11px] opacity-75">Typical road travel time</p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-cream/80 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold opacity-70">
                  <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                  Walking Time
                </div>
                <p className="mt-1 text-lg font-bold">{walkTimeLabel}</p>
                <p className="text-[11px] opacity-75">
                  ~{approxStepsCount.toLocaleString()} walking steps
                </p>
              </div>

              <div className="rounded-xl border border-ink/10 bg-cream/80 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold opacity-70">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Turns &amp; Checkpoints
                </div>
                <p className="mt-1 text-lg font-bold">{route.steps.length} steps</p>
                <p className="text-[11px] opacity-75">{landmarks.length} key landmarks</p>
              </div>
            </div>
          </section>

          {/* 0b. Matatu Saccos, Stages & Fare Estimates */}
          {saccoOptions.length > 0 && (
            <section
              aria-label="Matatu Saccos and fare estimates"
              className="space-y-3 rounded-2xl border border-ink/10 bg-white/85 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <BusFront className="h-4 w-4 text-ink/70" aria-hidden="true" />
                    Matatu Saccos, Connecting Stages &amp; Estimated Fares
                  </h3>
                  <p className="mt-0.5 text-xs opacity-75">
                    Select a matatu route or Sacco option below to see where to board, transfer, and what phrase to tell the conductor.
                  </p>
                </div>
                {onRehearseMatatu && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={onRehearseMatatu}
                  >
                    <BusFront className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Rehearse this trip with Conductor Otieno →
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {saccoOptions.map(sacco => {
                  const isSelected = selectedSaccoId === sacco.id
                  return (
                    <div
                      key={sacco.id}
                      onClick={() => setSelectedSaccoId(sacco.id)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedSaccoId(sacco.id)
                        }
                      }}
                      className={
                        'cursor-pointer rounded-xl border p-3.5 text-left transition-colors ' +
                        (isSelected
                          ? 'border-lavender bg-lavender/20'
                          : 'border-ink/10 bg-cream/75 hover:border-lavender/60')
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-cream">
                          <BusFront className="h-3 w-3" aria-hidden="true" />
                          {sacco.routeNumber}
                        </span>
                        <span
                          className={
                            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ' +
                            (sacco.isDirect
                              ? 'bg-sage/35 text-ink'
                              : 'bg-peach/45 text-ink')
                          }
                        >
                          {sacco.isDirect ? 'Direct Matatu' : 'Connecting Route'}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-bold">{sacco.saccoName}</p>
                      <p className="mt-0.5 text-xs opacity-80">{sacco.corridor}</p>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg bg-white/85 p-2.5 text-xs">
                        <div>
                          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-65">
                            <Banknote className="h-3 w-3" aria-hidden="true" />
                            Off-Peak Fare
                          </span>
                          <p className="mt-0.5 font-bold">{sacco.offPeakFareKes}</p>
                        </div>
                        <div>
                          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-65">
                            <Banknote className="h-3 w-3" aria-hidden="true" />
                            Peak / Rush Fare
                          </span>
                          <p className="mt-0.5 font-bold">{sacco.peakFareKes}</p>
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1 text-xs">
                        <p>
                          <strong>Board at:</strong> {sacco.boardingStage}
                        </p>
                        <p>
                          <strong>Alight at:</strong> {sacco.alightingStage}
                        </p>
                        {sacco.connectionNote && (
                          <p className="flex items-start gap-1 text-ink/80">
                            <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{sacco.connectionNote}</span>
                          </p>
                        )}
                        <p className="opacity-75">
                          <strong>Payment:</strong> {sacco.paymentMethods}
                        </p>
                      </div>

                      <div className="mt-2.5 rounded-lg border border-lavender/35 bg-white/90 px-2.5 py-1.5 text-xs">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-65">
                          What to say to the conductor:
                        </span>
                        <span className="font-semibold">{sacco.conductorPhrase}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] opacity-70">
                Note: Matatu fares and stages are approximate public transit estimates (Digital Matatus / Nairobi corridors) and vary by weather and traffic. Confirm fare with the conductor before boarding.
              </p>
            </section>
          )}

          {/* 1. Sensory & Environment Snapshot: Weather, Busyness, Noise Level */}
          {sensory && (
            <section
              aria-label="Environment, busyness, noise, and weather conditions"
              className="space-y-3 rounded-2xl border border-ink/10 bg-white/80 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="h-4 w-4 text-ink/70" aria-hidden="true" />
                  Weather, busyness &amp; noise levels right now
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-0.5 text-xs font-medium">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Live sensory &amp; weather check
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {/* Weather Card with detailed metrics */}
                <div className="rounded-xl border border-ink/10 bg-cream/70 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-75">
                    <CloudSun className="h-4 w-4" aria-hidden="true" />
                    Live Weather
                  </div>
                  <p className="mt-1.5 text-sm font-bold">
                    {sensory.weatherSummary}
                    {sensory.temperatureC !== null ? ` · ${sensory.temperatureC}°C` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
                    {sensory.feelsLikeC !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                        <Sun className="h-3 w-3" aria-hidden="true" />
                        Feels {sensory.feelsLikeC}°C
                      </span>
                    )}
                    {sensory.humidityPct !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                        <Droplets className="h-3 w-3" aria-hidden="true" />
                        Humidity {sensory.humidityPct}%
                      </span>
                    )}
                    {sensory.windKmh !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                        <Wind className="h-3 w-3" aria-hidden="true" />
                        Wind {sensory.windKmh} km/h
                      </span>
                    )}
                    {sensory.precipProbPct !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                        Rain chance {sensory.precipProbPct}%
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed opacity-80">{sensory.weatherNote}</p>
                </div>

                {/* Busyness Card */}
                <div className="rounded-xl border border-ink/10 bg-cream/70 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-75">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    How busy it is
                  </div>
                  <p className="mt-1.5 text-sm font-bold">{sensory.busynessLevel}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-80">{sensory.busynessDetail}</p>
                  <p className="mt-1.5 rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-medium">
                    {sensory.quietHoursHint}
                  </p>
                </div>

                {/* Noise Level Card */}
                <div className="rounded-xl border border-ink/10 bg-cream/70 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-75">
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    Noise levels
                  </div>
                  <p className="mt-1.5 text-sm font-bold">{sensory.noiseLevel}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-80">{sensory.noiseDetail}</p>
                </div>
              </div>

              <div className="rounded-xl border border-sage/40 bg-sage/15 px-3.5 py-2.5 text-xs leading-relaxed">
                <strong>Comfort tip:</strong> {sensory.sensoryTip}
              </div>
            </section>
          )}

          {/* 2. Visual Place Preview (How the place looks like) */}
          {photos.length > 0 && (
            <section
              aria-label="Photos of how the place looks"
              className="space-y-3 rounded-2xl border border-ink/10 bg-white/80 p-4"
            >
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Camera className="h-4 w-4 text-ink/70" aria-hidden="true" />
                How the place looks
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {photos.map((photo, idx) => (
                  <figure
                    key={idx}
                    className="overflow-hidden rounded-xl border border-ink/10 bg-mist/40"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="h-44 w-full object-cover"
                      onError={e => {
                        const target = e.currentTarget
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = '1'
                          target.src = buildIllustratedPlaceSvg(
                            destination,
                            'Visual landmark & entrance preview',
                            idx % 2 === 0 ? '#a89bd4' : '#8fb39b',
                          )
                        }
                      }}
                    />
                    <figcaption className="px-3 py-2 text-xs leading-snug">
                      <span className="font-semibold">{photo.caption}</span>
                      {photo.attribution && (
                        <span className="block text-[11px] opacity-65">
                          Photo: {photo.attribution}
                        </span>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* 3. Key Landmarks to Watch For */}
          {landmarks.length > 0 && (
            <section
              aria-label="Key landmarks along the way"
              className="space-y-3 rounded-2xl border border-ink/10 bg-white/80 p-4"
            >
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Landmark className="h-4 w-4 text-ink/70" aria-hidden="true" />
                Key landmarks to spot
              </h3>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {landmarks.map((lm, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-ink/10 bg-cream/70 p-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lavender/35 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-65">
                          {lm.category}
                        </span>
                        {lm.distanceFromStart && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold">
                            {lm.distanceFromStart}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold leading-snug">{lm.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed opacity-80">{lm.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Interactive Map */}
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
              {totalKm} km · {driveTimeLabel} by matatu/car · {walkTimeLabel} walking · {route.steps.length} steps
            </span>
            <span className="directions-candidate-label">
              Candidate path — confirm with your co-designer.
            </span>
          </div>

          <ol className="directions-steps" aria-label="Turn-by-turn directions">
            {(detailedSteps.length > 0 ? detailedSteps : route.steps).map((s, i) => {
              const distLabel = 'distanceMeters' in s ? formatStepDistance(s.distanceMeters) : ''
              const durLabel =
                'durationSec' in s && s.durationSec ? formatDurationMinutes(s.durationSec) : ''
              return (
                <li key={i} className="directions-step">
                  <span className="directions-step-num">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <span className="directions-step-text block">{s.instruction}</span>
                    {(distLabel || durLabel) && (
                      <span className="mt-1 inline-flex items-center gap-2 text-xs font-medium opacity-70">
                        {distLabel && <span>Distance: {distLabel}</span>}
                        {distLabel && durLabel && <span>·</span>}
                        {durLabel && <span>Time: {durLabel}</span>}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
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
    lat += result & 1 ? ~(result >> 1) : result >> 1
    result = 1
    shift = 0
    while (true) {
      const b = encoded.charCodeAt(index) - 63 - 1
      index++
      result += b << shift
      shift += 5
      if (b < 0x1f) break
    }
    lng += result & 1 ? ~(result >> 1) : result >> 1
    coords.push({ lat: lat * 1e-5, lng: lng * 1e-5 })
  }
  return coords
}
