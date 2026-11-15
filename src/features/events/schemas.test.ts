import assert from "node:assert/strict"
import { test } from "node:test"
import { eventSchema, eventQuerySchema } from "./schemas"
const input = {
  date: "2026-11-15",
  typeId: "cm12345678901234567890123",
  sector: " Sector ",
  affectedCount: null,
  institutions: "DGRD",
  actions: "Inspección",
}
test("eventos: fechas calendario, afectados opcionales y campos obligatorios", () => {
  assert.equal(eventSchema.parse(input).sector, "Sector")
  for (const invalid of [
    { date: "2026-02-30" },
    { affectedCount: -1 },
    { affectedCount: 1.5 },
    { sector: " " },
    { typeId: "incendio" },
  ])
    assert.equal(eventSchema.safeParse({ ...input, ...invalid }).success, false)
  assert.equal(eventQuerySchema.safeParse({ from: "2026-11-16", to: "2026-11-15" }).success, false)
  assert.equal(eventQuerySchema.safeParse({ from: "2026-11-15", to: "2026-11-15" }).success, true)
})
