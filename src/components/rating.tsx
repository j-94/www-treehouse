"use client"

import { Star } from "lucide-react"

interface RatingProps {
  value: number | null
  reviewCount?: number | null
  className?: string
}

export function Rating({ value = 0, reviewCount, className = "" }: RatingProps) {
  const fullStars = Math.floor(value || 0)
  const hasHalfStar = (value || 0) % 1 >= 0.5

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < fullStars
                ? "text-yellow-400 fill-yellow-400"
                : i === fullStars && hasHalfStar
                ? "text-yellow-400 fill-yellow-400 mask-star-half"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
      {reviewCount !== undefined && reviewCount !== null && (
        <span className="ml-1 text-sm text-gray-600">({reviewCount})</span>
      )}
    </div>
  )
} 