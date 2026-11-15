import { randomUUID } from "node:crypto"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import type { UserInput } from "./schemas"
const select = {
  id: true,
  name: true,
  email: true,
  role: true,
  banned: true,
  createdAt: true,
  _count: {
    select: {
      eventTypes: true,
      supplies: true,
      neighborhoodAssociations: true,
      events: true,
      requests: true,
      deliveries: true,
      strategicActions: true,
      activities: true,
      evidence: true,
    },
  },
} as const
function dto(user: Prisma.UserGetPayload<{ select: typeof select }>) {
  const { _count, ...fields } = user
  return { ...fields, historyCount: Object.values(_count).reduce((sum, value) => sum + value, 0) }
}
export async function listUsers(q = "") {
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {},
    select,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  })
  const logs = await prisma.auditLog.groupBy({
    by: ["actorId"],
    where: { actorId: { in: users.map((user) => user.id) } },
    _count: { _all: true },
  })
  const counts = new Map(logs.map((log) => [log.actorId, log._count._all]))
  return {
    data: users.map((user) => ({ ...dto(user), historyCount: dto(user).historyCount + (counts.get(user.id) ?? 0) })),
  }
}
async function lockAdministration(tx: Prisma.TransactionClient, actorId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(684105, 0)::text`
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, banned: true } })
  if (!actor || actor.role !== "admin" || actor.banned)
    throw new AppError(403, "Ya no tienes permisos para administrar cuentas.")
}
function translate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      throw new AppError(409, "Ya existe una cuenta con ese correo.", {
        fieldErrors: { email: ["Este correo ya está registrado."] },
      })
    if (error.code === "P2025") throw new AppError(404, "La cuenta no existe.")
  }
  throw error
}
export async function saveUser(input: UserInput, actorId: string, id?: string) {
  const domain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "nunoa.cl").toLowerCase()
  if (!input.email.endsWith(`@${domain}`))
    throw new AppError(400, `El correo debe pertenecer a @${domain}.`, {
      fieldErrors: { email: [`Usa un correo @${domain}.`] },
    })
  const hashedPassword = input.password ? await (await auth.$context).password.hash(input.password) : undefined
  try {
    return await prisma.$transaction(async (tx) => {
      await lockAdministration(tx, actorId)
      const current = id ? await tx.user.findUnique({ where: { id }, select }) : null
      if (id && !current) throw new AppError(404, "La cuenta no existe.")
      if (current?.id === actorId && (input.role !== current.role || input.banned))
        throw new AppError(409, "No puedes cambiar tu propio rol ni desactivar tu cuenta.")
      if (
        current?.role === "admin" &&
        !current.banned &&
        (input.role !== "admin" || input.banned) &&
        (await tx.user.count({ where: { role: "admin", OR: [{ banned: false }, { banned: null }] } })) <= 1
      )
        throw new AppError(409, "Debe quedar al menos un administrador activo.")
      const userId = id ?? randomUUID()
      const data = {
        name: input.name,
        email: input.email,
        role: input.role,
        banned: input.banned,
        banReason: input.banned ? "Desactivada desde administración" : null,
        banExpires: null,
      }
      const user = current
        ? await tx.user.update({ where: { id: userId }, data, select })
        : await tx.user.create({ data: { ...data, id: userId, emailVerified: false }, select })
      if (current && hashedPassword)
        await tx.auditLog.create({
          data: {
            actorId,
            actorName: (await tx.user.findUnique({ where: { id: actorId }, select: { name: true } }))?.name,
            entity: "user",
            recordId: userId,
            operation: "PASSWORD_RESET",
          },
        })
      if (hashedPassword) {
        const account = await tx.account.findFirst({
          where: { userId, providerId: "credential" },
          select: { id: true },
        })
        if (account) await tx.account.update({ where: { id: account.id }, data: { password: hashedPassword } })
        else
          await tx.account.create({
            data: { id: randomUUID(), userId, providerId: "credential", accountId: userId, password: hashedPassword },
          })
      }
      if (
        current &&
        (hashedPassword ||
          current.role !== input.role ||
          current.banned !== input.banned ||
          current.email !== input.email)
      )
        await tx.session.deleteMany({ where: { userId } })
      return dto(user)
    })
  } catch (e) {
    translate(e)
  }
}
export async function deleteUser(id: string, actorId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await lockAdministration(tx, actorId)
      if (id === actorId) throw new AppError(409, "No puedes eliminar tu propia cuenta.")
      const user = await tx.user.findUnique({ where: { id }, select })
      if (!user) throw new AppError(404, "La cuenta no existe.")
      if (dto(user).historyCount || (await tx.auditLog.count({ where: { actorId: id } })))
        throw new AppError(409, "La cuenta tiene historial. Desactívala para conservar los registros.")
      if (
        user.role === "admin" &&
        !user.banned &&
        (await tx.user.count({ where: { role: "admin", OR: [{ banned: false }, { banned: null }] } })) <= 1
      )
        throw new AppError(409, "Debe quedar al menos un administrador activo.")
      await tx.user.delete({ where: { id } })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
      throw new AppError(409, "La cuenta tiene historial y no puede eliminarse.")
    translate(e)
  }
}
