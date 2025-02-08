import { Suspense } from "react"
import { DispensaryGrid } from "@/components/dispensary-grid"
import { DispensaryPagination } from "@/components/dispensary-pagination"
import { estimateTotalDispensaries, fetchDispensariesWithPagination, ITEMS_PER_PAGE } from "@/lib/db/queries"
import { parseSearchParams } from "@/lib/url-state"

export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const parsedSearchParams = parseSearchParams(searchParams)

  const [dispensaries, estimatedTotal] = await Promise.all([
    fetchDispensariesWithPagination(parsedSearchParams),
    estimateTotalDispensaries(parsedSearchParams),
  ])

  const totalPages = Math.ceil(estimatedTotal / ITEMS_PER_PAGE)
  const currentPage = Math.max(1, Number(parsedSearchParams.page) || 1)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-auto min-h-[200px]">
        <div className="group-has-[[data-pending]]:animate-pulse p-4">
          <DispensaryGrid dispensaries={dispensaries} searchParams={parsedSearchParams} />
        </div>
      </div>
      <div className="mt-auto p-4 border-t">
        <Suspense fallback={null}>
          <DispensaryPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={estimatedTotal}
            searchParams={parsedSearchParams}
          />
        </Suspense>
      </div>
    </div>
  )
}

