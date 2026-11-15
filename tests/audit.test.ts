import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { NextRequest } from "next/server"
import { authorizeUser } from "../src/lib/authorization"
import type { Resource, Action } from "../src/lib/permissions"
const file = (path: string) => pathToFileURL(resolve(path)).href
let role: string | null = null
let calls = 0
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) =>
      authorizeUser(role ? { id: "operator", role } : null, resource, action),
  },
})
mock.module(file("src/features/audit/service.ts"), {
  namedExports: {
    listAudit: async () => {
      calls++
      return { data: [], nextCursor: null }
    },
  },
})
test("auditoría solo se consulta con administrador y valida cursores", async () => {
  const { GET } = await import("../src/app/api/audit/route")
  for (const candidate of [null, "user", "unknown", "admin"]) {
    role = candidate
    calls = 0
    const response = await GET(new NextRequest("http://localhost/api/audit"))
    assert.equal(response.status, !candidate ? 401 : candidate !== "admin" ? 403 : 200)
    assert.equal(calls, candidate === "admin" ? 1 : 0)
  }
  calls = 0
  assert.equal((await GET(new NextRequest("http://localhost/api/audit?cursor=malformed"))).status, 400)
  assert.equal(calls, 0)
})
