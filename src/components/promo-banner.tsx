import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Promotion {
  type: string
  discount: number
  eligibility: string
}

interface PromoBannerProps {
  promotion: Promotion
}

export function PromoBanner({ promotion }: PromoBannerProps) {
  return (
    <Card className="bg-green-500 text-white border-0">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <img src="/placeholder.svg?height=48&width=48" alt="Medical card" className="w-8 h-8" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="text-sm font-medium">THIS SHOP OFFERS A</div>
            <div className="text-2xl font-bold">{promotion.discount}% DISCOUNT</div>
            <div className="text-sm">FOR {promotion.eligibility.toUpperCase()}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700">
            LEARN MORE
          </Button>
          <Button variant="secondary" className="bg-white text-black hover:bg-gray-100">
            APPLY NOW
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

