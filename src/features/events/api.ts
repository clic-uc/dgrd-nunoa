import { apiRequest } from "@/lib/http-client"
import type { EventDetail, EventInput, EventQuery, EventRecord } from "./schemas"
export const listEvents = (query: EventQuery) =>
  apiRequest<{ data: EventRecord[] }>(
    `/api/events?${new URLSearchParams(Object.entries(query).filter(([, v]) => Boolean(v)) as [string, string][])}`,
  )
export const getEvent = (id: string) => apiRequest<EventDetail>(`/api/events/${id}`)
export const saveEvent = ({ id, ...data }: EventInput & { id?: string }) =>
  apiRequest<EventRecord>(`/api/events${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  })
export const deleteEvent = (id: string) => apiRequest<void>(`/api/events/${id}`, { method: "DELETE" })
