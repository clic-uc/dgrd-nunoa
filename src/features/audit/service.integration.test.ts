import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import prisma from "@/lib/prisma"
import { withAudit } from "@/lib/audit"
import { createSupply, updateSupply, deleteSupply } from "@/features/supplies/service"
import { listAudit } from "./service"
test(
  "auditoría: ejecutor distinto de autor, concurrencia, rollback y ausencia de credenciales",
  { skip: process.env.RUN_AUDIT_INTEGRATION !== "1" },
  async () => {
    const marker = `audit-${randomUUID()}`
    const ids = [`${marker}-a`, `${marker}-b`]
    try {
      for (const id of ids) await prisma.user.create({ data: { id, name: id, email: `${id}@example.invalid` } })
      const a = await withAudit(ids[0], () => createSupply({ type: marker, unit: "unidad" }, ids[0]))
      await withAudit(ids[1], () => updateSupply(a.id, { type: `${marker} actualizado` }))
      const update = await prisma.auditLog.findFirstOrThrow({
        where: { entity: "supply", recordId: a.id, operation: "UPDATE" },
      })
      assert.equal(update.actorId, ids[1])
      assert.equal((update.before as { createdBy: string }).createdBy, ids[0])
      assert.equal((update.after as { type: string }).type, `${marker} actualizado`)
      const count = await prisma.auditLog.count({ where: { recordId: a.id } })
      await assert.rejects(
        withAudit(ids[1], async () => {
          await updateSupply(a.id, { type: `${marker} revertido` })
          throw new Error("rollback test")
        }),
        /rollback test/,
      )
      assert.equal(await prisma.auditLog.count({ where: { recordId: a.id } }), count)
      assert.equal((await prisma.supply.findUniqueOrThrow({ where: { id: a.id } })).type, `${marker} actualizado`)
      const supplies = await Promise.all(
        ids.map((id, index) =>
          withAudit(id, () => createSupply({ type: `${marker}-${index}`, unit: "unidad" }, ids[0])),
        ),
      )
      for (let index = 0; index < supplies.length; index++) {
        const log = await prisma.auditLog.findFirstOrThrow({
          where: { recordId: supplies[index].id, operation: "INSERT" },
        })
        assert.equal(log.actorId, ids[index])
      }
      await assert.rejects(
        withAudit(ids[0], () => withAudit(ids[1], async () => undefined)),
        /ejecutor/,
      )
      const page = await listAudit({ actor: ids[1] })
      assert.ok(page.data.every((log) => log.actorId === ids[1] || log.actorName?.includes(ids[1])))
      assert.equal(typeof page.data[0].id, "string")
      assert.ok(!JSON.stringify(page).includes('"password"'))
      assert.ok(!JSON.stringify(page).includes('"token"'))
      await withAudit(ids[0], () => deleteSupply(a.id))
      assert.ok(await prisma.auditLog.findFirst({ where: { recordId: a.id, operation: "DELETE", actorId: ids[0] } }))
    } finally {
      await prisma.supply.deleteMany({ where: { createdBy: { in: ids } } })
      await prisma.user.deleteMany({ where: { id: { in: ids } } })
      await prisma.$disconnect()
    }
  },
)
