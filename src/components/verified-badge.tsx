import { cn } from "@/lib/utils"
import { CheckCircle } from "lucide-react"

interface VerifiedBadgeProps {
  className?: string
}

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <div className={cn("flex items-center gap-1 text-blue-500", className)}>
      <CheckCircle className="w-4 h-4" />
      <span className="text-sm">Verified Dispensary</span>
    </div>
  )
}

