import { Card, CardContent } from "@/components/ui/card"
import { Rating } from "./rating"
import { PromoBanner } from "./promo-banner"
import { VerifiedBadge } from "./verified-badge"
import { PhotoGallery } from "./photo-gallery"
import { SocialButtons } from "./social-buttons"

export function BusinessCard() {
  return (
    <Card className="h-full overflow-auto border-0 rounded-none">
      <CardContent className="p-0 space-y-6">
        <PromoBanner />

        <div className="px-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Karma Canna Cafe Dispensary</h1>
            <VerifiedBadge className="mt-2" />
            <div className="flex items-center gap-2 mt-2">
              <Rating rating={5.0} />
              <span className="text-lg">5.0</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Bangkok Cannabis Stores</p>
          </div>

          <PhotoGallery />

          <SocialButtons />

          <p className="text-sm text-muted-foreground">
            Nestled in the hustle and bustle of the land of smiles, Our medical cannabis dispensary Karma Canna Cafe was
            inspired by travels in Amsterdam, the US, and Canada.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

