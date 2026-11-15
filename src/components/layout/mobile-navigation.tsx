"use client"
import { useState } from "react"
import Link from "next/link"
import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { NavigationLinks } from "./app-sidebar"
import { SignOutButton } from "@/components/auth/sign-out-button"
export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  return (
    <header className="bg-surface flex min-h-14 flex-wrap items-center justify-between gap-2 border-b px-3 py-2 lg:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Menu className="size-4" />
            Menú
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-ink max-h-[90svh] overflow-y-auto border-0 text-white">
          <DialogHeader>
            <DialogTitle>DGRD Ñuñoa</DialogTitle>
            <DialogDescription className="text-white/70">Navegación del sistema</DialogDescription>
          </DialogHeader>
          <NavigationLinks onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      <Button asChild variant="ghost" size="sm">
        <Link href="/buscar">
          <Search className="size-4" />
          Buscar
        </Link>
      </Button>
      <SignOutButton />
    </header>
  )
}
