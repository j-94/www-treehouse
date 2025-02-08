import { sql, and, eq, not, isNull } from "drizzle-orm"
import { db } from "./drizzle"
import { dispensaries } from "./schema"
import type { SearchParams } from "@/lib/url-state"

export const ITEMS_PER_PAGE = 24
export const EMPTY_IMAGE_URL =
  "https://s.gr-assets.com/assets/nophoto/book/111x148-bcc042a9c91a29c1d680899eff700a03.png"

const ratingFilter = (rtg?: string) => {
  if (rtg) {
    const minRating = Number(rtg)
    return sql`${dispensaries.rating} >= ${minRating}`
  }
  return undefined
}

const stateFilter = (state?: string) => {
  return state ? eq(dispensaries.state, state) : undefined
}

const searchFilter = (q?: string) => {
  if (q) {
    const tsQuery = q.trim().split(/\s+/).join(" & ")
    return sql`${dispensaries.name_tsv} @@ to_tsquery('english', ${tsQuery})`
  }
  return undefined
}

const imageFilter = () => {
  return and(not(isNull(dispensaries.image_url)), sql`${dispensaries.image_url} != ${EMPTY_IMAGE_URL}`)
}

export async function fetchDispensariesWithPagination(searchParams: SearchParams) {
  const requestedPage = Math.max(1, Number(searchParams?.page) || 1)

  const filters = [
    ratingFilter(searchParams.rtg),
    stateFilter(searchParams.state),
    imageFilter(),
    searchFilter(searchParams.search),
  ].filter(Boolean)

  const whereClause = filters.length > 0 ? and(...filters) : undefined
  const offset = (requestedPage - 1) * ITEMS_PER_PAGE

  const paginatedDispensaries = await db
    .select({
      id: dispensaries.id,
      name: dispensaries.name,
      image_url: dispensaries.image_url,
      thumbhash: dispensaries.thumbhash,
      city: dispensaries.city,
    })
    .from(dispensaries)
    .where(whereClause)
    .orderBy(dispensaries.id)
    .limit(ITEMS_PER_PAGE)
    .offset(offset)

  return paginatedDispensaries
}

export async function estimateTotalDispensaries(searchParams: SearchParams) {
  const filters = [
    ratingFilter(searchParams.rtg),
    stateFilter(searchParams.state),
    imageFilter(),
    searchFilter(searchParams.search),
  ].filter(Boolean)

  const whereClause = filters.length > 0 ? and(...filters) : undefined

  const explainResult = await db.execute(sql`
    EXPLAIN (FORMAT JSON)
    SELECT id FROM dispensaries
    ${whereClause ? sql`WHERE ${whereClause}` : sql``}
  `)

  const planRows = (explainResult.rows[0] as any)["QUERY PLAN"][0]["Plan"]["Plan Rows"]
  return planRows
}

export async function fetchDispensaryById(id: string) {
  const result = await db
    .select()
    .from(dispensaries)
    .where(eq(dispensaries.id, Number.parseInt(id)))
    .limit(1)

  return result[0]
}

