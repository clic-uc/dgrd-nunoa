"use client"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import * as api from "./api"
import type { EventQuery } from "./schemas"
export function useEvents(query: EventQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["events", "list", query],
    queryFn: () => api.listEvents(query),
    enabled,
    placeholderData: keepPreviousData,
  })
}
export function useEvent(id: string) {
  return useQuery({ queryKey: ["events", "detail", id], queryFn: () => api.getEvent(id) })
}
export function useSaveEvent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.saveEvent,
    onSuccess: () =>
      Promise.all(
        ["events", "event-types", "requests", "deliveries"].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ),
  })
}
export function useDeleteEvent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEvent,
    onSuccess: () =>
      Promise.all(
        ["events", "event-types", "requests", "deliveries"].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ),
  })
}
