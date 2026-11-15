import { prismaRoot } from "./prisma"
import { databaseContext } from "./database-context"
/** Domain writes and their audit records commit or roll back together. */
export async function withAudit<T>(actorId: string, operation: () => Promise<T>): Promise<T> {
  const existing = databaseContext.getStore()
  if (existing) {
    if (existing.actorId !== actorId) throw new Error("No se puede cambiar el ejecutor de una transacción.")
    return operation()
  }
  return prismaRoot.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.actor_id', ${actorId}, true)`
      return databaseContext.run({ transaction: tx, actorId }, operation)
    },
    { maxWait: 10000, timeout: 30000 },
  )
}
