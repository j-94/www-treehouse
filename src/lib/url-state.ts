export interface SearchParams {
  query?: string
  page?: number
  category?: string
  area?: string
  rating?: number
  sort?: string
}

export function parseSearchParams(params: Record<string, string | string[] | undefined>): SearchParams {
  return {
    query: typeof params.q === 'string' ? params.q : undefined,
    page: typeof params.page === 'string' ? parseInt(params.page, 10) : 1,
    category: typeof params.category === 'string' ? params.category : undefined,
    area: typeof params.area === 'string' ? params.area : undefined,
    rating: typeof params.rating === 'string' ? parseInt(params.rating, 10) : undefined,
    sort: typeof params.sort === 'string' ? params.sort : undefined,
  }
}

export function stringifySearchParams(params: SearchParams): string {
  const searchParams = new URLSearchParams()

  if (params.query) searchParams.set('q', params.query)
  if (params.page && params.page > 1) searchParams.set('page', params.page.toString())
  if (params.category) searchParams.set('category', params.category)
  if (params.area) searchParams.set('area', params.area)
  if (params.rating) searchParams.set('rating', params.rating.toString())
  if (params.sort) searchParams.set('sort', params.sort)

  return searchParams.toString()
} 