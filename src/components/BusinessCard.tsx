import { Card, CardContent } from "@/components/ui/card"
import { Rating } from "./Rating"
import { PromoBanner } from "./PromoBanner"
import { VerifiedBadge } from "./VerifiedBadge"
import { PhotoGallery } from "./PhotoGallery"
import { SocialButtons } from "./SocialButtons"
import type { Dispensary } from "@/types/directory"

interface BusinessCardProps {
  dispensary: Dispensary
}

export function BusinessCard({ dispensary }: BusinessCardProps) {
  return (
    <Card className="h-full overflow-auto border rounded-lg">
      <CardContent className="p-0 space-y-6">
        {dispensary.promotion && (
          <PromoBanner discount={dispensary.promotion.discount} eligibility={dispensary.promotion.eligibility} />
        )}

        <div className="px-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{dispensary.name}</h2>
            {dispensary.verified && <VerifiedBadge className="mt-2" />}
            <div className="flex items-center gap-2 mt-2">
              <Rating rating={dispensary.rating} />
              <span className="text-lg">{dispensary.rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({dispensary.reviewCount} reviews)</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{dispensary.category}</p>
          </div>

          <PhotoGallery photos={dispensary.photos} />

          <SocialButtons contact={dispensary.contact} />

          <p className="text-sm text-muted-foreground">
            {/* Add description if available */}
            Located in {dispensary.location.address}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

