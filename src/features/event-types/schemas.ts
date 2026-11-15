import { z } from "zod"
export const eventTypeSchema = z.object({
  name: z.string().trim().min(1, "Indica el nombre.").max(200, "Máximo 200 caracteres."),
})
export type EventTypeInput = z.infer<typeof eventTypeSchema>
export type EventType = { id: string; name: string; _count: { events: number } }
