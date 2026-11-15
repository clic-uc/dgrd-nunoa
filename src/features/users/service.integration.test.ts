import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { AppError } from "@/lib/api-error"
import { saveUser, deleteUser, listUsers } from "./service"
test(
  "cuentas: dominio, historial, revocación, propia cuenta y administradores concurrentes",
  { skip: process.env.RUN_USERS_INTEGRATION !== "1", timeout: 60000 },
  async () => {
    const marker = `users-${randomUUID()}`
    const actorId = marker
    const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "nunoa.cl"
    const input = {
      name: marker,
      email: `${marker}@${domain}`,
      role: "user" as const,
      banned: false,
      password: "test-password-123",
    }
    const status = (code: number) => (error: unknown) => error instanceof AppError && error.status === code
    try {
      await prisma.user.create({
        data: { id: actorId, name: marker, email: `admin-${marker}@${domain}`, role: "admin", banned: false },
      })
      await assert.rejects(saveUser({ ...input, email: `${marker}@example.invalid` }, actorId), status(400))
      const user = await saveUser(input, actorId)
      assert.ok((await listUsers(marker)).data.some((row) => row.id === user.id))
      const now = new Date()
      await prisma.session.create({
        data: {
          id: marker,
          userId: user.id,
          token: marker,
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: now,
          updatedAt: now,
        },
      })
      await saveUser({ ...input, password: "", banned: true }, actorId, user.id)
      assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0)
      await saveUser({ ...input, password: "another-test-password" }, actorId, user.id)
      await prisma.eventType.create({ data: { name: marker, createdBy: user.id } })
      await assert.rejects(deleteUser(user.id, actorId), status(409))
      await assert.rejects(
        saveUser({ ...input, email: `admin-${marker}@${domain}`, role: "user", password: "" }, actorId, actorId),
        status(409),
      )
      await assert.rejects(deleteUser(actorId, actorId), status(409))
      const second = await saveUser({ ...input, email: `other-${marker}@${domain}`, role: "admin" }, actorId)
      const results = await Promise.allSettled([
        saveUser({ ...input, email: second.email, role: "admin", banned: true, password: "" }, actorId, second.id),
        saveUser(
          { ...input, email: `admin-${marker}@${domain}`, role: "admin", banned: true, password: "" },
          second.id,
          actorId,
        ),
      ])
      assert.ok(results.some((result) => result.status === "rejected"))
      assert.ok(
        (await prisma.user.count({ where: { id: { in: [actorId, second.id] }, role: "admin", banned: false } })) >= 1,
      )
    } finally {
      const ids = (await prisma.user.findMany({ where: { name: marker }, select: { id: true } })).map((user) => user.id)
      await prisma.eventType.deleteMany({ where: { createdBy: { in: ids } } })
      await prisma.user.deleteMany({ where: { id: { in: ids } } })
      await prisma.$disconnect()
    }
  },
)
