import type { Dispensary as DispensarySchema } from "@/lib/db/schema"

export type Dispensary = DispensarySchema

export interface SearchParams {
  query?: string
  location?: string | undefined
  filters?: Record<string, any>
  area?: string
  category?: string
  rating?: number
  sort?: string
} 