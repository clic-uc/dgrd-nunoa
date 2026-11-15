import assert from "node:assert/strict"
import { test } from "node:test"
import {
  associationHistoryQuerySchema,
  createNeighborhoodAssociationSchema,
  updateNeighborhoodAssociationSchema,
  neighborhoodAssociationFormSchema,
  toNeighborhoodAssociationPayload,
  listNeighborhoodAssociationsQuerySchema,
} from "./schemas"
import { createDeliverySchema, updateDeliverySchema } from "@/features/deliveries/schemas"

test("valida número positivo, nombre y estado sin coerciones", () => {
  assert.deepEqual(createNeighborhoodAssociationSchema.parse({ number: 12, name: "  Villa Prueba  ", active: true }), {
    number: 12,
    name: "Villa Prueba",
    active: true,
  })
  for (const number of [0, -1, 1.5, "12", 2147483648])
    assert.equal(createNeighborhoodAssociationSchema.safeParse({ number, name: "Villa", active: true }).success, false)
  assert.equal(createNeighborhoodAssociationSchema.safeParse({ number: 12, name: "  ", active: true }).success, false)
  assert.equal(
    createNeighborhoodAssociationSchema.safeParse({ number: 12, name: "Villa", active: "true" }).success,
    false,
  )
})
test("el formulario convierte número string y PATCH conserva los omitidos", () => {
  const values = neighborhoodAssociationFormSchema.parse({ number: "12", name: "Villa", active: false })
  assert.deepEqual(toNeighborhoodAssociationPayload(values), { number: 12, name: "Villa", active: false })
  assert.deepEqual(updateNeighborhoodAssociationSchema.parse({ active: false }), { active: false })
  assert.equal(listNeighborhoodAssociationsQuerySchema.safeParse({ status: "invalid" }).success, false)
})
test("la junta es opcional y las referencias presentes deben ser CUID", () => {
  const input = {
    beneficiary: "Vecina",
    address: "Calle",
    date: "2026-10-14",
    items: [{ supplyId: "clxxxxxxxxxxxxxxxxxxxxxxx", quantity: 1 }],
  }
  assert.equal(createDeliverySchema.safeParse(input).success, true)
  assert.equal(createDeliverySchema.safeParse({ ...input, neighborhoodAssociationId: "JV 12" }).success, false)
  assert.equal(
    createDeliverySchema.safeParse({ ...input, neighborhoodAssociationId: "clyyyyyyyyyyyyyyyyyyyyyyy" }).success,
    true,
  )
  assert.deepEqual(updateDeliverySchema.parse({ contact: null }), { contact: null })
})

test("historial: fechas calendario, rango inclusivo, insumo y orden válidos", () => {
  assert.deepEqual(associationHistoryQuerySchema.parse({}), { order: "desc" })
  const query = { from: "2026-10-01", to: "2026-10-01", supplyId: "clxxxxxxxxxxxxxxxxxxxxxxx", order: "asc" }
  assert.deepEqual(associationHistoryQuerySchema.parse(query), query)
  for (const invalid of [
    { from: "2026-02-30" },
    { to: "2026-01-01T00:00:00Z" },
    { from: "2026-10-02", to: "2026-10-01" },
    { supplyId: "insumo" },
    { order: "invalid" },
  ])
    assert.equal(associationHistoryQuerySchema.safeParse(invalid).success, false)
})
