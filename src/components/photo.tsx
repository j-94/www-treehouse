"use client"

import Image from "next/image"

interface PhotoProps {
  src: string | null
  title: string
  thumbhash?: string | null
  priority?: boolean
  className?: string
}

export function Photo({ src, title, thumbhash, priority = false, className = "" }: PhotoProps) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-lg bg-gray-100 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={title}
          width={400}
          height={400}
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400">{title[0]}</span>
        </div>
      )}
      {thumbhash && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(data:image/jpeg;base64,${thumbhash})` }}
        />
      )}
    </div>
  )
} 