import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID, randomInt } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { createActivity, updateActivity, deleteActivity, listActivities } from "./service"
import { createEvent, deleteEvent } from "@/features/events/service"
import { deleteEventType } from "@/features/event-types/service"
import { AppError } from "@/lib/api-error"
test(
  "eventos y actividades: relaciones, folios concurrentes, periodos y borrado protegido",
  { skip: process.env.RUN_WORKFLOWS_INTEGRATION !== "1" },
  async () => {
    const userId = `workflow-${randomUUID()}`
    const status = (code: number) => (error: unknown) => error instanceof AppError && error.status === code
    try {
      await prisma.user.create({ data: { id: userId, name: userId, email: `${userId}@example.invalid` } })
      const type = await prisma.eventType.create({ data: { name: userId, createdBy: userId } })
      const input = {
        date: "2026-11-15",
        sector: userId,
        typeId: type.id,
        affectedCount: null,
        institutions: "DGRD",
        actions: "Inspección",
      }
      const [a, b] = await Promise.all([createEvent(input, userId), createEvent(input, userId)])
      assert.notEqual(a.folio, b.folio)
      await assert.rejects(deleteEventType(type.id), status(409))
      await prisma.request.create({ data: { channel: "Prueba", folio: userId, eventId: a.id, createdBy: userId } })
      await assert.rejects(deleteEvent(a.id), status(409))
      await deleteEvent(b.id)
      const next = await createEvent(input, userId)
      assert.ok(
        Number(next.folio.split("-").at(-1)) >
          Math.max(Number(a.folio.split("-").at(-1)), Number(b.folio.split("-").at(-1))),
      )
      const action = await prisma.strategicAction.create({
        data: {
          number: randomInt(1000000),
          year: 2026,
          title: userId,
          topics: "Tema",
          implementation: "Plan",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-06-30"),
          createdBy: userId,
        },
      })
      const activity = await createActivity(
        { actionId: action.id, date: "2026-11-15", objective: userId, location: "Lugar", participants: "Vecinos" },
        userId,
      )
      assert.equal(activity.date.toISOString(), "2026-11-15T00:00:00.000Z")
      assert.equal((await listActivities({ actionId: action.id, from: "2026-11-15", to: "2026-11-15" })).data.length, 1)
      await updateActivity(activity.id, {
        actionId: action.id,
        date: "2026-11-16",
        objective: userId,
        location: "Otro lugar",
        participants: "Municipio",
      })
      assert.equal((await listActivities({ actionId: action.id, to: "2026-11-15" })).data.length, 0)
      await prisma.evidence.create({
        data: {
          activityId: activity.id,
          name: "Test",
          type: "application/pdf",
          size: 10,
          key: "isolated-test",
          createdBy: userId,
        },
      })
      await assert.rejects(deleteActivity(activity.id), status(409))
      await prisma.evidence.deleteMany({ where: { activityId: activity.id } })
      await deleteActivity(activity.id)
    } finally {
      await prisma.evidence.deleteMany({ where: { createdBy: userId } })
      await prisma.activity.deleteMany({ where: { createdBy: userId } })
      await prisma.strategicAction.deleteMany({ where: { createdBy: userId } })
      await prisma.request.deleteMany({ where: { createdBy: userId } })
      await prisma.event.deleteMany({ where: { createdBy: userId } })
      await prisma.eventType.deleteMany({ where: { createdBy: userId } })
      await prisma.user.deleteMany({ where: { id: userId } })
      await prisma.$disconnect()
    }
  },
)
