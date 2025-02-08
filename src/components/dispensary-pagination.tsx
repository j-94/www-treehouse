"use client"

import { Button } from "@/components/ui/button"
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"
import type { SearchParams } from "@/lib/url-state"
import { stringifySearchParams } from "@/lib/url-state"
import Link from "next/link"

function PaginationLink({
  searchParams,
  pageNumber,
  children,
  disabled = false,
}: {
  searchParams: SearchParams
  pageNumber: number
  children: React.ReactNode
  disabled?: boolean
}) {
  const updatedParams = { ...searchParams, page: pageNumber }
  const href = `/?${stringifySearchParams(updatedParams)}`

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      asChild
    >
      <Link href={href}>
        {children}
      </Link>
    </Button>
  )
}

export function DispensaryPagination({
  currentPage,
  totalPages,
  totalResults,
  searchParams,
}: {
  currentPage: number
  totalPages: number
  totalResults: number
  searchParams: SearchParams
}) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <Pagination>
      <PaginationContent className="flex items-center justify-between">
        <PaginationItem>
          <PaginationLink
            searchParams={searchParams}
            pageNumber={Math.max(1, currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ←
          </PaginationLink>
        </PaginationItem>

        <PaginationItem>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({totalResults} results)
          </span>
        </PaginationItem>

        <PaginationItem>
          <PaginationLink
            searchParams={searchParams}
            pageNumber={Math.min(totalPages, currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            →
          </PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

