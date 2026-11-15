import { z } from "zod"
export const AUDIT_ENTITIES = [
  "user",
  "event_type",
  "supply",
  "neighborhood_association",
  "event",
  "request",
  "delivery",
  "delivery_item",
  "strategic_action",
  "activity",
  "evidence",
] as const
export const auditQuerySchema = z
  .object({
    entity: z.enum(AUDIT_ENTITIES).optional(),
    actor: z.string().trim().max(200).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    cursor: z
      .string()
      .regex(/^[0-9]{1,18}$/)
      .optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "La fecha hasta no puede ser anterior a desde.",
    path: ["to"],
  })
export type AuditQuery = z.infer<typeof auditQuerySchema>
export type AuditRecord = {
  id: string
  createdAt: string
  actorId: string | null
  actorName: string | null
  entity: string
  recordId: string
  operation: string
  before: unknown
  after: unknown
}
