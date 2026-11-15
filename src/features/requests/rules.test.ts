import assert from "node:assert/strict"
import { test } from "node:test"
import { assertAttended } from "./rules"

test("atendida requiere respuesta o entrega; otros estados no bloquean", () => {
  assert.throws(() => assertAttended("attended", "  ", false), /requiere/)
  assert.doesNotThrow(() => assertAttended("attended", "Resuelta", false))
  assert.doesNotThrow(() => assertAttended("attended", null, true))
  for (const status of ["pending", "cancelled"]) assert.doesNotThrow(() => assertAttended(status, null, false))
})
