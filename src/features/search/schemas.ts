import { z } from "zod"
export const SEARCH_MODULES = {
  all: "Todos los módulos",
  deliveries: "Entregas",
  requests: "Solicitudes",
  events: "Eventos",
  activities: "Actividades",
  "strategic-actions": "Acciones estratégicas",
  "neighborhood-associations": "Juntas vecinales",
  supplies: "Insumos",
} as const
export const searchSchema = z
  .object({
    q: z.string().trim().min(2, "Escribe al menos dos caracteres.").max(200, "Máximo 200 caracteres."),
    module: z
      .enum(Object.keys(SEARCH_MODULES) as [keyof typeof SEARCH_MODULES, ...(keyof typeof SEARCH_MODULES)[]])
      .default("all"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "La fecha hasta no puede ser anterior a desde.",
    path: ["to"],
  })
export type SearchQuery = z.infer<typeof searchSchema>
export type SearchGroup = {
  module: string
  label: string
  results: { id: string; title: string; subtitle: string; href: string }[]
}
