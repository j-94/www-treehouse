"use client"

import { useSearch } from "@/contexts/SearchContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search as SearchIcon } from "lucide-react"

export function Search() {
  const { searchParams, setSearchParams, performSearch } = useSearch()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Search dispensaries..."
          value={searchParams.query || ""}
          onChange={(e) => setSearchParams({ query: e.target.value })}
          className="w-full"
        />
      </div>
      <Button type="submit" variant="default">
        <SearchIcon className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  )
}

export function SearchFallback() {
  return (
    <div className="flex gap-2 animate-pulse">
      <div className="flex-1">
        <div className="h-10 bg-gray-200 rounded w-full" />
      </div>
      <div className="h-10 w-24 bg-gray-200 rounded" />
    </div>
  )
}

