import prisma from "@/lib/prisma"
import type { AuditQuery } from "./schemas"
export async function listAudit({ entity, actor, from, to, cursor }: AuditQuery) {
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(entity && { entity }),
      ...(actor && { OR: [{ actorName: { contains: actor, mode: "insensitive" } }, { actorId: actor }] }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
              ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
            },
          }
        : {}),
      ...(cursor && { id: { lt: BigInt(cursor) } }),
    },
    orderBy: { id: "desc" },
    take: 51,
  })
  const data = rows.slice(0, 50).map((row) => ({ ...row, id: String(row.id) }))
  return { data, nextCursor: rows.length > 50 ? data.at(-1)!.id : null }
}
