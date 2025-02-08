import { useSearch } from "@/contexts/SearchContext"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function FilterComponent() {
  const { searchParams, setSearchParams } = useSearch()

  const handleFilterChange = (filterKey: keyof typeof searchParams.filters) => {
    setSearchParams({
      filters: {
        ...searchParams.filters,
        [filterKey]: !searchParams.filters[filterKey],
      },
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Filters</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="medical"
            checked={searchParams.filters.medical}
            onCheckedChange={() => handleFilterChange("medical")}
          />
          <Label htmlFor="medical">Medical</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="recreational"
            checked={searchParams.filters.recreational}
            onCheckedChange={() => handleFilterChange("recreational")}
          />
          <Label htmlFor="recreational">Recreational</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="delivery"
            checked={searchParams.filters.delivery}
            onCheckedChange={() => handleFilterChange("delivery")}
          />
          <Label htmlFor="delivery">Delivery Available</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cardDiscount"
            checked={searchParams.filters.cardDiscount}
            onCheckedChange={() => handleFilterChange("cardDiscount")}
          />
          <Label htmlFor="cardDiscount">Card Discount</Label>
        </div>
      </div>
    </div>
  )
}

