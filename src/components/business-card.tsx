"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Rating } from "./rating"
import { PromoBanner } from "./promo-banner"
import { VerifiedBadge } from "./verified-badge"
import { PhotoGallery } from "./photo-gallery"
import { SocialButtons } from "./social-buttons"
import type { Dispensary } from "@/types/directory"

interface BusinessCardProps {
  dispensary: Dispensary
  className?: string
}

export function BusinessCard({ dispensary, className = "" }: BusinessCardProps) {
  const metadata = dispensary.metadata as any // TODO: Type this properly

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          <PhotoGallery imageUrl={dispensary.image_url} />
          {metadata?.verified && <VerifiedBadge className="absolute top-2 right-2" />}
        </div>
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{dispensary.name}</h3>
              <Rating value={dispensary.rating || 0} reviewCount={dispensary.review_count} />
            </div>
            <p className="text-sm text-gray-600">{metadata?.category}</p>
          </div>

          {metadata?.promotion && <PromoBanner promotion={metadata.promotion} />}

          <div className="text-sm text-gray-600">
            <p>{metadata?.location?.address}</p>
          </div>

          {metadata?.contact && <SocialButtons contact={metadata.contact} />}
        </div>
      </CardContent>
    </Card>
  )
} 