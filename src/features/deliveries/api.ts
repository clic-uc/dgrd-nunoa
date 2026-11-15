import type {
  Delivery,
  DeliveryListResponse,
  DeliveryOptions,
  DeliveryPayload,
  DeliveryPatch,
  ListDeliveriesQuery,
} from "./schemas"
const BASE_URL = "/api/deliveries"
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[] | undefined>,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      body?.message ?? "No se pudo completar la operación.",
      body?.fieldErrors,
      body?.details,
    )
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export function listDeliveries(query: ListDeliveriesQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  return request<DeliveryListResponse>(`${BASE_URL}?${params}`)
}
export function getDelivery(id: string) {
  return request<Delivery>(`${BASE_URL}/${id}`)
}
export function getDeliveryOptions() {
  return request<DeliveryOptions>(`${BASE_URL}/options`)
}
export function createDelivery(payload: DeliveryPayload) {
  return request<Delivery>(BASE_URL, { method: "POST", body: JSON.stringify(payload) })
}
export function updateDelivery(id: string, payload: DeliveryPatch) {
  return request<Delivery>(`${BASE_URL}/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
}
export function deleteDelivery(id: string) {
  return request<void>(`${BASE_URL}/${id}`, { method: "DELETE" })
}

export function getRecurrence(query: { rut: string; date: string; excludeId?: string }) {
  const params = new URLSearchParams({ rut: query.rut, date: query.date })
  if (query.excludeId) params.set("excludeId", query.excludeId)
  return request<import("./schemas").RecurrenceResult>(`${BASE_URL}/recurrence?${params}`)
}
