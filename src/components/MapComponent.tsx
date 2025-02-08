"use client"

import { useEffect, useRef } from "react"
import { useSearch } from "@/contexts/SearchContext"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const { searchResults } = useSearch()

  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v10",
        center: [100.5018, 13.7563], // Bangkok coordinates
        zoom: 11,
      })
    }

    // Add markers for search results
    if (map.current) {
      searchResults.forEach((dispensary) => {
        new mapboxgl.Marker().setLngLat([dispensary.location.lng, dispensary.location.lat]).addTo(map.current!)
      })
    }
  }, [searchResults])

  return (
    <div className="relative h-[600px]">
      <div ref={mapContainer} className="w-full h-full" />
      <Button className="absolute top-4 right-4 bg-white text-black hover:bg-gray-100" variant="outline">
        <MapPin className="w-4 h-4 mr-2" />
        USE CURRENT LOCATION
      </Button>
    </div>
  )
}

