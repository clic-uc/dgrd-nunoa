import { AsyncLocalStorage } from "node:async_hooks"
import type { Prisma } from "@/generated/prisma/client"
/** Request-local transaction; never shares an actor or connection across requests. */
export const databaseContext = new AsyncLocalStorage<{ transaction: Prisma.TransactionClient; actorId: string }>()
