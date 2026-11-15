"use client"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
import { requestKeys } from "./keys"
import { deliveryKeys } from "@/features/deliveries/keys"
import { supplyKeys } from "@/features/supplies/keys"
import { neighborhoodAssociationKeys } from "@/features/neighborhood-associations/keys"
import type { ListRequestsQuery, RequestPatch, RequestPayload } from "./schemas"

export function useRequests(query: ListRequestsQuery = {}) {
  return useQuery({
    queryKey: requestKeys.list(query),
    queryFn: () => api.listRequests(query),
    placeholderData: keepPreviousData,
  })
}
export function useRequest(id: string) {
  return useQuery({ queryKey: requestKeys.detail(id), queryFn: () => api.getRequest(id), enabled: Boolean(id) })
}
export function useRequestOptions() {
  return useQuery({ queryKey: requestKeys.options(), queryFn: api.getRequestOptions })
}

/**
 * Una solicitud alimenta el selector de entregas, y su evento se propaga a la
 * entrega vinculada; al borrarla, la entrega cae en cascada y cambian los
 * historiales de insumos y juntas.
 */
function invalidateRelated(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ["events"] }),
    client.invalidateQueries({ queryKey: requestKeys.lists() }),
    client.invalidateQueries({ queryKey: requestKeys.details() }),
    client.invalidateQueries({ queryKey: deliveryKeys.all }),
    client.invalidateQueries({ queryKey: supplyKeys.all }),
    client.invalidateQueries({ queryKey: neighborhoodAssociationKeys.all }),
  ])
}
export function useCreateRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: RequestPayload) => api.createRequest(payload),
    onSuccess: () => invalidateRelated(client),
  })
}
export function useUpdateRequest(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (payload: RequestPatch) => api.updateRequest(id, payload),
    onSuccess: () => invalidateRelated(client),
  })
}
export function useDeleteRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.deleteRequest,
    onSuccess: (_data, { id }) => {
      client.removeQueries({ queryKey: requestKeys.detail(id) })
      return invalidateRelated(client)
    },
  })
}
