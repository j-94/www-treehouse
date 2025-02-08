import { Button } from "@/components/ui/button"
import { MapPin, Phone, Globe, Facebook } from "lucide-react"

export function SocialButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="rounded-full" size="sm">
        <MapPin className="w-4 h-4 mr-2" />
        Directions
      </Button>
      <Button variant="outline" className="rounded-full" size="sm">
        <Phone className="w-4 h-4 mr-2" />
        Call
      </Button>
      <Button variant="outline" className="rounded-full" size="sm">
        <Globe className="w-4 h-4 mr-2" />
        Website
      </Button>
      <Button variant="outline" className="rounded-full" size="sm">
        <img src="/line-icon.svg" alt="LINE" className="w-4 h-4 mr-2" />
        @LINE
      </Button>
      <Button variant="outline" className="rounded-full" size="sm">
        <Facebook className="w-4 h-4 mr-2" />
        Facebook
      </Button>
    </div>
  )
}

