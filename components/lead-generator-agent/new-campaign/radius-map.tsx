"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import { bbox, circle, point } from "@turf/turf"
import "mapbox-gl/dist/mapbox-gl.css"

import { LoaderCircle, MapPinned } from "lucide-react"

type LngLatTuple = [number, number]

const DEFAULT_CENTER: LngLatTuple = [-104.9903, 39.7392]
const CIRCLE_SOURCE_ID = "campaign-radius-circle"

type RadiusMapProps = {
  lng: number | null
  lat: number | null
  radiusMiles: number
  addressLabel: string
}

function RadiusMapInner({
  lng,
  lat,
  radiusMiles,
  addressLabel,
}: RadiusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const latestCenterRef = useRef<LngLatTuple>(DEFAULT_CENTER)
  const latestRadiusRef = useRef<number>(radiusMiles)
  const [mapReady, setMapReady] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  const centerLng = lng
  const centerLat = lat
  const hasLocation = centerLng !== null && centerLat !== null

  useEffect(() => {
    latestCenterRef.current = centerLng !== null && centerLat !== null ? [centerLng, centerLat] : DEFAULT_CENTER
    latestRadiusRef.current = radiusMiles
  }, [centerLng, centerLat, radiusMiles])

  const fitToCircle = useCallback((map: mapboxgl.Map, targetCenter: LngLatTuple, targetRadius: number) => {
    const radiusGeoJson = circle(point(targetCenter), targetRadius, {
      units: "miles",
      steps: 72,
    })

    const [minLng, minLat, maxLng, maxLat] = bbox(radiusGeoJson)
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: 52,
        duration: 800,
        maxZoom: 15,
      }
    )
  }, [])

  const updateMapRadius = useCallback((targetCenter: LngLatTuple, targetRadius: number) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const radiusGeoJson = circle(point(targetCenter), targetRadius, {
      units: "miles",
      steps: 72,
    })

    const source = map.getSource(CIRCLE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(radiusGeoJson as any)
    }

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({
        color: "#0284c7",
        scale: 1.05,
      })
        .setLngLat(targetCenter)
        .addTo(map)
    } else {
      markerRef.current.setLngLat(targetCenter)
    }

    fitToCircle(map, targetCenter, targetRadius)
  }, [fitToCircle])

  useEffect(() => {
    if (!token || !mapContainerRef.current || mapRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: 11,
      attributionControl: false,
      pitchWithRotate: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")
    mapRef.current = map

    map.on("load", () => {
      map.addSource(CIRCLE_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      })

      map.addLayer({
        id: `${CIRCLE_SOURCE_ID}-fill`,
        type: "fill",
        source: CIRCLE_SOURCE_ID,
        paint: {
          "fill-color": "#0ea5e9",
          "fill-opacity": 0.14,
        },
      })

      map.addLayer({
        id: `${CIRCLE_SOURCE_ID}-line`,
        type: "line",
        source: CIRCLE_SOURCE_ID,
        paint: {
          "line-color": "#0284c7",
          "line-width": 3,
          "line-opacity": 0.92,
        },
      })

      if (latestCenterRef.current) {
        updateMapRadius(latestCenterRef.current, latestRadiusRef.current)
      }

      setMapReady(true)
    })

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [token, updateMapRadius])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || centerLng === null || centerLat === null) return

    const targetCenter: LngLatTuple = [centerLng, centerLat]

    setMapLoading(true)
    map.flyTo({
      center: targetCenter,
      duration: 650,
      essential: true,
    })

    const timeout = setTimeout(() => {
      updateMapRadius(targetCenter, radiusMiles)
      setMapLoading(false)
    }, 120)

    return () => clearTimeout(timeout)
  }, [centerLng, centerLat, radiusMiles, mapReady, updateMapRadius])

  const locationLabel = useMemo(() => {
    if (addressLabel.trim()) return addressLabel
    return "Select an exact address"
  }, [addressLabel])

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-sky-50/60 p-4">
        <div className="text-sm font-medium text-slate-900">{locationLabel}</div>
        <div className="mt-1 text-sm text-slate-500">{radiusMiles} mile radius</div>
      </div>

      <div className="relative min-h-[420px] bg-slate-50">
        <div ref={mapContainerRef} className="h-[460px] w-full" />

        {!hasLocation && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/68">
            <div className="text-center text-slate-500">
              <MapPinned className="mx-auto h-8 w-8" />
              <div className="mt-3 text-sm">Choose an address to place the radius.</div>
            </div>
          </div>
        )}

        {mapLoading && (
          <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-2 text-sm text-slate-700 shadow-sm">
            <div className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Updating map
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 rounded-full bg-white/92 px-4 py-2 text-sm text-slate-700 shadow-sm">
          Radius · {radiusMiles} mi
        </div>
      </div>
    </div>
  )
}

export const RadiusMap = memo(RadiusMapInner, (prev, next) => {
  return (
    prev.lng === next.lng &&
    prev.lat === next.lat &&
    prev.radiusMiles === next.radiusMiles &&
    prev.addressLabel === next.addressLabel
  )
})
