import { z } from "zod"
const text = (label: string) => z.string().trim().min(1, `Indica ${label}.`).max(2000, "Máximo 2000 caracteres.")
export const activitySchema = z.object({
  actionId: z.cuid("Selecciona una acción estratégica."),
  date: z.iso.date("La fecha no es válida."),
  objective: text("el objetivo"),
  location: text("la dirección"),
  participants: text("los participantes"),
})
export const activityQuerySchema = z
  .object({
    actionId: z.cuid().optional(),
    q: z.string().trim().max(500).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "La fecha hasta no puede ser anterior a desde.",
    path: ["to"],
  })
export type ActivityInput = z.infer<typeof activitySchema>
export type ActivityQuery = z.infer<typeof activityQuerySchema>
export type ActivityRecord = ActivityInput & {
  id: string
  action: { id: string; title: string; startDate: string; endDate: string }
  _count: { evidence: number }
}
export function outsideActionPeriod(date: string, start: string, end: string) {
  return date < start.slice(0, 10) || date > end.slice(0, 10)
}
