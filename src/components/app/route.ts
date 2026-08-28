import type { Route, RouteName } from "./provider"

/** Deriva la ruta lógica del mockup a partir del pathname real de Next. */
export function pathToRoute(pathname: string): Route {
  const p = pathname.replace(/\/+$/, "") || "/"
  const seg = p.split("/").filter(Boolean)

  if (seg[0] === "plan") {
    if (seg[1] === "cronograma") return { name: "cronograma" }
    if (seg[1] === "acciones") return seg[2] ? { name: "accion", id: seg[2] } : { name: "acciones" }
    if (seg[1] === "actividades" && seg[2]) return { name: "actividad", id: seg[2] }
    return { name: "cronograma" }
  }
  if (seg[0] === "admin") {
    return seg[1] === "configuracion" ? { name: "config" } : { name: "usuarios" }
  }

  const singular: Record<string, RouteName> = {
    solicitudes: "solicitud",
    eventos: "evento",
    entregas: "entrega",
    insumos: "insumo",
  }
  const plural = seg[0] as RouteName | undefined
  if (plural && plural in singular) {
    return seg[1] ? { name: singular[plural], id: seg[1] } : { name: plural }
  }
  return { name: "resumen" }
}
