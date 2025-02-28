import { Suspense } from "react"
import { Header } from "@/components/header"
import { SearchParams, parseSearchParams } from "@/lib/search-params"
import { fetchDispensariesWithPagination, estimateTotalDispensaries } from "./actions"
import { DispensaryPagination } from "@/components/dispensary-pagination"
import { DispensaryLink } from "@/components/dispensary-link"
import { ClientSideMapContainer } from "@/components/ClientSideMapContainer"
import { MobileSearchPeel } from "@/components/search/mobile-search-peel"
import { SearchForm } from "@/components/search/search-form"

// Removing edge runtime as it's incompatible with better-sqlite3

async function getFilteredDispensaries(searchParams: SearchParams) {
  const dispensaries = await fetchDispensariesWithPagination(searchParams)
  const totalResults = await estimateTotalDispensaries(searchParams)
  
  return {
    dispensaries,
    totalResults
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const parsedParams = parseSearchParams(searchParams)
  const { dispensaries, totalResults } = await getFilteredDispensaries(parsedParams)
  
  const currentPage = Math.max(1, Number(parsedParams.page) || 1)
  const itemsPerPage = 24 // This should match ITEMS_PER_PAGE in actions.ts
  const totalPages = Math.ceil(totalResults / itemsPerPage)
  
  // Prepare map markers from dispensaries
  const mapMarkers = dispensaries.map(d => ({
    id: d.id.toString(),
    name: d.name,
    lat: d.latitude || 13.7563,
    lng: d.longitude || 100.5018
  }));

  // Default to Bangkok if no dispensaries with coordinates
  const mapCenter = dispensaries.length > 0 && dispensaries[0].latitude ? 
    { lat: dispensaries[0].latitude, lng: dispensaries[0].longitude } : 
    { lat: 13.7563, lng: 100.5018 };

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      
      <div className="relative flex-1 mt-16">
        {/* Map Section */}
        <div className="w-full h-[calc(100vh-4rem)]">
          <ClientSideMapContainer 
            markers={mapMarkers} 
            center={mapCenter} 
            zoom={13}
            onMarkerClick={(id) => console.log('Marker clicked:', id)}
            onMarkerHover={(id) => console.log('Marker hovered:', id)}
            onMarkerLeave={() => console.log('Marker left')}
          />
        </div>
        
        {/* Mobile Search Peel */}
        <MobileSearchPeel>
          <div className="p-4">
            <SearchForm />
            
            <h2 className="text-xl font-bold mb-4 mt-6">
              {totalResults} Results Found
            </h2>
            
            <Suspense fallback={<div>Loading dispensaries...</div>}>
              <div className="space-y-4">
                {dispensaries.length === 0 ? (
                  <div className="p-8 text-center">
                    <h2 className="text-xl font-bold mb-2">No Dispensaries Found</h2>
                    <p className="text-gray-600 mb-4">
                      We couldn't find any dispensaries matching your search criteria.
                    </p>
                    <p className="text-gray-600">
                      Try adjusting your filters or search for a different location.
                    </p>
                  </div>
                ) : (
                  dispensaries.map((dispensary) => (
                    <DispensaryLink 
                      key={dispensary.id}
                      dispensary={dispensary}
                      searchParams={parsedParams}
                      className="block hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="h-48 bg-gray-200 relative">
                          {dispensary.image_url ? (
                            <img
                              src={dispensary.image_url}
                              alt={dispensary.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              No image available
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-lg mb-2">{dispensary.name}</h3>
                          <p className="text-gray-600 text-sm mb-2">{dispensary.address}</p>
                          <div className="flex items-center text-sm text-yellow-500 mb-3">
                            {Array(5).fill(0).map((_, i) => (
                              <span key={i}>
                                {i < Math.round(dispensary.rating) ? "★" : "☆"}
                              </span>
                            ))}
                            <span className="text-gray-600 ml-2">
                              ({dispensary.user_ratings_total})
                            </span>
                          </div>
                        </div>
                      </div>
                    </DispensaryLink>
                  ))
                )}
              </div>
            </Suspense>
            
            <DispensaryPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalResults={totalResults}
              searchParams={parsedParams}
            />
          </div>
        </MobileSearchPeel>
      </div>
    </main>
  )
}

