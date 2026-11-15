import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type { ActivityInput, ActivityQuery } from "./schemas"
const include = {
  action: { select: { id: true, title: true, startDate: true, endDate: true } },
  _count: { select: { evidence: true } },
} as const
export async function listActivities({ actionId, q, from, to }: ActivityQuery = {}) {
  return {
    data: await prisma.activity.findMany({
      where: {
        ...(actionId && { actionId }),
        ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
        ...(q && {
          OR: ["objective", "location", "participants"].map((field) => ({
            [field]: { contains: q, mode: "insensitive" },
          })),
        }),
      },
      include,
      orderBy: [{ date: "asc" }, { id: "asc" }],
    }),
  }
}
export async function getActivity(id: string) {
  const activity = await prisma.activity.findUnique({ where: { id }, include })
  if (!activity) throw new AppError(404, "La actividad no existe.")
  return activity
}
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new AppError(404, "La actividad no existe.")
    if (error.code === "P2003") throw new AppError(409, "La acción estratégica cambió. Actualiza el formulario.")
  }
  throw error
}
async function save(input: ActivityInput, userId?: string, id?: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const actions = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM strategic_action WHERE id = ${input.actionId} FOR SHARE`
      if (!actions.length)
        throw new AppError(409, "La acción estratégica ya no existe.", {
          fieldErrors: { actionId: ["Selecciona otra acción."] },
        })
      const data = { ...input, date: new Date(`${input.date}T00:00:00.000Z`) }
      return id
        ? tx.activity.update({ where: { id }, data, include })
        : tx.activity.create({ data: { ...data, createdBy: userId! }, include })
    })
  } catch (e) {
    translate(e)
  }
}
export const createActivity = (input: ActivityInput, userId: string) => save(input, userId)
export const updateActivity = (id: string, input: ActivityInput) => save(input, undefined, id)
export async function deleteActivity(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM activity WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new AppError(404, "La actividad no existe.")
      if (await tx.evidence.count({ where: { activityId: id } }))
        throw new AppError(
          409,
          "La actividad contiene evidencia. Su eliminación se habilitará junto con la gestión de archivos.",
        )
      await tx.activity.delete({ where: { id } })
    })
  } catch (e) {
    translate(e)
  }
}
