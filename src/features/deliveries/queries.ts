"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import { deliveryKeys } from "./keys"
import { neighborhoodAssociationKeys } from "@/features/neighborhood-associations/keys"
import { supplyKeys } from "@/features/supplies/keys"
// Listado y detalle de solicitudes muestran la entrega vinculada.
import { requestKeys } from "@/features/requests/keys"
import type { ListDeliveriesQuery, DeliveryPatch, DeliveryPayload } from "./schemas"

/**
 * Claves jerárquicas: invalidar `lists()` alcanza a todas las listas sin tener
 * que conocer los filtros activos en ese momento.
 */
export { deliveryKeys } from "./keys"

export function useDeliveries(query: ListDeliveriesQuery = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: deliveryKeys.list(query),
    queryFn: () => api.listDeliveries(query),
    enabled: options.enabled,
    // Sin esto la tabla se vacía en cada tecla del buscador.
    placeholderData: keepPreviousData,
  })
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: deliveryKeys.detail(id),
    queryFn: () => api.getDelivery(id),
    enabled: Boolean(id),
  })
}

export function useCreateDelivery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DeliveryPayload) => api.createDelivery(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: supplyKeys.all })
      queryClient.invalidateQueries({ queryKey: neighborhoodAssociationKeys.all })
      queryClient.invalidateQueries({ queryKey: deliveryKeys.options() })
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() })
    },
  })
}

export function useUpdateDelivery(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DeliveryPatch) => api.updateDelivery(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: supplyKeys.all })
      queryClient.invalidateQueries({ queryKey: neighborhoodAssociationKeys.all })
      queryClient.invalidateQueries({ queryKey: deliveryKeys.options() })
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(id) })
    },
  })
}

export function useDeleteDelivery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteDelivery(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: supplyKeys.all })
      queryClient.invalidateQueries({ queryKey: neighborhoodAssociationKeys.all })
      queryClient.invalidateQueries({ queryKey: deliveryKeys.options() })
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
      queryClient.removeQueries({ queryKey: deliveryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() })
    },
  })
}

export function useDeliveryOptions() {
  return useQuery({ queryKey: deliveryKeys.options(), queryFn: api.getDeliveryOptions })
}
