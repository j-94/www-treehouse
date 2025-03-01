"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Use a default Mapbox token for testing
// For production, use your own token via env variables
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoibnJlaGRlciIsImEiOiJja3R4Y3diNmIwMTJiMm9wZDhjNjljOXZiIn0.kJ0iJldz_3IKrtwGEfql1A"

console.log("Mapbox token:", mapboxgl.accessToken ? "Token is set" : "Token is not set")

interface MapMarker {
  lat: number
  lng: number
  id: string
  name: string
}

interface ClientSideMapContainerProps {
  markers: MapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  onMarkerClick: (id: string) => void
  onMarkerHover: (id: string) => void
  onMarkerLeave: () => void
}

const MARKER_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 22s-8-6-8-12c0-5 4-8 8-8s8 3 8 8c0 6-8 12-8 12z" fill="#22c55e"/>
  <path d="M12 13a3 3 0 100-6 3 3 0 000 6z" fill="white"/>
</svg>
`

export function ClientSideMapContainer({
  markers,
  center = { lat: 13.7563, lng: 100.5018 },
  zoom = 15,
  onMarkerClick,
  onMarkerHover,
  onMarkerLeave,
}: ClientSideMapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({})
  const [error, setError] = useState<string | null>(null)

  const initializeMap = useCallback(async () => {
    if (!mapContainer.current || map.current) return

    console.log("Initializing map...")
    console.log("Map container exists:", !!mapContainer.current)

    try {
      if (!mapboxgl.accessToken) {
        throw new Error("Mapbox token is not configured")
      }

      console.log(`Initializing map at [${center.lng}, ${center.lat}] with zoom ${zoom}`)
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [center.lng, center.lat],
        zoom: zoom,
      })

      // Add map initialization event listeners
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e.error)
        setError(`Mapbox error: ${e.error?.message || 'Unknown error'}`)
      })

      map.current.on('load', () => {
        console.log('Map loaded successfully')
      })

      map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right")

      console.log("Waiting for map to load...")
      await new Promise((resolve) => map.current?.on("load", resolve))
      console.log("Map loaded")

      const style = document.createElement("style")
      style.textContent = `
        .mapboxgl-map {
          font-family: system-ui, sans-serif;
        }
        .custom-marker {
          transition: transform 0.2s;
          position: relative;
        }
        .custom-marker:hover {
          transform: scale(1.2);
        }
      `
      document.head.appendChild(style)
    } catch (err) {
      console.error("Error initializing map:", err)
      setError(err instanceof Error ? err.message : "An error occurred while loading the map")
    }
  }, [center.lat, center.lng, zoom])

  const updateMarkers = useCallback(() => {
    if (!map.current) return

    console.log('Updating markers:', markers.length)
    
    const newMarkers: { [id: string]: mapboxgl.Marker } = {}

    markers.forEach(({ lat, lng, id, name }) => {
      console.log(`Creating marker: ${id} - ${name} at [${lng}, ${lat}]`)
      
      if (markersRef.current[id]) {
        newMarkers[id] = markersRef.current[id]
        newMarkers[id].setLngLat([lng, lat])
      } else {
        const el = document.createElement("div")
        el.className = "custom-marker"
        el.innerHTML = MARKER_SVG
        el.style.width = "24px"
        el.style.height = "24px"
        el.style.cursor = "pointer"

        // Add a text element for debugging
        const label = document.createElement("div")
        label.className = "marker-label"
        label.textContent = name
        label.style.position = "absolute"
        label.style.top = "24px"
        label.style.left = "0"
        label.style.whiteSpace = "nowrap"
        label.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
        label.style.color = "white"
        label.style.padding = "2px 5px"
        label.style.borderRadius = "3px"
        label.style.transform = "translateX(-50%)"
        label.style.display = "none"
        el.appendChild(label)

        // Show label on hover
        el.addEventListener("mouseenter", () => {
          label.style.display = "block"
        })
        el.addEventListener("mouseleave", () => {
          label.style.display = "none"
        })

        try {
          const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current!)

          el.addEventListener("click", () => onMarkerClick(id))
          el.addEventListener("mouseenter", () => onMarkerHover(id))
          el.addEventListener("mouseleave", onMarkerLeave)

          newMarkers[id] = marker
        } catch (error) {
          console.error(`Failed to create marker for ${id} at [${lng}, ${lat}]:`, error)
        }
      }
    })

    // Remove markers that are no longer in the data
    Object.keys(markersRef.current).forEach((id) => {
      if (!newMarkers[id]) {
        markersRef.current[id].remove()
      }
    })

    markersRef.current = newMarkers

    if (markers.length > 0) {
      try {
        const bounds = new mapboxgl.LngLatBounds()
        markers.forEach(({ lat, lng }) => bounds.extend([lng, lat]))
        map.current.fitBounds(bounds, { padding: 50, maxZoom: zoom })
      } catch (error) {
        console.error('Error fitting bounds:', error)
        // Fall back to center and zoom if bounds fitting fails
        map.current.setCenter([center.lng, center.lat]).setZoom(zoom)
      }
    }
  }, [markers, onMarkerClick, onMarkerHover, onMarkerLeave, zoom, center])

  // Initialize the map
  useEffect(() => {
    console.log("Map initialization effect running...")
    initializeMap()

    return () => {
      console.log("Cleaning up map...")
      map.current?.remove()
      map.current = null
    }
  }, [initializeMap])

  // Add markers only after map is initialized
  useEffect(() => {
    if (!map.current) {
      console.log("Map not initialized yet, can't add markers")
      return
    }
    
    console.log("Map is initialized, adding markers...")
    
    // Wait a bit to make sure map is fully loaded
    const timer = setTimeout(() => {
      updateMarkers()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [map.current, updateMarkers])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (map.current) {
        console.log("Resizing map...")
        map.current.resize()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return <div ref={mapContainer} className="w-full h-[calc(100vh-4rem)]" />
}

