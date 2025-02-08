"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function PhotoGallery() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const images = [
    { src: `${process.env.NEXT_PUBLIC_IMAGE_URL}`, alt: "Store front" },
    { src: "/placeholder.svg?height=200&width=200", alt: "Interior" },
    { src: "/placeholder.svg?height=200&width=200", alt: "Products" },
    { src: "/placeholder.svg?height=200&width=200", alt: "More photos", overlay: "136+" },
  ]

  return (
    <>
      <div className="grid grid-cols-4 gap-1 rounded-lg overflow-hidden">
        {images.map((image, i) => (
          <div
            key={i}
            className={cn("relative aspect-square cursor-pointer", i === 0 && "col-span-2 row-span-2")}
            onClick={() => setSelectedImage(image.src)}
          >
            <img src={image.src || "/placeholder.svg"} alt={image.alt} className="object-cover w-full h-full" />
            {image.overlay && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                {image.overlay}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          {selectedImage && (
            <img src={selectedImage || "/placeholder.svg"} alt="Gallery image" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

