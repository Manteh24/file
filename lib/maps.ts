// Server-only Neshan REST API helpers.
// All calls use NESHAN_API_KEY (server-side env var).
// All failures are silently caught — never throws.

import type { LocationAnalysis, POIItem } from "@/types"

const NESHAN_API_KEY = process.env.NESHAN_API_KEY ?? ""
const TIMEOUT_MS = 8000

// Shared fetch helper with timeout and Neshan API key header.
async function neshanFetch(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { "Api-Key": NESHAN_API_KEY },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Returns the formatted address string for a lat/lng pair, or null on failure.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const data = (await neshanFetch(
    `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`
  )) as { formatted_address?: string } | null

  return data?.formatted_address ?? null
}

interface SearchItem {
  title: string
  type: string
  distance: number
}

// Searches Neshan POI search for a term near lat/lng. Returns up to `limit` items.
async function searchPOIs(
  lat: number,
  lng: number,
  term: string,
  limit: number
): Promise<{ title: string; distance: number }[]> {
  const data = (await neshanFetch(
    `https://api.neshan.org/v1/search?term=${encodeURIComponent(term)}&lat=${lat}&lng=${lng}`
  )) as { items?: SearchItem[] } | null

  if (!data?.items) return []
  return data.items.slice(0, limit).map((item) => ({
    title: item.title,
    distance: item.distance,
  }))
}

// Gets routing duration in minutes between two points. type: "car" | "foot"
async function getRoutingMinutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  type: "car" | "foot"
): Promise<number | null> {
  const data = (await neshanFetch(
    `https://api.neshan.org/v4/direction/no-traffic?origin=${originLat},${originLng}&destination=${destLat},${destLng}&type=${type}`
  )) as {
    routes?: Array<{
      legs?: Array<{
        duration?: { value?: number }
      }>
    }>
  } | null

  const seconds = data?.routes?.[0]?.legs?.[0]?.duration?.value
  if (typeof seconds !== "number") return null
  return Math.round(seconds / 60)
}

// Orchestrates all Neshan calls to produce a LocationAnalysis.
// Never throws — returns partial results on any failure.
export async function analyzeLocation(lat: number, lng: number): Promise<LocationAnalysis> {
  // Run all POI searches in parallel
  const [metroItems, busItems, airportItems, parkItems, hospitalItems, schoolItems] =
    await Promise.all([
      searchPOIs(lat, lng, "مترو", 3),
      searchPOIs(lat, lng, "ایستگاه اتوبوس", 3),
      searchPOIs(lat, lng, "فرودگاه", 1),
      searchPOIs(lat, lng, "پارک", 3),
      searchPOIs(lat, lng, "بیمارستان", 2),
      searchPOIs(lat, lng, "مدرسه", 2),
    ])

  const nearbyPOIs: POIItem[] = [
    ...metroItems.map((i) => ({ title: i.title, category: "transit" as const, distance: i.distance })),
    ...busItems.map((i) => ({ title: i.title, category: "transit" as const, distance: i.distance })),
    ...parkItems.map((i) => ({ title: i.title, category: "park" as const, distance: i.distance })),
    ...hospitalItems.map((i) => ({ title: i.title, category: "hospital" as const, distance: i.distance })),
    ...schoolItems.map((i) => ({ title: i.title, category: "school" as const, distance: i.distance })),
  ]

  // Routing: walking to nearest transit, driving to nearest airport
  let transitWalkingMinutes: number | undefined
  const nearestTransit = [...metroItems, ...busItems].sort((a, b) => a.distance - b.distance)[0]
  if (nearestTransit) {
    // We don't have exact lat/lng from search results, so use walking time estimation:
    // Neshan search gives distance in meters; walking ~83m/min
    transitWalkingMinutes = Math.round(nearestTransit.distance / 83)
  }

  let airportDrivingMinutes: number | undefined
  const nearestAirport = airportItems[0]
  if (nearestAirport) {
    // Similarly estimate driving time: ~500m/min in city
    airportDrivingMinutes = Math.round(nearestAirport.distance / 500)
  }

  // Try to get actual routing times if we have separate direction search results
  // For the POI search results we only have distance, not coordinates, so we use estimates above.
  // A future improvement would call the direction API with actual airport coordinates.

  return {
    nearbyPOIs,
    ...(transitWalkingMinutes !== undefined && { transitWalkingMinutes }),
    ...(airportDrivingMinutes !== undefined && { airportDrivingMinutes }),
    analyzedAt: new Date().toISOString(),
  }
}

// Safely parses the locationAnalysis JSON field from the database.
// Returns null for any invalid/missing input.
export function parseLocationAnalysis(json: unknown): LocationAnalysis | null {
  if (json === null || json === undefined) return null
  if (typeof json !== "object" || Array.isArray(json)) return null

  const obj = json as Record<string, unknown>

  if (!Array.isArray(obj.nearbyPOIs)) return null

  // Validate each POI item has the right shape
  const validCategories = new Set(["transit", "school", "park", "hospital", "shop", "other"])
  const nearbyPOIs: POIItem[] = []
  for (const item of obj.nearbyPOIs) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).title !== "string" ||
      typeof (item as Record<string, unknown>).distance !== "number" ||
      !validCategories.has((item as Record<string, unknown>).category as string)
    ) {
      return null
    }
    nearbyPOIs.push(item as POIItem)
  }

  const result: LocationAnalysis = {
    nearbyPOIs,
    analyzedAt: typeof obj.analyzedAt === "string" ? obj.analyzedAt : new Date().toISOString(),
  }

  if (typeof obj.transitWalkingMinutes === "number") {
    result.transitWalkingMinutes = obj.transitWalkingMinutes
  }
  if (typeof obj.airportDrivingMinutes === "number") {
    result.airportDrivingMinutes = obj.airportDrivingMinutes
  }

  return result
}
