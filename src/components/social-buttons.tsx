import { Button } from "@/components/ui/button"
import { MapPin, Phone, Globe, Facebook } from "lucide-react"

interface Contact {
  phone?: string
  website?: string
  line?: string
  facebook?: string
}

interface SocialButtonsProps {
  contact: Contact
}

export function SocialButtons({ contact }: SocialButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="rounded-full" size="sm">
        <MapPin className="w-4 h-4 mr-2" />
        Directions
      </Button>
      {contact.phone && (
        <Button
          variant="outline"
          className="rounded-full"
          size="sm"
          onClick={() => window.open(`tel:${contact.phone}`)}
        >
          <Phone className="w-4 h-4 mr-2" />
          Call
        </Button>
      )}
      {contact.website && (
        <Button
          variant="outline"
          className="rounded-full"
          size="sm"
          onClick={() => window.open(contact.website, "_blank")}
        >
          <Globe className="w-4 h-4 mr-2" />
          Website
        </Button>
      )}
      {contact.line && (
        <Button
          variant="outline"
          className="rounded-full"
          size="sm"
          onClick={() => window.open(`https://line.me/ti/p/${contact.line}`, "_blank")}
        >
          <img src="/line-icon.svg" alt="LINE" className="w-4 h-4 mr-2" />
          {contact.line}
        </Button>
      )}
      {contact.facebook && (
        <Button
          variant="outline"
          className="rounded-full"
          size="sm"
          onClick={() => window.open(`https://facebook.com/${contact.facebook}`, "_blank")}
        >
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </Button>
      )}
    </div>
  )
}

