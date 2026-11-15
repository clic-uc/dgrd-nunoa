import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import { reserveFolio } from "@/lib/folio"
import { deliveryFolioYear } from "@/features/deliveries/folio"
import type { EventInput, EventQuery } from "./schemas"
const include = {
  type: { select: { id: true, name: true } },
  _count: { select: { requests: true, deliveries: true } },
} as const
export async function listEvents({ q, typeId, from, to }: EventQuery = {}) {
  return {
    data: await prisma.event.findMany({
      where: {
        ...(typeId && { typeId }),
        ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
        ...(q && {
          OR: ["folio", "sector", "institutions", "actions"].map((field) => ({
            [field]: { contains: q, mode: "insensitive" },
          })),
        }),
      },
      include,
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
  }
}
export async function getEvent(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      ...include,
      requests: { select: { id: true, folio: true, channel: true, status: true }, orderBy: { createdAt: "desc" } },
      deliveries: { select: { id: true, folio: true, date: true, beneficiary: true }, orderBy: { date: "desc" } },
    },
  })
  if (!event) throw new AppError(404, "El evento no existe.")
  return event
}
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "El evento no existe.")
    if (error.code === "P2003") throw new AppError(409, "El tipo de evento cambió. Actualiza el formulario.")
  }
  throw error
}
async function save(input: EventInput, userId?: string, id?: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const types = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM event_type WHERE id = ${input.typeId} FOR SHARE`
      if (!types.length)
        throw new AppError(409, "El tipo de evento ya no existe.", {
          fieldErrors: { typeId: ["Selecciona otro tipo de evento."] },
        })
      const data = { ...input, date: new Date(`${input.date}T00:00:00.000Z`) }
      return id
        ? tx.event.update({ where: { id }, data, include })
        : tx.event.create({
            data: { ...data, createdBy: userId!, folio: await reserveFolio(tx, "EVT", deliveryFolioYear()) },
            include,
          })
    })
  } catch (e) {
    translate(e)
  }
}
export const createEvent = (input: EventInput, userId: string) => save(input, userId)
export const updateEvent = (id: string, input: EventInput) => save(input, undefined, id)
export async function deleteEvent(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "event" WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new AppError(404, "El evento no existe.")
      const event = await tx.event.findUniqueOrThrow({
        where: { id },
        select: { _count: { select: { requests: true, deliveries: true } } },
      })
      if (event._count.requests || event._count.deliveries)
        throw new AppError(409, "El evento tiene solicitudes o entregas vinculadas y no puede eliminarse.")
      await tx.event.delete({ where: { id } })
    })
  } catch (e) {
    translate(e)
  }
}
