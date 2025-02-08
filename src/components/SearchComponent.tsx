import type React from "react"
import { useSearch } from "@/contexts/SearchContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function SearchComponent() {
  const { searchParams, setSearchParams, performSearch, isLoading } = useSearch()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center">
      <Input
        type="text"
        placeholder="Search dispensaries..."
        value={searchParams.query}
        onChange={(e) => setSearchParams({ query: e.target.value })}
        className="mr-2"
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Searching..." : <Search className="w-4 h-4" />}
      </Button>
    </form>
  )
}

