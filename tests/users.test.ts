import assert from "node:assert/strict"
import { mock, test } from "node:test"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { NextRequest } from "next/server"
import { authorizeUser } from "../src/lib/authorization"
import { createUserSchema } from "../src/features/users/schemas"
import type { Resource, Action } from "../src/lib/permissions"
const file = (path: string) => pathToFileURL(resolve(path)).href
let role: string | null = null
let calls = 0
let authStatus = 200
mock.module(file("src/lib/audit.ts"), {
  namedExports: { withAudit: async (_actor: string, operation: () => Promise<unknown>) => operation() },
})
mock.module(file("src/lib/session.ts"), {
  namedExports: {
    requirePermission: async (resource: Resource, action: Action) =>
      authorizeUser(role ? { id: "operator", role } : null, resource, action),
  },
})
mock.module(file("src/features/users/service.ts"), {
  namedExports: Object.fromEntries(
    ["listUsers", "saveUser", "deleteUser"].map((name) => [
      name,
      async () => {
        calls++
        return { data: [] }
      },
    ]),
  ),
})
mock.module(file("src/lib/auth.ts"), {
  namedExports: { auth: { api: { getSession: async () => ({ user: { id: "operator", name: "Operador" } }) } } },
})
mock.module("better-auth/next-js", {
  namedExports: {
    toNextJsHandler: () => ({
      GET: async () => new Response(null, { status: 200 }),
      POST: async () => new Response(null, { status: authStatus }),
    }),
  },
})
test("usuarios: autoriza antes de parsear y no expone vías administrativas alternativas", async () => {
  const collection = await import("../src/app/api/users/route")
  const detail = await import("../src/app/api/users/[id]/route")
  const auth = await import("../src/app/api/auth/[...all]/route")
  for (const [handler, method] of [
    [collection.GET, "GET"],
    [collection.POST, "POST"],
    [detail.PATCH, "PATCH"],
    [detail.DELETE, "DELETE"],
  ] as const)
    for (const candidate of [null, "user", "unknown", "admin"]) {
      role = candidate
      calls = 0
      const response = await handler(
        new NextRequest("http://localhost/api/users", {
          method,
          ...(["POST", "PATCH"].includes(method)
            ? {
                body:
                  candidate === "admin"
                    ? JSON.stringify({
                        name: "Operador",
                        email: "operador@nunoa.cl",
                        role: "user",
                        banned: false,
                        password: "test-password-123",
                      })
                    : "{",
              }
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
  assert.equal(
    (await auth.POST(new Request("http://localhost/api/auth/admin/set-role", { method: "POST" }))).status,
    403,
  )
  assert.equal(
    (await auth.POST(new Request("http://localhost/api/auth/sign-in/email", { method: "POST" }))).status,
    200,
  )
})
test("alta exige contraseña larga y rol conocido", () => {
  const input = {
    name: "Persona",
    email: "persona@nunoa.cl",
    role: "user",
    banned: false,
    password: "test-password-123",
  }
  for (const change of [{ password: "" }, { password: "123" }, { role: "unknown" }, { email: "no-es-correo" }])
    assert.equal(createUserSchema.safeParse({ ...input, ...change }).success, false)
})

test("una respuesta fallida de autenticación se propaga fuera de la transacción auditada", async () => {
  const { POST } = await import("../src/app/api/auth/[...all]/route")
  authStatus = 400
  const response = await POST(new Request("http://localhost/api/auth/update-user", { method: "POST" }))
  assert.equal(response.status, 400)
  authStatus = 200
})
