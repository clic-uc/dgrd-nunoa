"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import type { ListStrategicActionsQuery, StrategicActionPatch, StrategicActionPayload } from "./schemas"

/**
 * Claves jerárquicas: invalidar `lists()` alcanza a todas las listas sin tener
 * que conocer los filtros activos en ese momento.
 */
export const strategicActionKeys = {
  all: ["strategic-actions"] as const,
  lists: () => [...strategicActionKeys.all, "list"] as const,
  list: (query: ListStrategicActionsQuery) => [...strategicActionKeys.lists(), query] as const,
  details: () => [...strategicActionKeys.all, "detail"] as const,
  detail: (id: string) => [...strategicActionKeys.details(), id] as const,
}

export function useStrategicActions(query: ListStrategicActionsQuery = {}) {
  return useQuery({
    queryKey: strategicActionKeys.list(query),
    queryFn: () => api.listStrategicActions(query),
    // Sin esto la tabla se vacía en cada tecla del buscador.
    placeholderData: keepPreviousData,
  })
}

export function useStrategicAction(id: string) {
  return useQuery({
    queryKey: strategicActionKeys.detail(id),
    queryFn: () => api.getStrategicAction(id),
    enabled: Boolean(id),
  })
}

export function useCreateStrategicAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StrategicActionPayload) => api.createStrategicAction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategicActionKeys.lists() })
    },
  })
}

export function useUpdateStrategicAction(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: StrategicActionPatch) => api.updateStrategicAction(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategicActionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: strategicActionKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useDeleteStrategicAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteStrategicAction(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: strategicActionKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: strategicActionKeys.lists() })
    },
  })
}
