/** Política de dominio compartida por servidor e interfaz. */
export const resources = [
  "deliveries",
  "supplies",
  "neighborhood-associations",
  "strategic-actions",
  "requests",
  "events",
  "activities",
  "evidence",
  "summary",
  "users",
  "event-types",
  "audit",
] as const
export const actions = ["read", "create", "update", "delete"] as const
export type Resource = (typeof resources)[number]
export type Action = (typeof actions)[number]
export type Role = "admin" | "regular" | "unknown"

export function normalizeRole(role: string | null | undefined): Role {
  if (role === "admin") return "admin"
  if (role == null || role === "" || role === "user" || role === "regular") return "regular"
  return "unknown"
}

export function can(role: string | null | undefined, resource: Resource, action: Action): boolean {
  const normalized = normalizeRole(role)
  if (normalized === "admin") return true
  if (normalized !== "regular") return false
  switch (resource) {
    case "deliveries":
    case "supplies":
    case "activities":
    case "evidence":
      return true
    case "neighborhood-associations":
    case "strategic-actions":
    case "summary":
      return action === "read"
    default:
      return false
  }
}
