"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

// No loading prop here — the mounted guard below controls what's shown,
// ensuring server and client initial renders match (both show the placeholder div).
const NeshanMapPicker = dynamic(
  () => import("./NeshanMapPicker").then((m) => ({ default: m.NeshanMapPicker })),
  { ssr: false }
)

interface LocationPickerProps {
  lat?: number
  lng?: number
  onPinDrop: (lat: number, lng: number) => void
}

export function LocationPicker({ lat, lng, onPinDrop }: LocationPickerProps) {
  // Render the map only after client hydration to avoid SSR/client ID mismatch.
  // useState(false) + useEffect ensures server and client initial renders produce
  // identical HTML (both show the loading placeholder), then the map appears post-hydration.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border">
      {mounted ? (
        <NeshanMapPicker initialLat={lat} initialLng={lng} onPinDrop={onPinDrop} />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted/30 text-sm text-muted-foreground">
          در حال بارگذاری نقشه...
        </div>
      )}
    </div>
  )
}
