import assert from "node:assert/strict"
import { test } from "node:test"
import { nextRequestFolio } from "./folio"
import {
  createRequestSchema,
  deleteRequestQuerySchema,
  listRequestsQuerySchema,
  requestFormSchema,
  updateRequestSchema,
} from "./schemas"

const eventId = "cm12345678901234567890123"

test("alta: normaliza textos, estado por defecto y evento opcional", () => {
  assert.deepEqual(createRequestSchema.parse({ channel: "  Teléfono ", response: "  " }), {
    channel: "Teléfono",
    response: null,
    status: "pending",
    eventId: null,
  })
  assert.equal(createRequestSchema.parse({ channel: "Correo", eventId: "" }).eventId, null)
  assert.equal(createRequestSchema.parse({ channel: "Correo", eventId }).eventId, eventId)
  for (const channel of ["", "   ", "a".repeat(201), undefined])
    assert.equal(createRequestSchema.safeParse({ channel }).success, false)
  assert.equal(createRequestSchema.safeParse({ channel: "Correo", eventId: "no-es-cuid" }).success, false)
  assert.equal(createRequestSchema.safeParse({ channel: "Correo", status: "closed" }).success, false)
  assert.equal(createRequestSchema.safeParse({ channel: "Correo", response: "a".repeat(2001) }).success, false)
})

test("PATCH conserva omitidos y distingue desvincular el evento", () => {
  assert.deepEqual(updateRequestSchema.parse({ status: "attended" }), { status: "attended" })
  // Sin eventId no se toca el evento; con null se desvincula (y la entrega lo hereda).
  assert.equal("eventId" in updateRequestSchema.parse({ channel: "Correo" }), false)
  assert.equal(updateRequestSchema.parse({ eventId: null }).eventId, null)
})

test("el formulario entrega valores que el servidor acepta", () => {
  const values = requestFormSchema.parse({
    channel: "Presencial",
    description: "",
    response: "",
    status: "pending",
    eventId: "",
  })
  assert.deepEqual(createRequestSchema.parse(values), {
    channel: "Presencial",
    description: "",
    response: null,
    status: "pending",
    eventId: null,
  })
})

test("filtros del listado y confirmación de borrado", () => {
  assert.deepEqual(listRequestsQuerySchema.parse({}), { event: "all" })
  assert.deepEqual(listRequestsQuerySchema.parse({ q: " SOL ", event: "with", status: "cancelled" }), {
    q: "SOL",
    event: "with",
    status: "cancelled",
  })
  assert.equal(listRequestsQuerySchema.safeParse({ event: "con-evento" }).success, false)
  assert.deepEqual(deleteRequestQuerySchema.parse({}), {})
  assert.deepEqual(deleteRequestQuerySchema.parse({ expectedDeliveryId: "" }), { expectedDeliveryId: "" })
  assert.equal(deleteRequestQuerySchema.safeParse({ expectedDeliveryId: "x" }).success, false)
})

test("folio correlativo por año, comparando sufijos como números", () => {
  assert.equal(nextRequestFolio([], 2026), "SOL-2026-001")
  assert.equal(nextRequestFolio(["SOL-2026-009", "SOL-2026-010", "SOL-2025-500"], 2026), "SOL-2026-011")
  assert.equal(nextRequestFolio(["SOL-2026-999", "SOL-2026-1000"], 2026), "SOL-2026-1001")
  // Folios heredados (UUID de la rama original) no rompen el correlativo.
  assert.equal(nextRequestFolio(["SOL-6f1c2b9e-uuid", "SOL-2026-abc"], 2026), "SOL-2026-001")
})

test("descripción opcional distinta de respuesta y tres estados", () => {
  assert.equal(createRequestSchema.parse({ channel: "Correo", description: " Pedido " }).description, "Pedido")
  assert.equal(createRequestSchema.safeParse({ channel: "Correo", description: "x".repeat(2001) }).success, false)
  assert.equal(createRequestSchema.safeParse({ channel: "Correo", status: "derived" }).success, false)
})
