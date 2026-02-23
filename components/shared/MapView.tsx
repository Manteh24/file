"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

const NeshanMapView = dynamic(
  () => import("./NeshanMapView").then((m) => ({ default: m.NeshanMapView })),
  { ssr: false }
)

interface MapViewProps {
  lat: number
  lng: number
  height?: string
}

export function MapView({ lat, lng, height = "h-48" }: MapViewProps) {
  // Render the map only after client hydration to avoid SSR/client ID mismatch.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className={`${height} w-full rounded-lg overflow-hidden border`}>
      {mounted ? (
        <NeshanMapView lat={lat} lng={lng} />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
          در حال بارگذاری نقشه...
        </div>
      )}
    </div>
  )
}
