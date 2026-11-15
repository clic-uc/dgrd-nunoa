import { apiRequest } from "@/lib/http-client"
import type { EventType, EventTypeInput } from "./schemas"
export const listEventTypes = (q: string) =>
  apiRequest<{ data: EventType[] }>(`/api/event-types?${new URLSearchParams({ q })}`)
export const saveEventType = ({ id, ...data }: EventTypeInput & { id?: string }) =>
  apiRequest<EventType>(`/api/event-types${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  })
export const deleteEventType = (id: string) => apiRequest<void>(`/api/event-types/${id}`, { method: "DELETE" })
