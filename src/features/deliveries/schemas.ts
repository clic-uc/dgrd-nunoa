import { z } from "zod"
import { rutSchema } from "@/lib/rut"

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Debes indicar ${label.toLowerCase()}.`)
    .max(500, `${label} no puede superar los 500 caracteres.`)
const day = z.iso.date("La fecha no es válida.")
const itemsSchema = z
  .array(
    z.object({
      supplyId: z.cuid("Selecciona un insumo válido."),
      quantity: z
        .number()
        .int("La cantidad debe ser entera.")
        .positive("La cantidad debe ser mayor a cero.")
        .max(2147483647, "La cantidad es demasiado grande."),
    }),
  )
  .min(1, "Agrega al menos un insumo con cantidad.")
  .refine(
    (items) => new Set(items.map((item) => item.supplyId)).size === items.length,
    "No puedes repetir un insumo en la entrega.",
  )

export const deliveryFieldsSchema = z.object({
  beneficiary: requiredText("El beneficiario"),
  beneficiaryRut: rutSchema,
  neighborhoodAssociationId: z.cuid("Selecciona una junta vecinal válida.").nullable().optional(),
  contact: z
    .string()
    .trim()
    .max(500, "El contacto no puede superar los 500 caracteres.")
    .nullable()
    .optional()
    .transform((value) => value || null),
  address: requiredText("La dirección"),
  date: day.transform((value) => new Date(`${value}T00:00:00.000Z`)),
  requestId: z.cuid("Selecciona una solicitud válida.").nullable().optional(),
  items: itemsSchema,
})
export const createDeliverySchema = deliveryFieldsSchema
export const updateDeliverySchema = deliveryFieldsSchema.partial()
export const listDeliveriesQuerySchema = z
  .object({
    q: z.string().trim().max(500).optional(),
    beneficiary: z.string().trim().max(500).optional(),
    eventId: z.cuid().optional(),
    from: day.optional(),
    to: day.optional(),
    association: z.enum(["all", "with", "without"]).default("all"),
    event: z.enum(["all", "with", "without"]).default("all"),
    supplyId: z.cuid().optional(),
    neighborhoodAssociationId: z.cuid("La junta vecinal no es válida.").optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine((value) => !value.from || !value.to || value.to >= value.from, {
    message: "La fecha hasta no puede ser anterior a desde.",
    path: ["to"],
  })
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>
export type ListDeliveriesQuery = {
  q?: string
  beneficiary?: string
  eventId?: string
  from?: string
  to?: string
  event?: "all" | "with" | "without"
  supplyId?: string
  neighborhoodAssociationId?: string
  association?: "all" | "with" | "without"
  order?: "asc" | "desc"
}
export type Delivery = {
  id: string
  folio: string
  beneficiary: string
  beneficiaryRut: string | null
  neighborhoodAssociationId: string | null
  neighborhoodAssociation: { id: string; number: number; name: string; active: boolean } | null
  contact: string | null
  address: string
  date: string
  createdAt: string
  updatedAt: string
  requestId: string | null
  eventId: string | null
  creator: { id: string; name: string }
  request: { id: string; folio: string; channel: string } | null
  event: { id: string; folio: string; sector: string; type: { name: string } } | null
  items: { supplyId: string; quantity: number; supply: { id: string; type: string; unit: string } }[]
}
export type DeliveryListResponse = {
  data: Delivery[]
  stats: { deliveries: number; units: number; neighborhoods: number }
}
export type DeliveryOptions = {
  events: { id: string; folio: string; sector: string }[]
  neighborhoodAssociations: { id: string; number: number; name: string; active: boolean }[]
  supplies: { id: string; type: string; unit: string }[]
  requests: {
    id: string
    folio: string
    channel: string
    delivery: { id: string } | null
    event: { id: string; folio: string; date: string; sector: string } | null
  }[]
}
export type DeliveryPayload = Omit<CreateDeliveryInput, "date"> & { date: string }
export type DeliveryPatch = Partial<DeliveryPayload>
export const deliveryFormSchema = z.object({
  beneficiary: requiredText("El beneficiario"),
  beneficiaryRut: z
    .string()
    .refine((value) => rutSchema.safeParse(value).success, "Indica un RUT válido con dígito verificador."),
  neighborhoodAssociationId: z.union([z.literal(""), z.cuid("Selecciona una junta vecinal válida.")]),
  contact: z.string().trim().max(500, "El contacto no puede superar los 500 caracteres."),
  address: requiredText("La dirección"),
  date: day,
  requestId: z.string(),
  items: z
    .array(
      z.object({
        type: z.string().min(1, "Selecciona un tipo de insumo."),
        supplyId: z.cuid("Selecciona la unidad del insumo."),
        quantity: z
          .string()
          .regex(/^[1-9]\d*$/, "Indica una cantidad entera mayor a cero.")
          .refine((value) => Number(value) <= 2147483647, "La cantidad es demasiado grande."),
      }),
    )
    .min(1, "Agrega al menos un insumo.")
    .refine(
      (items) => new Set(items.map((item) => item.supplyId)).size === items.length,
      "No puedes repetir un insumo.",
    ),
})
export type DeliveryFormValues = z.infer<typeof deliveryFormSchema>
export function toDeliveryPayload(values: DeliveryFormValues): DeliveryPayload {
  return {
    ...values,
    neighborhoodAssociationId: values.neighborhoodAssociationId || null,
    beneficiaryRut: rutSchema.parse(values.beneficiaryRut),
    contact: values.contact || null,
    requestId: values.requestId || null,
    items: values.items.map((item) => ({ supplyId: item.supplyId, quantity: Number(item.quantity) })),
  }
}

export const recurrenceQuerySchema = z.object({ rut: rutSchema, date: z.iso.date(), excludeId: z.cuid().optional() })
export type RecurrenceResult = {
  from: string
  to: string
  deliveries: {
    id: string
    folio: string
    date: string
    items: { quantity: number; supply: { type: string; unit: string } }[]
  }[]
}
