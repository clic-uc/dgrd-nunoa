"use client"

import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { signOut } from "@/lib/auth-client"

/**
 * Cierra la sesión: Better Auth revoca la sesión en la base de datos (el token
 * deja de ser válido) y borra la cookie; luego se redirige al login.
 */
export function SignOutButton() {
  const router = useRouter()
  const client = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const handleSignOut = async () => {
    setIsPending(true)
    try {
      const result = await signOut()
      if (result.error) throw new Error(result.error.message ?? "No se pudo cerrar la sesión.")
      client.clear()
      router.replace("/login")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cerrar la sesión. Inténtalo nuevamente.")
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
    >
      <LogOut className="size-3.5" />
      {isPending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  )
}
