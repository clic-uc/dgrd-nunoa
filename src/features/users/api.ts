import { apiRequest } from "@/lib/http-client"
import type { ManagedUser, UserInput } from "./schemas"
export const listUsers = (q: string) => apiRequest<{ data: ManagedUser[] }>(`/api/users?${new URLSearchParams({ q })}`)
export const saveUser = ({ id, ...data }: UserInput & { id?: string }) =>
  apiRequest<ManagedUser>(`/api/users${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  })
export const deleteUser = (id: string) => apiRequest<void>(`/api/users/${id}`, { method: "DELETE" })
