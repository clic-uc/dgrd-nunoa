import { normalizeRut } from "@/lib/rut"
import { recurrencePeriod } from "./recurrence"
import { reserveFolio } from "@/lib/folio"
import { assertAttended } from "@/features/requests/rules"
import { deliveryFolioYear } from "./folio"
import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type { CreateDeliveryInput, UpdateDeliveryInput, ListDeliveriesQuery } from "./schemas"

const include = {
  neighborhoodAssociation: { select: { id: true, number: true, name: true, active: true } },
  creator: { select: { id: true, name: true } },
  request: { select: { id: true, folio: true, channel: true } },
  event: { select: { id: true, folio: true, sector: true, type: { select: { name: true } } } },
  items: { include: { supply: { select: { id: true, type: true, unit: true } } } },
} satisfies Prisma.DeliveryInclude

export async function listDeliveries(query: ListDeliveriesQuery) {
  const {
    q,
    from,
    to,
    event,
    beneficiary,
    eventId,
    supplyId,
    neighborhoodAssociationId,
    association,
    order = "desc",
  } = query
  const where: Prisma.DeliveryWhereInput = {
    ...(from || to
      ? {
          date: {
            ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
            ...(to && { lte: new Date(`${to}T00:00:00.000Z`) }),
          },
        }
      : {}),
    ...(event === "with" ? { eventId: { not: null } } : event === "without" ? { eventId: null } : {}),
    ...(association === "without"
      ? { neighborhoodAssociationId: null }
      : association === "with"
        ? { neighborhoodAssociationId: { not: null } }
        : {}),
    ...(neighborhoodAssociationId && { neighborhoodAssociationId }),
    ...(beneficiary && { beneficiary: { contains: beneficiary, mode: "insensitive" } }),
    ...(eventId && { eventId }),
    ...(supplyId && { items: { some: { supplyId } } }),
    ...(q && {
      OR: [
        ...["folio", "beneficiary", "beneficiaryRut", "address"].map((field) => ({
          [field]: { contains: q, mode: "insensitive" },
        })),
        { beneficiaryRut: { contains: normalizeRut(q), mode: "insensitive" } },
        { neighborhoodAssociation: { name: { contains: q, mode: "insensitive" } } },
        ...(/^\d+$/.test(q) && Number(q) <= 2147483647 ? [{ neighborhoodAssociation: { number: Number(q) } }] : []),
        { event: { folio: { contains: q, mode: "insensitive" } } },
      ],
    }),
  }
  const data = await prisma.delivery.findMany({
    where,
    include,
    orderBy: [{ date: order }, { createdAt: order }, { id: order }],
  })
  return {
    data,
    stats: {
      deliveries: data.length,
      units: data.reduce((sum, row) => sum + row.items.reduce((total, item) => total + item.quantity, 0), 0),
      neighborhoods: new Set(data.map((row) => row.neighborhoodAssociationId).filter(Boolean)).size,
    },
  }
}
export async function getDelivery(id: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id }, include })
  if (!delivery) throw new AppError(404, "La entrega no existe.")
  return delivery
}
export async function getDeliveryOptions() {
  const [supplies, requests, neighborhoodAssociations, events] = await Promise.all([
    prisma.supply.findMany({
      select: { id: true, type: true, unit: true },
      orderBy: [{ type: "asc" }, { unit: "asc" }],
    }),
    prisma.request.findMany({
      select: {
        id: true,
        folio: true,
        channel: true,
        delivery: { select: { id: true } },
        event: { select: { id: true, folio: true, date: true, sector: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.neighborhoodAssociation.findMany({
      select: { id: true, number: true, name: true, active: true },
      orderBy: { number: "asc" },
    }),
    prisma.event.findMany({
      where: { deliveries: { some: {} } },
      select: { id: true, folio: true, sector: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
  ])
  return { supplies, requests, neighborhoodAssociations, events }
}
function fail(field: string, message: string, status = 400): never {
  throw new AppError(status, message, { fieldErrors: { [field]: [message] } })
}
async function validateRelations(
  tx: Prisma.TransactionClient,
  input: UpdateDeliveryInput,
  id?: string,
  currentAssociationId?: string | null,
) {
  if (input.neighborhoodAssociationId) {
    const associations = await tx.$queryRaw<
      { id: string; active: boolean }[]
    >`SELECT id, active FROM neighborhood_association WHERE id = ${input.neighborhoodAssociationId} FOR SHARE`
    const association = associations[0]
    if (!association) fail("neighborhoodAssociationId", "La junta vecinal ya no existe.")
    if (!association.active && association.id !== currentAssociationId)
      fail("neighborhoodAssociationId", "La junta vecinal está inactiva. Selecciona una junta activa.", 409)
  }
  if (input.items) {
    // Orden estable para que dos entregas con varios insumos no adquieran
    // los bloqueos en orden inverso. FOR SHARE permite altas simultáneas,
    // pero serializa contra edición de unidad o borrado del catálogo.
    const supplies = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM supply WHERE id IN (${Prisma.join(input.items.map((item) => item.supplyId))})
      ORDER BY id FOR SHARE`)
    if (supplies.length !== input.items.length)
      fail("items", "Uno de los insumos ya no existe. Actualiza el formulario.")
  }
  if (input.requestId) {
    // Serializa la asociación a la misma solicitud; el índice único sigue siendo la defensa final.
    await tx.$queryRaw`SELECT id FROM "request" WHERE id = ${input.requestId} FOR UPDATE`
    const request = await tx.request.findUnique({
      where: { id: input.requestId },
      select: { eventId: true, delivery: { select: { id: true } } },
    })
    if (!request) fail("requestId", "La solicitud ya no existe.")
    if (request.delivery && request.delivery.id !== id)
      fail("requestId", "Esa solicitud ya tiene una entrega registrada.", 409)
    return request.eventId
  }
  return null
}
function translateError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "La entrega no existe.")
    if (error.code === "P2002") {
      const target = String(error.meta?.target ?? "")
      if (target.includes("requestId")) fail("requestId", "Esa solicitud ya tiene una entrega registrada.", 409)
      throw new AppError(409, "El folio ya está ocupado. Vuelve a intentar guardar.")
    }
    if (error.code === "P2003")
      throw new AppError(409, "La junta vecinal, solicitud o un insumo cambió. Actualiza el formulario.")
  }
  throw error
}
export async function updateDelivery(id: string, input: UpdateDeliveryInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.delivery.findUnique({ where: { id }, select: { requestId: true } })
      const requestIds = [
        ...new Set([original?.requestId, input.requestId].filter((value): value is string => Boolean(value))),
      ].sort()
      for (const requestId of requestIds)
        await tx.$queryRaw`SELECT id FROM "request" WHERE id = ${requestId} FOR UPDATE`
      await tx.$queryRaw`SELECT id FROM "delivery" WHERE id = ${id} FOR UPDATE`
      const current = await tx.delivery.findUnique({
        where: { id },
        select: { id: true, neighborhoodAssociationId: true, requestId: true, beneficiaryRut: true },
      })
      if (!current) throw new AppError(404, "La entrega no existe.")
      if (!input.beneficiaryRut && !current.beneficiaryRut)
        fail("beneficiaryRut", "Completa el RUT del beneficiario para actualizar esta entrega.")
      if (current.requestId !== original?.requestId)
        throw new AppError(409, "La solicitud vinculada cambió. Revisa la entrega.")
      if (current.requestId && input.requestId !== undefined && input.requestId !== current.requestId) {
        const source = await tx.request.findUniqueOrThrow({ where: { id: current.requestId } })
        assertAttended(source.status, source.response, false)
      }

      const eventId = await validateRelations(tx, input, id, current.neighborhoodAssociationId)
      const { items, ...fields } = input
      if (items) await tx.deliveryItem.deleteMany({ where: { deliveryId: id } })
      return tx.delivery.update({
        where: { id },
        data: {
          ...fields,
          ...(input.requestId !== undefined && { eventId }),
          ...(items && { items: { create: items } }),
        },
        include,
      })
    })
  } catch (error) {
    translateError(error)
  }
}
export async function deleteDelivery(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const original = await tx.delivery.findUnique({ where: { id }, select: { requestId: true } })
      if (!original) throw new AppError(404, "La entrega no existe.")
      if (original.requestId) {
        await tx.$queryRaw`SELECT id FROM "request" WHERE id = ${original.requestId} FOR UPDATE`
        const request = await tx.request.findUniqueOrThrow({ where: { id: original.requestId } })
        assertAttended(request.status, request.response, false)
      }
      await tx.$queryRaw`SELECT id FROM "delivery" WHERE id = ${id} FOR UPDATE`
      const current = await tx.delivery.findUniqueOrThrow({ where: { id }, select: { requestId: true } })
      if (current.requestId !== original.requestId)
        throw new AppError(409, "La solicitud vinculada cambió. Revisa la entrega.")
      await tx.delivery.delete({ where: { id } })
    })
  } catch (error) {
    translateError(error)
  }
}

export async function createDelivery(input: CreateDeliveryInput, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const year = deliveryFolioYear()
      // Todas las altas del año comparten el bloqueo hasta el commit: dos
      // solicitudes concurrentes no pueden reservar el mismo correlativo.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(684103, ${year}::integer)::text`
      const eventId = await validateRelations(tx, input)
      const { items, ...fields } = input
      return tx.delivery.create({
        data: {
          ...fields,
          eventId,
          createdBy: userId,
          folio: await reserveFolio(tx, "ENT", year),
          items: { create: items },
        },
        include,
      })
    })
  } catch (error) {
    translateError(error)
  }
}

export async function getRecurrence({ rut, date, excludeId }: { rut: string; date: string; excludeId?: string }) {
  const { start, end } = recurrencePeriod(date)
  const deliveries = await prisma.delivery.findMany({
    where: { beneficiaryRut: rut, date: { gte: start, lte: end }, ...(excludeId && { id: { not: excludeId } }) },
    select: {
      id: true,
      folio: true,
      date: true,
      items: { select: { quantity: true, supply: { select: { type: true, unit: true } } } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  })
  return { from: start.toISOString(), to: end.toISOString(), deliveries }
}
