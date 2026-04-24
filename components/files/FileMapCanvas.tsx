"use client"

import { useEffect, useRef, useState } from "react"
import { MapComponent } from "@neshan-maps-platform/mapbox-gl-react"
import { Marker } from "@neshan-maps-platform/mapbox-gl"
import "@neshan-maps-platform/mapbox-gl/dist/NeshanMapboxGl.css"
import type SDKMap from "@neshan-maps-platform/mapbox-gl/dist/src/core/Map"

export interface FileMapPin {
  id: string
  lat: number
  lng: number
}

interface FileMapCanvasProps {
  pins: FileMapPin[]
  activeFileId: string | null
  hoveredFileId: string | null
  onPinClick: (id: string) => void
  onBackgroundClick: () => void
  popupContent: React.ReactNode
}

const DEFAULT_LAT = 35.6892
const DEFAULT_LNG = 51.389

export function FileMapCanvas({
  pins,
  activeFileId,
  hoveredFileId,
  onPinClick,
  onBackgroundClick,
  popupContent,
}: FileMapCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, { marker: any; el: HTMLDivElement }>>(new Map())
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null)
  const activeIdRef = useRef<string | null>(null)

  // Kept current so marker click handlers close over latest callback
  const onPinClickRef = useRef(onPinClick)
  onPinClickRef.current = onPinClick

  activeIdRef.current = activeFileId

  function buildPinElement(isActive: boolean): HTMLDivElement {
    const el = document.createElement("div")
    el.className = "file-map-pin"
    el.style.width = isActive ? "20px" : "16px"
    el.style.height = isActive ? "20px" : "16px"
    el.style.borderRadius = "9999px"
    el.style.background = isActive ? "#0d9488" : "#14b8a6"
    el.style.border = isActive ? "3px solid #ffffff" : "2px solid #ffffff"
    el.style.boxShadow = isActive
      ? "0 0 0 3px rgba(13, 148, 136, 0.35), 0 2px 6px rgba(0,0,0,0.25)"
      : "0 2px 4px rgba(0,0,0,0.25)"
    el.style.cursor = "pointer"
    el.style.transition = "transform 120ms ease"
    return el
  }

  function applyPinVisual(id: string) {
    const entry = markersRef.current.get(id)
    if (!entry) return
    const isActive = id === activeIdRef.current
    const isHover = id === hoveredFileId
    entry.el.style.width = isActive ? "20px" : "16px"
    entry.el.style.height = isActive ? "20px" : "16px"
    entry.el.style.background = isActive ? "#0d9488" : "#14b8a6"
    entry.el.style.border = isActive ? "3px solid #ffffff" : "2px solid #ffffff"
    entry.el.style.boxShadow = isActive
      ? "0 0 0 3px rgba(13, 148, 136, 0.35), 0 2px 6px rgba(0,0,0,0.25)"
      : "0 2px 4px rgba(0,0,0,0.25)"
    entry.el.style.transform = isHover && !isActive ? "scale(1.25)" : "scale(1)"
    entry.el.style.zIndex = isActive ? "3" : isHover ? "2" : "1"
  }

  function updatePopupPosition() {
    const map = mapRef.current
    const id = activeIdRef.current
    if (!map || !id) {
      setPopupPos(null)
      return
    }
    const pin = pins.find((p) => p.id === id)
    if (!pin) {
      setPopupPos(null)
      return
    }
    const point = map.project([pin.lng, pin.lat])
    setPopupPos({ x: point.x, y: point.y })
  }

  function handleMapSetter(map: SDKMap) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map as any
    mapRef.current = m

    const ready = () => {
      // Clear any previous markers (defensive in case setter fires twice)
      markersRef.current.forEach(({ marker }) => marker.remove())
      markersRef.current.clear()

      for (const pin of pins) {
        const el = buildPinElement(pin.id === activeIdRef.current)
        el.addEventListener("click", (ev) => {
          ev.stopPropagation()
          onPinClickRef.current(pin.id)
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker = new (Marker as any)({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(m)
        markersRef.current.set(pin.id, { marker, el })
      }

      // Fit to pins if any, else keep Tehran default
      if (pins.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const LngLatBounds = (window as any).mapboxgl?.LngLatBounds
          if (LngLatBounds && pins.length > 1) {
            const b = new LngLatBounds([pins[0].lng, pins[0].lat], [pins[0].lng, pins[0].lat])
            for (const p of pins) b.extend([p.lng, p.lat])
            m.fitBounds(b, { padding: 60, duration: 0, maxZoom: 15 })
          } else if (pins.length === 1) {
            m.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 14, duration: 0 })
          }
        } catch {
          m.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 13, duration: 0 })
        }
      }

      m.on("move", updatePopupPosition)
      m.on("zoom", updatePopupPosition)
      // Clicks on empty map dismiss popup
      m.on("click", () => onBackgroundClick())

      // Initial position in case a pin is already active
      updatePopupPosition()
    }

    if (m.loaded()) ready()
    else m.once("load", ready)
  }

  // React to pin list changes (filters applied) — rebuild markers
  useEffect(() => {
    const m = mapRef.current
    if (!m) return
    markersRef.current.forEach(({ marker }) => marker.remove())
    markersRef.current.clear()

    for (const pin of pins) {
      const el = buildPinElement(pin.id === activeIdRef.current)
      el.addEventListener("click", (ev) => {
        ev.stopPropagation()
        onPinClickRef.current(pin.id)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker = new (Marker as any)({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(m)
      markersRef.current.set(pin.id, { marker, el })
    }
    updatePopupPosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins])

  // Visual sync for active/hover changes
  useEffect(() => {
    markersRef.current.forEach((_, id) => applyPinVisual(id))
    updatePopupPosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, hoveredFileId])

  // Fly to active file when it changes (user clicked a card)
  useEffect(() => {
    const m = mapRef.current
    if (!m || !activeFileId) return
    const pin = pins.find((p) => p.id === activeFileId)
    if (!pin) return
    m.flyTo({ center: [pin.lng, pin.lat], duration: 350, speed: 1.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId])

  useEffect(() => {
    const markers = markersRef.current
    return () => {
      markers.forEach(({ marker }) => marker.remove())
      markers.clear()
    }
  }, [])

  const firstLat = pins[0]?.lat ?? DEFAULT_LAT
  const firstLng = pins[0]?.lng ?? DEFAULT_LNG

  return (
    <div className="relative h-full w-full" style={{ direction: "ltr" }}>
      <MapComponent
        options={{
          mapKey: process.env.NEXT_PUBLIC_NESHAN_MAP_KEY ?? "",
          mapType: "neshanVector",
          isTouchPlatform: true,
          center: [firstLng, firstLat],
          zoom: pins.length > 0 ? 12 : 11,
        }}
        style={{ width: "100%", height: "100%" }}
        mapSetter={handleMapSetter}
      />
      {popupPos && activeFileId ? (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: popupPos.x,
            top: popupPos.y,
            transform: "translate(-50%, calc(-100% - 20px))",
          }}
        >
          <div className="pointer-events-auto">{popupContent}</div>
        </div>
      ) : null}
    </div>
  )
}
