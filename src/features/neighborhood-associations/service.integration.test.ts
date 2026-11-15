import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID, randomInt } from "node:crypto"
import { readFileSync } from "node:fs"
import { Client } from "pg"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import {
  createNeighborhoodAssociation,
  updateNeighborhoodAssociation,
  deleteNeighborhoodAssociation,
  getNeighborhoodAssociation,
  listNeighborhoodAssociations,
} from "./service"
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDelivery,
  listDeliveries,
  getDeliveryOptions,
} from "@/features/deliveries/service"

const enabled = process.env.RUN_ASSOCIATION_INTEGRATION === "1"
test(
  "CRUD, historial, filtros, estado y concurrencia de juntas en PostgreSQL",
  { skip: !enabled, timeout: 90000 },
  async () => {
    const userId = `association-test-${randomUUID()}`,
      marker = userId
    let userCreated = false
    const hasStatus = (status: number) => (error: unknown) => error instanceof AppError && error.status === status
    try {
      await prisma.user.create({ data: { id: userId, name: marker, email: `${userId}@example.invalid` } })
      userCreated = true
      const number = randomInt(1000000000, 2000000000)
      const first = await createNeighborhoodAssociation({ number, name: marker, active: true }, userId)
      const second = await createNeighborhoodAssociation({ number: number + 1, name: marker, active: true }, userId)
      await assert.rejects(
        createNeighborhoodAssociation({ number, name: "Duplicada", active: true }, userId),
        (error) => hasStatus(409)(error) && Boolean((error as AppError).fieldErrors?.number),
      )
      await assert.rejects(updateNeighborhoodAssociation(second.id, { number }), hasStatus(409))
      const races = await Promise.allSettled([
        createNeighborhoodAssociation({ number: number + 2, name: marker, active: true }, userId),
        createNeighborhoodAssociation({ number: number + 2, name: marker, active: true }, userId),
      ])
      assert.equal(races.filter((result) => result.status === "fulfilled").length, 1)
      assert.equal(races.filter((result) => result.status === "rejected" && hasStatus(409)(result.reason)).length, 1)
      assert.equal((await listNeighborhoodAssociations({ q: String(number) })).data[0].id, first.id)
      const supply = await prisma.supply.create({ data: { type: marker, unit: "unidad", createdBy: userId } })
      const input = {
        beneficiary: marker,
        beneficiaryRut: "12345678-5",
        neighborhoodAssociationId: first.id,
        contact: null,
        address: "Prueba",
        date: new Date("2026-10-14"),
        items: [{ supplyId: supply.id, quantity: 3 }],
      }
      const delivery = await createDelivery(input, userId)
      const next = await createDelivery(
        { ...input, neighborhoodAssociationId: second.id, date: new Date("2026-10-15") },
        userId,
      )
      assert.equal((await listDeliveries({ q: marker })).stats.neighborhoods, 2)
      assert.equal((await listDeliveries({ neighborhoodAssociationId: first.id })).data.length, 1)
      assert.equal((await listDeliveries({ q: String(number) })).data[0].id, delivery.id)
      const history = await getNeighborhoodAssociation(first.id)
      assert.equal(history._count.deliveries, 1)
      assert.equal(history.totalUnits, 3)
      assert.equal(history.deliveries[0].id, delivery.id)
      await assert.rejects(
        deleteNeighborhoodAssociation(first.id),
        (error) => hasStatus(409)(error) && (error as AppError).details?.deliveryCount === 1,
      )
      // La FK protege incluso si se omite el servicio.
      await assert.rejects(
        prisma.neighborhoodAssociation.delete({ where: { id: first.id } }),
        (error: unknown) => error instanceof Error && error.message.includes("delivery_neighborhoodAssociationId_fkey"),
      )
      await updateNeighborhoodAssociation(first.id, { name: `${marker} corregida`, number: number + 3, active: false })
      assert.equal((await getDelivery(delivery.id)).neighborhoodAssociation?.name, `${marker} corregida`)
      assert.equal((await listNeighborhoodAssociations({ q: marker, status: "inactive" })).data.length, 1)
      assert.equal(
        (await getDeliveryOptions()).neighborhoodAssociations.find((row) => row.id === first.id)?.active,
        false,
      )
      await assert.rejects(createDelivery(input, userId), hasStatus(409))
      await assert.rejects(updateDelivery(next.id, { neighborhoodAssociationId: first.id }), hasStatus(409))
      assert.equal(
        (await updateDelivery(delivery.id, { neighborhoodAssociationId: first.id, address: "Corregida" })).address,
        "Corregida",
      )
      await updateDelivery(delivery.id, { contact: "123" })
      await assert.rejects(
        createDelivery({ ...input, neighborhoodAssociationId: "clxxxxxxxxxxxxxxxxxxxxxxx" }, userId),
        hasStatus(400),
      )
      await updateNeighborhoodAssociation(first.id, { active: true })
      await deleteDelivery(delivery.id)
      await deleteNeighborhoodAssociation(first.id)
      await assert.rejects(getNeighborhoodAssociation(first.id), hasStatus(404))
      await assert.rejects(updateNeighborhoodAssociation(first.id, { name: marker }), hasStatus(404))
      await assert.rejects(deleteNeighborhoodAssociation(first.id), hasStatus(404))

      const raceAssociation = await createNeighborhoodAssociation(
        { number: number + 4, name: marker, active: true },
        userId,
      )
      let locked!: () => void, proceed!: () => void
      const ready = new Promise<void>((resolve) => {
        locked = resolve
      })
      const insert = new Promise<void>((resolve) => {
        proceed = resolve
      })
      const reference = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM neighborhood_association WHERE id = ${raceAssociation.id} FOR SHARE`
        locked()
        await insert
        return tx.delivery.create({
          data: {
            folio: marker,
            beneficiary: marker,
            beneficiaryRut: "12345678-5",
            neighborhoodAssociationId: raceAssociation.id,
            address: "Prueba",
            date: new Date("2026-10-14"),
            createdBy: userId,
          },
        })
      })
      await ready
      const changes = Promise.allSettled([
        deleteNeighborhoodAssociation(raceAssociation.id),
        updateNeighborhoodAssociation(raceAssociation.id, { active: false }),
      ])
      proceed()
      await reference
      const results = await changes
      assert.equal(results[0].status, "rejected")
      assert.equal(results[1].status, "fulfilled")
      assert.equal((await getNeighborhoodAssociation(raceAssociation.id)).active, false)
      await assert.rejects(
        createDelivery({ ...input, neighborhoodAssociationId: raceAssociation.id }, userId),
        hasStatus(409),
      )
    } finally {
      try {
        if (userCreated)
          await prisma.$transaction([
            prisma.delivery.deleteMany({ where: { createdBy: userId } }),
            prisma.supply.deleteMany({ where: { createdBy: userId } }),
            prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: userId } }),
            prisma.user.deleteMany({ where: { id: userId } }),
          ])
      } finally {
        await prisma.$disconnect()
      }
    }
  },
)

test("la migración aborta sin modificar entregas con jv legado", { skip: !enabled, timeout: 30000 }, async () => {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL })
  try {
    await client.connect()
    // Tablas temporales de esta conexión: no se modifica el esquema público.
    await client.query("CREATE TEMP TABLE delivery (jv TEXT NOT NULL)")
    await client.query("INSERT INTO delivery (jv) VALUES ('Texto legado a preservar')")
    const sql = readFileSync("prisma/migrations/20261015000000_neighborhood_associations/migration.sql", "utf8")
    await assert.rejects(client.query(sql), /mapeo revisado/)
    await client.query("ROLLBACK")
    const { rows } = await client.query("SELECT jv FROM delivery")
    assert.equal(rows[0].jv, "Texto legado a preservar")
  } finally {
    await client.end()
  }
})

test(
  "desglose por junta: fechas inclusivas, insumos, agregados e historial inactivo",
  { skip: !enabled, timeout: 60000 },
  async () => {
    const userId = `association-breakdown-${randomUUID()}`
    let created = false
    try {
      await prisma.user.create({ data: { id: userId, name: userId, email: `${userId}@example.invalid` } })
      created = true
      const number = randomInt(1000000000, 2000000000)
      const association = await createNeighborhoodAssociation({ number, name: userId, active: true }, userId)
      const other = await createNeighborhoodAssociation({ number: number + 1, name: userId, active: true }, userId)
      const kg = await prisma.supply.create({ data: { type: userId, unit: "kg", createdBy: userId } })
      const box = await prisma.supply.create({ data: { type: userId, unit: "caja", createdBy: userId } })
      const unrelated = await prisma.supply.create({
        data: { type: `${userId}-otro`, unit: "litro", createdBy: userId },
      })
      const dates = ["2026-01-01", "2026-01-31", "2026-02-01"]
      const ids: string[] = []
      for (const [index, date] of dates.entries()) {
        const delivery = await prisma.delivery.create({
          data: {
            folio: `${userId}-${index}`,
            beneficiary: "Beneficiario de prueba",
            beneficiaryRut: "12345678-5",
            address: "Prueba",
            date: new Date(date),
            neighborhoodAssociationId: association.id,
            createdBy: userId,
            items: {
              create: [
                { supplyId: kg.id, quantity: index + 1 },
                ...(index === 0 ? [{ supplyId: box.id, quantity: 8 }] : []),
              ],
            },
          },
        })
        ids.push(delivery.id)
      }
      await prisma.delivery.create({
        data: {
          folio: `${userId}-otra-junta`,
          beneficiary: "Otro",
          beneficiaryRut: "12345678-5",
          address: "Prueba",
          date: new Date("2026-01-01"),
          neighborhoodAssociationId: other.id,
          createdBy: userId,
          items: { create: [{ supplyId: unrelated.id, quantity: 100 }] },
        },
      })
      const january = await getNeighborhoodAssociation(association.id, {
        from: "2026-01-01",
        to: "2026-01-31",
        order: "asc",
      })
      assert.equal(january._count.deliveries, 3) // Global count must remain safe for delete dialogs.
      assert.equal(january.filteredDeliveryCount, 2)
      assert.deepEqual(
        january.deliveries.map((row) => row.id),
        ids.slice(0, 2),
      )
      assert.equal(january.supplyBreakdown.find((row) => row.id === kg.id)?.quantity, 3)
      assert.equal(january.supplyBreakdown.find((row) => row.id === kg.id)?.deliveryCount, 2)
      assert.deepEqual(january.totalsByUnit, [
        { unit: "caja", quantity: 8 },
        { unit: "kg", quantity: 3 },
      ])
      const selected = await getNeighborhoodAssociation(association.id, { supplyId: box.id, to: "2026-01-31" })
      assert.equal(selected.filteredDeliveryCount, 1)
      assert.equal(selected.deliveries[0].items.length, 1)
      assert.equal(selected.deliveries[0].items[0].supply.id, box.id)
      assert.equal(selected.supplyBreakdown[0].quantity, 8)
      const singleDay = await getNeighborhoodAssociation(association.id, { from: "2026-01-31", to: "2026-01-31" })
      assert.deepEqual(
        singleDay.deliveries.map((row) => row.id),
        [ids[1]],
      )
      const empty = await getNeighborhoodAssociation(association.id, { from: "2027-01-01" })
      assert.equal(empty.filteredDeliveryCount, 0)
      assert.deepEqual(empty.totalsByUnit, [])
      assert.deepEqual(new Set(empty.availableSupplies.map((row) => row.id)), new Set([kg.id, box.id]))
      assert.equal(
        (await getNeighborhoodAssociation(association.id, { supplyId: unrelated.id })).filteredDeliveryCount,
        0,
      )
      assert.equal((await getNeighborhoodAssociation(association.id, { to: "2025-12-31" })).filteredDeliveryCount, 0)
      await updateNeighborhoodAssociation(association.id, { active: false })
      assert.equal((await getNeighborhoodAssociation(association.id)).filteredDeliveryCount, 3)
      assert.deepEqual(
        (await getNeighborhoodAssociation(association.id, "asc")).deliveries.map((row) => row.id),
        ids,
      )
    } finally {
      if (created)
        await prisma.$transaction([
          prisma.delivery.deleteMany({ where: { createdBy: userId } }),
          prisma.supply.deleteMany({ where: { createdBy: userId } }),
          prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: userId } }),
          prisma.user.deleteMany({ where: { id: userId } }),
        ])
      await prisma.$disconnect()
    }
  },
)
