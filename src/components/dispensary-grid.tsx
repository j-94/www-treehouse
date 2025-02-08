import Link from "next/link"
import type { Dispensary } from "@/lib/db/schema"
import { Photo } from "./photo"
import { type SearchParams, stringifySearchParams } from "@/lib/url-state"

export async function DispensaryGrid({
  dispensaries,
  searchParams,
}: {
  dispensaries: Dispensary[]
  searchParams: SearchParams
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {!dispensaries?.length ? (
        <p className="text-center text-muted-foreground col-span-full">No dispensaries found.</p>
      ) : (
        dispensaries.map((dispensary, index) => (
          <DispensaryLink
            key={dispensary.id}
            priority={index < 10}
            dispensary={dispensary}
            searchParams={searchParams}
          />
        ))
      )}
    </div>
  )
}

function DispensaryLink({
  priority,
  dispensary,
  searchParams,
}: {
  priority: boolean
  dispensary: Dispensary
  searchParams: SearchParams
}) {
  return (
    <Link
      href={`/${dispensary.id}?${stringifySearchParams(searchParams)}`}
      className="block transition ease-in-out md:hover:scale-105"
      prefetch={false}
    >
      <Photo src={dispensary.image_url} title={dispensary.name} thumbhash={dispensary.thumbhash} priority={priority} />
      <h3 className="mt-2 text-sm font-semibold">{dispensary.name}</h3>
      <p className="text-sm text-muted-foreground">{dispensary.city}</p>
    </Link>
  )
}

