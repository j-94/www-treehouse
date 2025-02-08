"use client"

import { useSearch } from "@/contexts/SearchContext"
import { Button } from "@/components/ui/button"
import * as React from "react"

export function Filter() {
  const { searchParams, setSearchParams } = useSearch()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">Categories</h3>
        <div className="space-y-2">
          {["Dispensary", "Delivery", "Doctor"].map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={searchParams.category === category}
                onChange={(e) => 
                  setSearchParams({ category: e.target.checked ? category : undefined })
                }
                className="w-4 h-4 rounded border-primary text-primary focus:ring-primary"
              />
              <label className="text-sm font-medium leading-none">
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setSearchParams({ category: undefined, rating: undefined })}
      >
        Clear Filters
      </Button>
    </div>
  )
}

export function FilterFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="mb-2 w-24 h-6 bg-gray-200 rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-20 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 w-24 h-6 bg-gray-200 rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="w-20 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full h-9 bg-gray-200 rounded" />
    </div>
  )
}

