import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createDeliverySchema,
  updateDeliverySchema,
  listDeliveriesQuerySchema,
  deliveryFormSchema,
  toDeliveryPayload,
} from "./schemas"

const supplyId = "clxxxxxxxxxxxxxxxxxxxxxxx"
const input = {
  beneficiary: " Vecina ",
  neighborhoodAssociationId: "clyyyyyyyyyyyyyyyyyyyyyyy",
  address: "Calle 123",
  date: "2026-10-14",
  items: [{ supplyId, quantity: 2 }],
}

test("normaliza textos, contacto y fecha calendario UTC", () => {
  const parsed = createDeliverySchema.parse(input)
  assert.equal(parsed.beneficiary, "Vecina")
  assert.equal(parsed.contact, null)
  assert.equal(parsed.date.toISOString(), "2026-10-14T00:00:00.000Z")
  assert.equal(createDeliverySchema.parse({ ...input, contact: "  " }).contact, null)
})
test("rechaza fechas imposibles y timestamps con hora", () => {
  for (const date of ["2026-02-30", "2026-10-14T10:00:00Z", "", "ayer"]) {
    assert.equal(createDeliverySchema.safeParse({ ...input, date }).success, false)
  }
})
test("requiere insumos únicos con cantidades enteras positivas dentro del rango de PostgreSQL", () => {
  for (const items of [
    [],
    [input.items[0], input.items[0]],
    [{ supplyId, quantity: 0 }],
    [{ supplyId, quantity: 1.5 }],
    [{ supplyId, quantity: 2147483648 }],
  ]) {
    assert.equal(createDeliverySchema.safeParse({ ...input, items }).success, false)
  }
})
test("PATCH conserva campos omitidos y permite quitar contacto o solicitud", () => {
  assert.deepEqual(updateDeliverySchema.parse({ beneficiary: "Otra" }), { beneficiary: "Otra" })
  assert.deepEqual(updateDeliverySchema.parse({ contact: null, requestId: null }), { contact: null, requestId: null })
  assert.equal(updateDeliverySchema.safeParse({ items: [] }).success, false)
})
test("valida rango de fechas y filtros", () => {
  assert.equal(listDeliveriesQuerySchema.safeParse({ from: "2026-10-15", to: "2026-10-14" }).success, false)
  assert.equal(listDeliveriesQuerySchema.safeParse({ from: "2026-10-14", to: "2026-10-14" }).success, true)
  assert.equal(listDeliveriesQuerySchema.safeParse({ event: "invalid" }).success, false)
})
test("el formulario convierte strings al contrato del servidor", () => {
  const values = deliveryFormSchema.parse({
    ...input,
    contact: "",
    requestId: "",
    items: [{ type: "Agua", supplyId, quantity: "2" }],
  })
  const payload = toDeliveryPayload(values)
  assert.equal(payload.requestId, null)
  assert.equal(payload.contact, null)
  assert.deepEqual(payload.items, [{ supplyId, quantity: 2 }])
  assert.equal(createDeliverySchema.safeParse(payload).success, true)
})

test("el folio reinicia por año y ordena sufijos numéricamente", async () => {
  const { nextDeliveryFolio, deliveryFolioYear } = await import("./folio")
  assert.equal(nextDeliveryFolio(["ENT-2025-137"], 2026), "ENT-2026-001")
  assert.equal(nextDeliveryFolio(["ENT-2026-999", "ENT-2026-1000", "ENT-2026-002"], 2026), "ENT-2026-1001")
  assert.equal(nextDeliveryFolio(["ENT-2026-001", "ENT-2026-003"], 2026), "ENT-2026-004")
  assert.equal(deliveryFolioYear(new Date("2027-01-01T01:00:00Z")), 2026)
})

test("junta opcional: PATCH omitido conserva, null desvincula y formulario vacío envía null", () => {
  assert.equal(
    createDeliverySchema.parse({ ...input, neighborhoodAssociationId: undefined }).neighborhoodAssociationId,
    undefined,
  )
  assert.equal(
    createDeliverySchema.parse({ ...input, neighborhoodAssociationId: null }).neighborhoodAssociationId,
    null,
  )
  assert.deepEqual(updateDeliverySchema.parse({ neighborhoodAssociationId: null }), { neighborhoodAssociationId: null })
  assert.deepEqual(updateDeliverySchema.parse({ address: "Otra" }), { address: "Otra" })
  const values = deliveryFormSchema.parse({
    ...input,
    neighborhoodAssociationId: "",
    contact: "",
    requestId: "",
    items: [{ type: "Agua", supplyId, quantity: "2" }],
  })
  assert.equal(toDeliveryPayload(values).neighborhoodAssociationId, null)
  assert.equal(listDeliveriesQuerySchema.parse({ association: "without" }).association, "without")
})
