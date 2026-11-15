import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { NextRequest } from "next/server"
import { authorizeUser } from "../src/lib/authorization"
import { eventTypeSchema } from "../src/features/event-types/schemas"
import type { Resource, Action } from "../src/lib/permissions"
const file = (path: string) => pathToFileURL(resolve(path)).href
let role: string | null = null
let calls = 0
mock.module(file("src/lib/audit.ts"), {
  namedExports: { withAudit: async (_actor: string, operation: () => Promise<unknown>) => operation() },
})
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) =>
      authorizeUser(role ? { id: "operator", role } : null, resource, action),
  },
})
mock.module(file("src/features/event-types/service.ts"), {
  namedExports: Object.fromEntries(
    ["listEventTypes", "saveEventType", "deleteEventType"].map((name) => [
      name,
      async () => {
        calls++
        return { data: [] }
      },
    ]),
  ),
})
test("tipos: protege todos los handlers antes de parsear o acceder a datos", async () => {
  const collection = await import("../src/app/api/event-types/route")
  const detail = await import("../src/app/api/event-types/[id]/route")
  for (const [handler, method] of [
    [collection.GET, "GET"],
    [collection.POST, "POST"],
    [detail.PATCH, "PATCH"],
    [detail.DELETE, "DELETE"],
  ] as const) {
    for (const candidate of [null, "user", "unknown", "admin"]) {
      role = candidate
      calls = 0
      const response = await handler(
        new NextRequest("http://localhost/api/event-types", {
          method,
          ...(["POST", "PATCH"].includes(method)
            ? { body: candidate === "admin" ? JSON.stringify({ name: "Incendio" }) : "{" }
            : {}),
        }),
        { params: Promise.resolve({ id: "record" }) },
      )
      assert.equal(
        response.status,
        !candidate ? 401 : candidate !== "admin" ? 403 : method === "POST" ? 201 : method === "DELETE" ? 204 : 200,
      )
      assert.equal(calls, candidate === "admin" ? 1 : 0)
    }
  }
})
test("tipos: no admite nombres vacíos ni demasiado largos", () => {
  for (const name of ["", " ", "x".repeat(201)]) assert.equal(eventTypeSchema.safeParse({ name }).success, false)
  assert.equal(eventTypeSchema.parse({ name: " Incendio " }).name, "Incendio")
})
