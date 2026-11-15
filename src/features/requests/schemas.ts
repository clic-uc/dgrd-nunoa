import { z } from "zod"

export const REQUEST_STATUSES = ["pending", "attended", "cancelled"] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pendiente",
  attended: "Atendida",
  cancelled: "Anulada",
}

const status = z.enum(REQUEST_STATUSES, "Selecciona un estado válido.")

export const requestFieldsSchema = z.object({
  channel: z
    .string("Indica el medio o fuente de la solicitud.")
    .trim()
    .min(1, "Indica el medio o fuente de la solicitud.")
    .max(200, "El medio no puede superar los 200 caracteres."),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción no puede superar los 2000 caracteres.")
    .nullable()
    .optional(),
  response: z
    .string()
    .trim()
    .max(2000, "La respuesta no puede superar los 2000 caracteres.")
    .nullable()
    .optional()
    .transform((value) => value || null),
  status,
  // Evento opcional: null (o "") deja la solicitud sin evento.
  eventId: z
    .union([z.literal(""), z.cuid("Selecciona un evento válido.")])
    .nullable()
    .optional()
    .transform((value) => value || null),
})
export const createRequestSchema = requestFieldsSchema.extend({ status: status.default("pending") })
export const updateRequestSchema = requestFieldsSchema.partial()

/** Valores del formulario: los selects y textareas siempre entregan strings. */
export const requestFormSchema = z.object({
  channel: requestFieldsSchema.shape.channel,
  description: z.string().trim().max(2000, "La descripción no puede superar los 2000 caracteres."),
  response: z.string().trim().max(2000, "La respuesta no puede superar los 2000 caracteres."),
  status,
  eventId: z.union([z.literal(""), z.cuid("Selecciona un evento válido.")]),
})

export const listRequestsQuerySchema = z.object({
  q: z.string().trim().max(500, "La búsqueda es demasiado larga.").optional(),
  event: z.enum(["all", "with", "without"], "El filtro de evento no es válido.").default("all"),
  status: status.optional(),
})

/**
 * DELETE /api/requests/[id]?expectedDeliveryId=… — la entrega que el usuario vio
 * al confirmar ("" = ninguna). Si cambió, el borrado se rechaza con 409.
 */
export const deleteRequestQuerySchema = z.object({
  expectedDeliveryId: z.union([z.literal(""), z.cuid("La entrega esperada no es válida.")]).optional(),
})

export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>
export type RequestFormValues = z.infer<typeof requestFormSchema>
export type RequestPayload = z.input<typeof createRequestSchema>
export type RequestPatch = z.input<typeof updateRequestSchema>
export type ListRequestsQuery = { q?: string; event?: "all" | "with" | "without"; status?: RequestStatus }

type RelatedEvent = { id: string; folio: string; sector: string }

export type RequestListItem = {
  id: string
  folio: string
  channel: string
  description: string | null
  response: string | null
  status: RequestStatus
  eventId: string | null
  event: RelatedEvent | null
  delivery: { id: string; folio: string } | null
  createdAt: string
  updatedAt: string
}
export type RequestListResponse = { data: RequestListItem[] }
export type RequestDetail = Omit<RequestListItem, "delivery"> & {
  creator: { id: string; name: string }
  delivery: { id: string; folio: string; date: string; beneficiary: string } | null
}
export type RequestOptions = { events: (RelatedEvent & { date: string })[] }
