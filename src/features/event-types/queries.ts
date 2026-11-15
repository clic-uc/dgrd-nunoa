"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
export function useEventTypes(q = "") {
  return useQuery({ queryKey: ["event-types", q], queryFn: () => api.listEventTypes(q) })
}
export function useSaveEventType() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.saveEventType,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["event-types"] })
      client.invalidateQueries({ queryKey: ["events"] })
    },
  })
}
export function useDeleteEventType() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEventType,
    onSuccess: () => client.invalidateQueries({ queryKey: ["event-types"] }),
  })
}
