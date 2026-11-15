import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { searchSchema } from "../src/features/search/schemas"
const calls: string[] = []
mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
  defaultExport: Object.fromEntries(
    ["delivery", "event", "request", "activity", "strategicAction", "neighborhoodAssociation", "supply"].map((name) => [
      name,
      {
        findMany: async () => {
          calls.push(name)
          return []
        },
      },
    ]),
  ),
})
test("búsqueda general omite módulos restringidos y rechaza elegirlos explícitamente", async () => {
  const { searchRecords } = await import("../src/features/search/service")
  calls.length = 0
  await searchRecords(searchSchema.parse({ q: "vecina" }), "user")
  assert.ok(calls.includes("delivery"))
  assert.ok(calls.includes("activity"))
  assert.ok(!calls.includes("request"))
  assert.ok(!calls.includes("event"))
  calls.length = 0
  await assert.rejects(searchRecords(searchSchema.parse({ q: "vecina", module: "events" }), "user"), /No tienes acceso/)
  assert.equal(calls.length, 0)
  await searchRecords(searchSchema.parse({ q: "vecina" }), "admin")
  assert.ok(calls.includes("request"))
  assert.ok(calls.includes("event"))
})
test("búsqueda exige texto mínimo y rango válido", () => {
  assert.equal(searchSchema.safeParse({ q: "x" }).success, false)
  assert.equal(searchSchema.safeParse({ q: "vecina", from: "2026-11-16", to: "2026-11-15" }).success, false)
  assert.equal(searchSchema.safeParse({ q: "vecina", module: "users" }).success, false)
})
