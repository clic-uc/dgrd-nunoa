import { databaseContext } from "./database-context"
import type { Prisma } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prismaRoot = globalThis.prismaGlobal ?? prismaClientSingleton()

const prisma = new Proxy(prismaRoot, {
  get(target, property) {
    const transaction = databaseContext.getStore()?.transaction
    if (transaction && property === "$transaction") {
      return (operation: ((tx: Prisma.TransactionClient) => unknown) | Promise<unknown>[]) =>
        typeof operation === "function" ? operation(transaction) : Promise.all(operation)
    }
    const client = transaction ?? target
    const value = Reflect.get(client, property)
    return typeof value === "function" ? value.bind(client) : value
  },
})

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prismaRoot
