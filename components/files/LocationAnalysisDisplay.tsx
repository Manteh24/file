import type { LocationAnalysis } from "@/types"

interface LocationAnalysisDisplayProps {
  analysis: LocationAnalysis | null
}

const categoryLabels: Record<string, string> = {
  transit: "حمل‌ونقل",
  school: "مدرسه",
  park: "پارک",
  hospital: "بیمارستان",
  shop: "فروشگاه",
  other: "سایر",
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} کیلومتر`
  }
  return `${Math.round(meters)} متر`
}

export function LocationAnalysisDisplay({ analysis }: LocationAnalysisDisplayProps) {
  if (!analysis) return null

  const hasTransitTime = analysis.transitWalkingMinutes !== undefined
  const hasAirportTime = analysis.airportDrivingMinutes !== undefined
  const hasPOIs = analysis.nearbyPOIs.length > 0

  if (!hasTransitTime && !hasAirportTime && !hasPOIs) return null

  const displayPOIs = analysis.nearbyPOIs.slice(0, 5)

  return (
    <div className="mt-3 space-y-3">
      {/* Transport times */}
      {(hasTransitTime || hasAirportTime) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {hasTransitTime && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <span>🚶</span>
              پیاده‌روی تا ایستگاه حمل‌ونقل:{" "}
              <span className="font-medium text-foreground">
                {analysis.transitWalkingMinutes?.toLocaleString("fa-IR")} دقیقه
              </span>
            </span>
          )}
          {hasAirportTime && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <span>✈️</span>
              فاصله تا فرودگاه با ماشین:{" "}
              <span className="font-medium text-foreground">
                {analysis.airportDrivingMinutes?.toLocaleString("fa-IR")} دقیقه
              </span>
            </span>
          )}
        </div>
      )}

      {/* Nearby POI chips */}
      {hasPOIs && (
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">مکان‌های اطراف</p>
          <div className="flex flex-wrap gap-1.5">
            {displayPOIs.map((poi, i) => (
              <span
                key={i}
                className="rounded-full border bg-accent px-2.5 py-0.5 text-xs"
                title={`${categoryLabels[poi.category] ?? poi.category} · ${formatDistance(poi.distance)}`}
              >
                {poi.title}
                <span className="mr-1 text-muted-foreground">({formatDistance(poi.distance)})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
