"use client"

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { useEffect, useRef } from "react"
import { MapComponent } from "@neshan-maps-platform/mapbox-gl-react"
import { Marker } from "@neshan-maps-platform/mapbox-gl"
import "@neshan-maps-platform/mapbox-gl/dist/NeshanMapboxGl.css"
// Import SDKMap type directly from the Neshan package to avoid @types/mapbox-gl version conflicts
import type SDKMap from "@neshan-maps-platform/mapbox-gl/dist/src/core/Map"

interface NeshanMapPickerProps {
  initialLat?: number
  initialLng?: number
  onPinDrop: (lat: number, lng: number) => void
}

// Default center: Tehran
const DEFAULT_LAT = 35.6892
const DEFAULT_LNG = 51.389

export function NeshanMapPicker({ initialLat, initialLng, onPinDrop }: NeshanMapPickerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)

  const centerLat = initialLat ?? DEFAULT_LAT
  const centerLng = initialLng ?? DEFAULT_LNG

  function handleMapSetter(map: SDKMap) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map as any

    const addInitialMarker = () => {
      if (initialLat !== undefined && initialLng !== undefined) {
        markerRef.current = new Marker({ color: "#ef4444" }).setLngLat([initialLng, initialLat]).addTo(m)
      }
    }

    // Wait for map load before placing the initial marker — mapSetter may fire before tiles are ready
    if (m.loaded()) {
      addInitialMarker()
    } else {
      m.once("load", addInitialMarker)
    }

    // Drop or move marker on click — map is already loaded by the time the user clicks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    m.on("click", (e: any) => {
      const { lat, lng } = e.lngLat

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat])
      } else {
        markerRef.current = new Marker({ color: "#ef4444" }).setLngLat([lng, lat]).addTo(m)
      }

      onPinDrop(lat, lng)
    })
  }

  // Clean up marker on unmount
  useEffect(() => {
    return () => {
      markerRef.current?.remove()
    }
  }, [])

  return (
    <MapComponent
      options={{
        mapKey: process.env.NEXT_PUBLIC_NESHAN_MAP_KEY ?? "",
        mapType: "neshanVector",
        isTouchPlatform: true,
        center: [centerLng, centerLat],
        zoom: 14,
      }}
      style={{ width: "100%", height: "100%" }}
      mapSetter={handleMapSetter}
    />
  )
}
