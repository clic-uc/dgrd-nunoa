import assert from "node:assert/strict"
import { test } from "node:test"
import { AppError, toErrorResponse } from "../src/lib/api-error"
test("errores de referencias del adaptador responden conflicto sin filtrar SQL", async () => {
  for (const code of ["23001", "23503"]) {
    const response = toErrorResponse(new Error("SQL privado", { cause: { originalCode: code } }))
    assert.equal(response.status, 409)
    assert.ok(!JSON.stringify(await response.json()).includes("SQL privado"))
  }
})
test("las validaciones de base y de dominio conservan su respuesta esperada", async () => {
  assert.equal(toErrorResponse({ cause: { originalCode: "23514" } }).status, 400)
  assert.equal(toErrorResponse({ code: "P2002" }).status, 409)
  const response = toErrorResponse(
    new AppError(400, "Revisa el RUT", { fieldErrors: { beneficiaryRut: ["RUT inválido"] } }),
  )
  assert.deepEqual(await response.json(), {
    message: "Revisa el RUT",
    fieldErrors: { beneficiaryRut: ["RUT inválido"] },
  })
})
