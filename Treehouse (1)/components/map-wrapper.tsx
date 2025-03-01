"use client"

import { useCallback, useEffect } from "react"
import { ClientSideMapContainer } from "@/components/ClientSideMapContainer"

interface MapMarker {
  id: string
  name: string
  lat: number
  lng: number
}

interface MapWrapperProps {
  markers: any[]
  center: { lat: number; lng: number }
}

export function MapWrapper({ markers, center }: MapWrapperProps) {
  const handleMarkerClick = useCallback((id: string) => {
    console.log('Marker clicked:', id)
  }, [])

  const handleMarkerHover = useCallback((id: string) => {
    console.log('Marker hovered:', id)
  }, [])

  const handleMarkerLeave = useCallback(() => {
    console.log('Marker left')
  }, [])

  // Filter out any markers with invalid coordinates
  const validMarkers = markers.filter(marker => 
    typeof marker.lat === 'number' && 
    typeof marker.lng === 'number' && 
    !isNaN(marker.lat) && 
    !isNaN(marker.lng) &&
    marker.lat !== 0 && 
    marker.lng !== 0
  )

  // Debug: Log markers to console
  useEffect(() => {
    console.log('Original Map Markers Count:', markers.length)
    console.log('Valid Markers Count:', validMarkers.length)
    console.log('First Few Valid Markers:', validMarkers.slice(0, 3))
    console.log('Center:', center)
  }, [markers, validMarkers, center])

  return (
    <ClientSideMapContainer 
      markers={validMarkers} 
      center={center} 
      zoom={13}
      onMarkerClick={handleMarkerClick}
      onMarkerHover={handleMarkerHover}
      onMarkerLeave={handleMarkerLeave}
    />
  )
}