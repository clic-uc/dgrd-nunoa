import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID, randomInt } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/api-error"
import { createSupply, updateSupply, deleteSupply, getSupply, listSupplies } from "./service"
import { createDelivery, deleteDelivery, getDelivery, getDeliveryOptions } from "@/features/deliveries/service"
import { createDeliverySchema } from "@/features/deliveries/schemas"

// Habilitar únicamente contra una DB de desarrollo con las migraciones aplicadas.
test(
  "catálogo, índice único, historial y restricciones concurrentes en PostgreSQL",
  { skip: process.env.RUN_SUPPLY_INTEGRATION !== "1", timeout: 90000 },
  async () => {
    const userId = `supply-test-${randomUUID()}`
    const marker = userId
    let userCreated = false
    const hasStatus = (status: number) => (error: unknown) => error instanceof AppError && error.status === status
    try {
      await prisma.user.create({ data: { id: userId, name: marker, email: `${userId}@example.invalid` } })
      userCreated = true
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2100000000), name: marker, createdBy: userId },
      })
      const supply = await createSupply({ type: marker, unit: "unidad" }, userId)
      const variant = await createSupply({ type: marker, unit: "caja" }, userId)
      assert.equal((await listSupplies({ q: marker })).data.length, 2)
      await assert.rejects(createSupply({ type: marker.toUpperCase(), unit: "unidad" }, userId), hasStatus(409))
      // Omite la capa de servidor para comprobar el índice funcional real.
      await assert.rejects(
        prisma.supply.create({ data: { type: `  ${marker.toUpperCase()}  `, unit: " UNIDAD ", createdBy: userId } }),
        (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002",
      )
      await assert.rejects(updateSupply(variant.id, { unit: "unidad" }), hasStatus(409))
      const races = await Promise.allSettled([
        createSupply({ type: `${marker} concurrente`, unit: "kg" }, userId),
        createSupply({ type: `${marker} CONCURRENTE`, unit: "kg" }, userId),
      ])
      assert.equal(races.filter((result) => result.status === "fulfilled").length, 1)
      assert.equal(races.filter((result) => result.status === "rejected" && hasStatus(409)(result.reason)).length, 1)
      assert.equal((await updateSupply(supply.id, { unit: "kg" })).unit, "kg")
      await updateSupply(supply.id, { unit: "unidad" })
      const input = createDeliverySchema.parse({
        beneficiary: marker,
        beneficiaryRut: "12345678-5",
        neighborhoodAssociationId: association.id,
        address: "Prueba",
        date: "2026-10-14",
        items: [{ supplyId: supply.id, quantity: 2 }],
      })
      const first = await createDelivery(input, userId)
      const second = await createDelivery(
        { ...input, date: new Date("2026-10-15"), items: [{ supplyId: supply.id, quantity: 4 }] },
        userId,
      )
      const history = await getSupply(supply.id)
      assert.equal(history._count.items, 2)
      assert.equal(history.totalDistributed, 6)
      assert.equal(history.items[0].delivery.id, second.id)
      assert.equal((await getSupply(supply.id, "asc")).items[0].delivery.id, first.id)
      await assert.rejects(
        updateSupply(supply.id, { unit: "caja" }),
        (error) => hasStatus(409)(error) && Boolean((error as AppError).fieldErrors?.unit),
      )
      await assert.rejects(
        deleteSupply(supply.id),
        (error) => hasStatus(409)(error) && (error as AppError).details?.deliveryCount === 2,
      )
      await updateSupply(supply.id, { type: `${marker} renombrado` })
      assert.equal((await getDelivery(first.id)).items[0].supply.type, `${marker} renombrado`)
      assert.equal(
        (await getDeliveryOptions()).supplies.find((row) => row.id === supply.id)?.type,
        `${marker} renombrado`,
      )
      await deleteDelivery(first.id)
      await deleteDelivery(second.id)
      assert.equal((await getSupply(supply.id)).totalDistributed, 0)
      await deleteSupply(supply.id)
      await assert.rejects(getSupply(supply.id), hasStatus(404))
      await assert.rejects(updateSupply(supply.id, { type: marker }), hasStatus(404))
      await assert.rejects(deleteSupply(supply.id), hasStatus(404))

      // Una entrega en curso toma FOR SHARE; edición y borrado deben esperar a
      // que termine y luego ver la nueva referencia, nunca alterar su unidad.
      let locked!: () => void, proceed!: () => void
      const ready = new Promise<void>((resolve) => {
        locked = resolve
      })
      const insert = new Promise<void>((resolve) => {
        proceed = resolve
      })
      const reference = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM supply WHERE id = ${variant.id} FOR SHARE`
        locked()
        await insert
        return tx.delivery.create({
          data: {
            folio: marker,
            beneficiary: marker,
            beneficiaryRut: "12345678-5",
            neighborhoodAssociationId: association.id,
            address: "Prueba",
            date: new Date("2026-10-14"),
            createdBy: userId,
            items: { create: { supplyId: variant.id, quantity: 1 } },
          },
        })
      })
      await ready
      const changes = Promise.allSettled([updateSupply(variant.id, { unit: "litro" }), deleteSupply(variant.id)])
      proceed()
      await reference
      const results = await changes
      assert.equal(results.filter((result) => result.status === "rejected" && hasStatus(409)(result.reason)).length, 2)
      assert.equal((await getSupply(variant.id)).unit, "caja")
    } finally {
      try {
        if (userCreated) {
          await prisma.$transaction([
            prisma.delivery.deleteMany({ where: { createdBy: userId } }),
            prisma.supply.deleteMany({ where: { createdBy: userId } }),
            prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: userId } }),
            prisma.user.deleteMany({ where: { id: userId } }),
          ])
        }
      } finally {
        await prisma.$disconnect()
      }
    }
  },
)
