"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function WelcomeToast() {
  useEffect(() => {
    toast("Welcome to Treehouse", {
      description: "Discover and explore cannabis dispensaries near you.",
      duration: 5000,
    })
  }, [])

  return null
} 