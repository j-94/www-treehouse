"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import type { Dispensary, SearchParams } from "@/types/directory"

interface SearchContextType {
  searchParams: SearchParams
  searchResults: Dispensary[]
  isLoading: boolean
  error: string | null
  setSearchParams: (params: Partial<SearchParams>) => void
  performSearch: () => Promise<void>
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export const useSearch = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider")
  }
  return context
}

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    location: undefined,
    filters: {},
  })
  const [searchResults, setSearchResults] = useState<Dispensary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const performSearch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Implement actual API call
      const results = await mockSearchAPI(searchParams)
      setSearchResults(results)
    } catch (err) {
      setError("Failed to fetch results")
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  return (
    <SearchContext.Provider
      value={{
        searchParams,
        searchResults,
        isLoading,
        error,
        setSearchParams: (params) => setSearchParams((prev) => ({ ...prev, ...params })),
        performSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

// Mock API function for development
async function mockSearchAPI(params: SearchParams): Promise<Dispensary[]> {
  await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay
  // Return mock data based on params
  return [
    {
      id: "1",
      name: "Karma Canna Cafe Dispensary",
      category: "Bangkok Cannabis Stores",
      rating: 5.0,
      reviewCount: 136,
      image: `${process.env.NEXT_PUBLIC_IMAGE_URL}`,
      verified: true,
      promotion: {
        type: "discount",
        discount: 15,
        eligibility: "medical card holders",
      },
      location: {
        lat: 13.7563,
        lng: 100.5018,
        address: "Bangkok, Thailand",
      },
      contact: {
        phone: "+66123456789",
        website: "https://example.com",
        line: "@karmacanna",
        facebook: "karmacannacafe",
      },
      features: {
        medical: true,
        recreational: true,
        delivery: true,
        cardDiscount: true,
      },
      reviews: [],
      photos: [],
      licenses: ["Medical", "Recreational"],
    },
    // Add more mock dispensaries here
  ]
}

