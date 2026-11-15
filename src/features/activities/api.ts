import { apiRequest } from "@/lib/http-client"
import type { ActivityInput, ActivityQuery, ActivityRecord } from "./schemas"
export const listActivities = (query: ActivityQuery) =>
  apiRequest<{ data: ActivityRecord[] }>(
    `/api/activities?${new URLSearchParams(Object.entries(query).filter(([, v]) => Boolean(v)) as [string, string][])}`,
  )
export const getActivity = (id: string) => apiRequest<ActivityRecord>(`/api/activities/${id}`)
export const saveActivity = ({ id, ...data }: ActivityInput & { id?: string }) =>
  apiRequest<ActivityRecord>(`/api/activities${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  })
export const deleteActivity = (id: string) => apiRequest<void>(`/api/activities/${id}`, { method: "DELETE" })
