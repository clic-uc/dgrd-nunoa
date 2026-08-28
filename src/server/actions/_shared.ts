import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/types"

/**
 * Envuelve el cuerpo de una server action: revalida el árbol completo al
 * terminar bien y convierte cualquier excepción en un error legible para la UI
 * (en vez de reventar el render del cliente).
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    // Todas las vistas cuelgan del layout de (app), que carga el dominio
    // completo; revalidar la raíz basta y evita olvidar rutas al agregar vistas.
    revalidatePath("/", "layout")
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: mensajeError(e) }
  }
}

export function mensajeError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = (e as { code?: string }).code
    if (code === "P2002") return "Ya existe un registro con esos datos únicos."
    if (code === "P2003") return "No se puede completar: hay registros dependientes."
    if (code === "P2025") return "El registro ya no existe. Actualiza la página."
  }
  if (e instanceof Error && e.message) return e.message
  return "Ocurrió un error inesperado."
}

/** Convierte "" en null para columnas opcionales. */
export function nullIfEmpty(v: string | null | undefined): string | null {
  const t = (v ?? "").trim()
  return t === "" ? null : t
}

/** Parsea "YYYY-MM-DD" a Date en UTC, para que el día calendario no se corra. */
export function parseDayUTC(s: string): Date {
  const d = new Date(`${s}T00:00:00.000Z`)
  if (isNaN(d.getTime())) throw new Error(`Fecha inválida: ${s}`)
  return d
}
