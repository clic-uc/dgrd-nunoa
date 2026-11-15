import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type { EventTypeInput } from "./schemas"
const select = { id: true, name: true, _count: { select: { events: true } } } as const
export async function listEventTypes(q?: string) {
  return {
    data: await prisma.eventType.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      select,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  }
}
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "El tipo de evento no existe.")
    if (error.code === "P2003") throw new AppError(409, "El tipo está asociado a eventos y no puede eliminarse.")
  }
  throw error
}
export async function saveEventType(input: EventTypeInput, userId: string, id?: string) {
  try {
    return id
      ? await prisma.eventType.update({ where: { id }, data: input, select })
      : await prisma.eventType.create({ data: { ...input, createdBy: userId }, select })
  } catch (error) {
    translate(error)
  }
}
export async function deleteEventType(id: string) {
  try {
    await prisma.eventType.delete({ where: { id } })
  } catch (error) {
    translate(error)
  }
}
