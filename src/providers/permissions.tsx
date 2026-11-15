"use client"

import { createContext, useContext } from "react"
import { can, type Resource, type Action } from "@/lib/permissions"

// Fail closed outside the authenticated layout.
const RoleContext = createContext<string>("unknown")

export function PermissionsProvider({ role, children }: { role: string; children?: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function usePermission(resource: Resource, action: Action) {
  return can(useContext(RoleContext), resource, action)
}

export function useRole() {
  return useContext(RoleContext)
}
