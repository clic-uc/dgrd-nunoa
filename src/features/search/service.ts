import { normalizeRut } from "@/lib/rut"
import prisma from "@/lib/prisma"
import { can, type Resource } from "@/lib/permissions"
import { AppError } from "@/lib/api-error"
import type { SearchQuery, SearchGroup } from "./schemas"
export async function searchRecords({ q, module, from, to }: SearchQuery, role: string | null | undefined) {
  if (module !== "all" && !can(role, module, "read")) throw new AppError(403, "No tienes acceso a ese módulo.")
  const contains = { contains: q, mode: "insensitive" as const }
  const dates = {
    ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
    ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
  }
  const period = from || to ? { date: dates } : {}
  const pending: Promise<SearchGroup>[] = []
  function add(resource: Resource, label: string, load: () => Promise<SearchGroup["results"]>) {
    if ((module === "all" || module === resource) && can(role, resource, "read"))
      pending.push(load().then((results) => ({ module: resource, label, results })))
  }
  add("deliveries", "Entregas", async () =>
    (
      await prisma.delivery.findMany({
        where: {
          ...period,
          OR: [
            { beneficiary: contains },
            { beneficiaryRut: { contains: normalizeRut(q), mode: "insensitive" } },
            { address: contains },
            { folio: contains },
          ],
        },
        select: { id: true, folio: true, beneficiary: true, address: true },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 20,
      })
    ).map((row) => ({
      id: row.id,
      title: `${row.folio} · ${row.beneficiary}`,
      subtitle: row.address,
      href: `/entregas/${row.id}`,
    })),
  )
  add("events", "Eventos", async () =>
    (
      await prisma.event.findMany({
        where: {
          ...period,
          OR: [{ folio: contains }, { sector: contains }, { actions: contains }, { institutions: contains }],
        },
        select: { id: true, folio: true, sector: true, type: { select: { name: true } } },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 20,
      })
    ).map((row) => ({
      id: row.id,
      title: `${row.folio} · ${row.type.name}`,
      subtitle: row.sector,
      href: `/eventos/${row.id}`,
    })),
  )
  add("requests", "Solicitudes", async () =>
    (
      await prisma.request.findMany({
        where: {
          ...(from || to ? { createdAt: dates } : {}),
          OR: [{ folio: contains }, { channel: contains }, { description: contains }, { response: contains }],
        },
        select: { id: true, folio: true, channel: true, description: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
      })
    ).map((row) => ({
      id: row.id,
      title: `${row.folio} · ${row.channel}`,
      subtitle: row.description ?? "Sin descripción",
      href: `/solicitudes/${row.id}`,
    })),
  )
  add("activities", "Actividades", async () =>
    (
      await prisma.activity.findMany({
        where: { ...period, OR: [{ objective: contains }, { location: contains }, { participants: contains }] },
        select: { id: true, objective: true, location: true },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: 20,
      })
    ).map((row) => ({ id: row.id, title: row.objective, subtitle: row.location, href: `/actividades/${row.id}` })),
  )
  add("strategic-actions", "Acciones estratégicas", async () =>
    (
      await prisma.strategicAction.findMany({
        where: {
          ...(from ? { endDate: { gte: new Date(from) } } : {}),
          ...(to ? { startDate: { lte: new Date(to) } } : {}),
          OR: [{ title: contains }, { topics: contains }, { implementation: contains }],
        },
        select: { id: true, number: true, year: true, title: true, topics: true },
        orderBy: [{ year: "desc" }, { number: "asc" }],
        take: 20,
      })
    ).map((row) => ({
      id: row.id,
      title: `${row.year} · ${row.number}. ${row.title}`,
      subtitle: row.topics,
      href: `/plan/acciones/${row.id}`,
    })),
  )
  add("neighborhood-associations", "Juntas vecinales", async () =>
    (
      await prisma.neighborhoodAssociation.findMany({
        where: {
          OR: [{ name: contains }, ...(/^\d+$/.test(q) && Number(q) <= 2147483647 ? [{ number: Number(q) }] : [])],
        },
        select: { id: true, number: true, name: true },
        orderBy: { number: "asc" },
        take: 20,
      })
    ).map((row) => ({
      id: row.id,
      title: `N°${row.number} · ${row.name}`,
      subtitle: "Junta vecinal",
      href: `/juntas-vecinales/${row.id}`,
    })),
  )
  add("supplies", "Insumos", async () =>
    (
      await prisma.supply.findMany({
        where: { OR: [{ type: contains }, { unit: contains }] },
        select: { id: true, type: true, unit: true },
        orderBy: [{ type: "asc" }, { id: "asc" }],
        take: 20,
      })
    ).map((row) => ({ id: row.id, title: row.type, subtitle: row.unit, href: `/insumos/${row.id}` })),
  )
  return { groups: await Promise.all(pending) }
}
