import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Menu, Database } from "lucide-react"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <a href="/" className="flex items-center space-x-2">
            <div className="relative w-8 h-8">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-91tRUaf2HJKDavOyxFDvUwSZnNPeTr.png"
                alt="Treehouse Logo"
                fill
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
            <span className="font-bold text-xl text-green-700">TREEHOUSE</span>
          </a>
        </div>
        <div className="flex-grow max-w-2xl mx-4 hidden md:flex">
          <div className="relative flex-grow">
            <Input type="text" placeholder="Search dispensaries..." className="w-full pl-10 pr-4 py-2 rounded-l-md" />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <Button className="rounded-l-none">
            <MapPin className="mr-2 h-4 w-4" /> All of Thailand
          </Button>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/neon-test">
            <Button variant="outline" className="hidden md:inline-flex">
              <Database className="mr-2 h-4 w-4" /> Neon DB
            </Button>
          </Link>
          <Button variant="outline">EN | TH</Button>
          <Button variant="outline" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="hidden md:inline-flex">
            Sign In
          </Button>
        </div>
      </div>
    </header>
  )
}

