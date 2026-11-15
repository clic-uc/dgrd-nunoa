import assert from "node:assert/strict"
import { test } from "node:test"
import { activitySchema, outsideActionPeriod } from "./schemas"
test("actividad exige fecha, dirección, objetivo y participantes", () => {
  const input = {
    actionId: "cm12345678901234567890123",
    date: "2026-11-15",
    location: "Lugar",
    objective: "Objetivo",
    participants: "Vecinos",
  }
  for (const field of ["date", "location", "objective", "participants"] as const)
    assert.equal(activitySchema.safeParse({ ...input, [field]: "" }).success, false)
  assert.equal(activitySchema.safeParse({ ...input, date: "2026-02-30" }).success, false)
  assert.equal(activitySchema.safeParse(input).success, true)
  assert.equal(outsideActionPeriod("2026-11-15", "2026-01-01", "2026-11-14"), true)
  assert.equal(outsideActionPeriod("2026-11-15", "2026-01-01", "2026-11-15"), false)
})
