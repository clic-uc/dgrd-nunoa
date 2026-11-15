import "dotenv/config"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { createDelivery } from "@/features/deliveries/service"
import { createDeliverySchema } from "@/features/deliveries/schemas"
import { createRequestSchema } from "./schemas"
import { createRequest, deleteRequest, getRequest, listRequests, updateRequest } from "./service"

// Habilitar únicamente contra una DB de desarrollo con las migraciones aplicadas.
test(
  "folio, sincronización de evento con la entrega y borrado en cascada confirmado",
  { skip: process.env.RUN_REQUEST_INTEGRATION !== "1", timeout: 90000 },
  async () => {
    const userId = `request-test-${randomUUID()}`
    const marker = userId
    const hasStatus = (status: number) => (error: unknown) => error instanceof AppError && error.status === status
    await prisma.user.create({ data: { id: userId, name: marker, email: `${userId}@example.invalid` } })
    try {
      const type = await prisma.eventType.create({ data: { name: marker, createdBy: userId } })
      const eventData = { date: new Date(), sector: marker, institutions: "-", actions: "-", typeId: type.id }
      const [first, second] = await Promise.all(
        ["A", "B"].map((suffix) =>
          prisma.event.create({ data: { ...eventData, folio: `${marker}-${suffix}`, createdBy: userId } }),
        ),
      )
      const association = await prisma.neighborhoodAssociation.create({
        data: { number: randomInt(1000000000, 2100000000), name: marker, createdBy: userId },
      })
      const supply = await prisma.supply.create({ data: { type: marker, unit: "unidad", createdBy: userId } })

      // Altas concurrentes: folios distintos y correlativos.
      const [a, b] = await Promise.all([
        createRequest(createRequestSchema.parse({ channel: marker, eventId: first.id }), userId),
        createRequest(createRequestSchema.parse({ channel: marker }), userId),
      ])
      assert.notEqual(a.folio, b.folio)
      assert.match(a.folio, /^SOL-\d{4}-\d{3,}$/)
      assert.equal((await listRequests({ q: marker, event: "with" })).data.length, 1)
      assert.equal((await listRequests({ q: marker, event: "without" })).data.length, 1)
      await assert.rejects(
        createRequest(createRequestSchema.parse({ channel: marker, eventId: "cm00000000000000000000000" }), userId),
        hasStatus(409),
      )

      const delivery = await createDelivery(
        createDeliverySchema.parse({
          beneficiary: marker,
          beneficiaryRut: "12345678-5",
          neighborhoodAssociationId: association.id,
          address: "Prueba",
          date: "2026-10-14",
          requestId: a.id,
          items: [{ supplyId: supply.id, quantity: 1 }],
        }),
        userId,
      )
      assert.equal(delivery.eventId, first.id)

      // B04: cambiar o quitar el evento de la solicitud se propaga a su entrega.
      await updateRequest(a.id, { eventId: second.id })
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, second.id)
      await updateRequest(a.id, { status: "attended" })
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, second.id)
      await updateRequest(a.id, { eventId: null })
      assert.equal((await prisma.delivery.findUniqueOrThrow({ where: { id: delivery.id } })).eventId, null)
      assert.equal((await getRequest(a.id)).delivery?.id, delivery.id)

      // B11: el borrado se rechaza si la entrega no es la que se mostró, y luego cae en cascada.
      await assert.rejects(deleteRequest(a.id, ""), hasStatus(409))
      await deleteRequest(a.id, delivery.id)
      assert.equal(await prisma.delivery.findUnique({ where: { id: delivery.id } }), null)
      await assert.rejects(getRequest(a.id), hasStatus(404))
      await deleteRequest(b.id)
    } finally {
      await prisma.deliveryItem.deleteMany({ where: { delivery: { createdBy: userId } } })
      await prisma.delivery.deleteMany({ where: { createdBy: userId } })
      await prisma.request.deleteMany({ where: { createdBy: userId } })
      await prisma.event.deleteMany({ where: { createdBy: userId } })
      await prisma.eventType.deleteMany({ where: { createdBy: userId } })
      await prisma.supply.deleteMany({ where: { createdBy: userId } })
      await prisma.neighborhoodAssociation.deleteMany({ where: { createdBy: userId } })
      await prisma.user.delete({ where: { id: userId } })
      await prisma.$disconnect()
    }
  },
)
