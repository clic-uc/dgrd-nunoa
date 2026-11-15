"use client"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import * as api from "./api"
import type { ActivityQuery } from "./schemas"
export function useActivities(query: ActivityQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["activities", "list", query],
    queryFn: () => api.listActivities(query),
    enabled,
    placeholderData: keepPreviousData,
  })
}
export function useActivity(id: string) {
  return useQuery({ queryKey: ["activities", "detail", id], queryFn: () => api.getActivity(id) })
}
export function useSaveActivity() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.saveActivity,
    onSuccess: () =>
      Promise.all(["activities", "strategic-actions"].map((key) => client.invalidateQueries({ queryKey: [key] }))),
  })
}
export function useDeleteActivity() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteActivity,
    onSuccess: () =>
      Promise.all(["activities", "strategic-actions"].map((key) => client.invalidateQueries({ queryKey: [key] }))),
  })
}
