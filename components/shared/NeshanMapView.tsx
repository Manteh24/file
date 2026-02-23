"use client"

import { useEffect, useRef } from "react"
import { MapComponent } from "@neshan-maps-platform/mapbox-gl-react"
import { Marker } from "@neshan-maps-platform/mapbox-gl"
import "@neshan-maps-platform/mapbox-gl/dist/NeshanMapboxGl.css"
// Import SDKMap type directly from the Neshan package to avoid @types/mapbox-gl version conflicts
import type SDKMap from "@neshan-maps-platform/mapbox-gl/dist/src/core/Map"

interface NeshanMapViewProps {
  lat: number
  lng: number
}

export function NeshanMapView({ lat, lng }: NeshanMapViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)

  function handleMapSetter(map: SDKMap) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markerRef.current = new Marker({ color: "#ef4444" }).setLngLat([lng, lat]).addTo(map as any)
  }

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
        center: [lng, lat],
        zoom: 15,
      }}
      style={{ width: "100%", height: "100%" }}
      mapSetter={handleMapSetter}
    />
  )
}
