import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID, randomInt } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import {
  createDelivery,
  updateDelivery,
  deleteDelivery,
  getDelivery,
  getDeliveryOptions,
  listDeliveries,
  getRecurrence,
} from "./service"
import { createDeliverySchema, updateDeliverySchema } from "./schemas"

// Usa fixtures aislados y los retira aun si una aserción falla. Requiere una DB
// de desarrollo con las migraciones aplicadas; nunca corre por defecto.
test(
  "CRUD, filtros, relaciones y altas concurrentes en PostgreSQL",
  { skip: process.env.RUN_DELIVERY_INTEGRATION !== "1", timeout: 60000 },
  async () => {
    const marker = `delivery-test-${randomUUID()}`
    const userId = marker
    try {
      await prisma.user.create({ data: { id: userId, name: marker, email: `${marker}@example.invalid` } })
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2100000000), name: marker, createdBy: userId },
      })
      const supply = await prisma.supply.create({ data: { type: marker, unit: "unidad", createdBy: userId } })
      const secondSupply = await prisma.supply.create({ data: { type: marker, unit: "caja", createdBy: userId } })
      const type = await prisma.eventType.create({ data: { name: marker, createdBy: userId } })
      const event = await prisma.event.create({
        data: {
          folio: marker,
          date: new Date("2026-10-14"),
          sector: marker,
          institutions: "Test",
          actions: "Test",
          typeId: type.id,
          createdBy: userId,
        },
      })
      const request = await prisma.request.create({
        data: { folio: marker, channel: "Test", eventId: event.id, createdBy: userId },
      })
      const input = createDeliverySchema.parse({
        beneficiary: marker,
        beneficiaryRut: "12345678-5",
        neighborhoodAssociationId: association.id,
        address: "Calle de prueba",
        date: "2026-10-14",
        requestId: request.id,
        items: [{ supplyId: supply.id, quantity: 2 }],
      })
      const delivery = await createDelivery(input, userId)
      const recurrence = await getRecurrence({ rut: "12345678-5", date: "2026-10-14" })
      assert.ok(recurrence.deliveries.some((row) => row.id === delivery.id))
      assert.ok(
        !(await getRecurrence({ rut: "12345678-5", date: "2026-10-14", excludeId: delivery.id })).deliveries.some(
          (row) => row.id === delivery.id,
        ),
      )
      assert.ok(
        !(await getRecurrence({ rut: "12345678-5", date: "2027-04-15" })).deliveries.some(
          (row) => row.id === delivery.id,
        ),
      )
      assert.ok(
        !(await getRecurrence({ rut: "11111111-1", date: "2026-10-14" })).deliveries.some(
          (row) => row.id === delivery.id,
        ),
      )
      assert.equal(delivery.eventId, event.id)
      assert.equal(delivery.contact, null)
      assert.equal(delivery.items[0].quantity, 2)
      assert.equal((await getDelivery(delivery.id)).creator.name, marker)
      const noAssociation = await createDelivery({ ...input, requestId: null, neighborhoodAssociationId: null }, userId)
      assert.equal(noAssociation.neighborhoodAssociation, null)
      const without = await listDeliveries({ q: marker, association: "without" })
      assert.deepEqual(
        without.data.map((row) => row.id),
        [noAssociation.id],
      )
      assert.equal(without.stats.neighborhoods, 0)
      await updateDelivery(noAssociation.id, { neighborhoodAssociationId: association.id })
      assert.equal((await getDelivery(noAssociation.id)).neighborhoodAssociation?.id, association.id)
      await updateDelivery(noAssociation.id, { neighborhoodAssociationId: null })
      await deleteDelivery(noAssociation.id)
      await assert.rejects(
        createDelivery(input, userId),
        (error: unknown) => error instanceof AppError && error.status === 409 && Boolean(error.fieldErrors?.requestId),
      )
      const options = await getDeliveryOptions()
      assert.equal(options.requests.find((row) => row.id === request.id)?.delivery?.id, delivery.id)
      const query = { q: marker, from: "2026-10-14", to: "2026-10-14", event: "with" as const, supplyId: supply.id }
      const listed = await listDeliveries(query)
      assert.equal(
        (
          await listDeliveries({
            ...query,
            beneficiary: marker,
            eventId: event.id,
            neighborhoodAssociationId: association.id,
          })
        ).data.length,
        1,
      )
      assert.equal((await listDeliveries({ ...query, beneficiary: "does-not-exist" })).data.length, 0)
      assert.equal(listed.stats.deliveries, 1)
      assert.equal(listed.stats.units, 2)
      assert.equal(listed.stats.neighborhoods, 1)
      assert.equal((await listDeliveries({ ...query, from: "2026-10-15", to: "2026-10-15" })).data.length, 0)
      assert.equal((await listDeliveries({ ...query, event: "without" })).data.length, 0)
      const edited = await updateDelivery(
        delivery.id,
        updateDeliverySchema.parse({ contact: "123", items: [{ supplyId: secondSupply.id, quantity: 5 }] }),
      )
      assert.equal(edited.items.length, 1)
      assert.equal(edited.items[0].supplyId, secondSupply.id)
      assert.equal(edited.requestId, request.id)
      await assert.rejects(
        updateDelivery(
          delivery.id,
          updateDeliverySchema.parse({ items: [{ supplyId: "clxxxxxxxxxxxxxxxxxxxxxxx", quantity: 1 }] }),
        ),
        AppError,
      )
      assert.equal((await getDelivery(delivery.id)).items[0].quantity, 5)
      const detached = await updateDelivery(delivery.id, { requestId: null, contact: null })
      assert.equal(detached.eventId, null)
      assert.equal(detached.requestId, null)
      const independent = { ...input, requestId: null }
      const concurrent = await Promise.all([createDelivery(independent, userId), createDelivery(independent, userId)])
      assert.notEqual(concurrent[0].folio, concurrent[1].folio)
      const races = await Promise.allSettled([createDelivery(input, userId), createDelivery(input, userId)])
      assert.equal(races.filter((result) => result.status === "fulfilled").length, 1)
      await deleteDelivery(delivery.id)
      await assert.rejects(
        getDelivery(delivery.id),
        (error: unknown) => error instanceof AppError && error.status === 404,
      )
      assert.ok(await prisma.request.findUnique({ where: { id: request.id } }))
      assert.ok(await prisma.event.findUnique({ where: { id: event.id } }))
      assert.ok(await prisma.supply.findUnique({ where: { id: supply.id } }))
    } finally {
      await prisma.delivery.deleteMany({ where: { createdBy: userId } })
      await prisma.request.deleteMany({ where: { createdBy: userId } })
      await prisma.event.deleteMany({ where: { createdBy: userId } })
      await prisma.supply.deleteMany({ where: { createdBy: userId } })
      await prisma.eventType.deleteMany({ where: { createdBy: userId } })
      await prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: userId } })
      await prisma.user.deleteMany({ where: { id: userId } })
      await prisma.$disconnect()
    }
  },
)
