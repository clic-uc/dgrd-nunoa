"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "./api"
export function useUsers(q = "") {
  return useQuery({ queryKey: ["users", q], queryFn: () => api.listUsers(q) })
}
export function useSaveUser() {
  const client = useQueryClient()
  return useMutation({ mutationFn: api.saveUser, onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }) })
}
export function useDeleteUser() {
  const client = useQueryClient()
  return useMutation({ mutationFn: api.deleteUser, onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }) })
}
