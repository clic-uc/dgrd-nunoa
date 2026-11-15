import { z } from "zod"
const text = (label: string) => z.string().trim().min(1, `Indica ${label}.`).max(2000, "Máximo 2000 caracteres.")
export const eventSchema = z.object({
  date: z.iso.date("La fecha no es válida."),
  sector: text("el sector o dirección"),
  typeId: z.cuid("Selecciona un tipo de evento."),
  affectedCount: z.number().int().min(0).max(2147483647).nullable(),
  institutions: text("las instituciones"),
  actions: text("las acciones realizadas"),
})
export const eventQuerySchema = z
  .object({
    q: z.string().trim().max(500).optional(),
    typeId: z.cuid().optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "La fecha hasta no puede ser anterior a desde.",
    path: ["to"],
  })
export type EventInput = z.infer<typeof eventSchema>
export type EventQuery = z.infer<typeof eventQuerySchema>
export type EventRecord = Omit<EventInput, "date"> & {
  id: string
  folio: string
  date: string
  type: { id: string; name: string }
  _count: { requests: number; deliveries: number }
}
export type EventDetail = EventRecord & {
  requests: { id: string; folio: string; channel: string; status: string }[]
  deliveries: { id: string; folio: string; beneficiary: string; date: string }[]
}
