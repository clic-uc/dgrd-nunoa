import prisma from "@/lib/prisma"
import { dateOnly } from "@/lib/format"
import { splitName } from "./session"
import type {
  Accion,
  Actividad,
  AppData,
  Entrega,
  EstadoSolicitud,
  Evento,
  Insumo,
  Solicitud,
  TipoArchivo,
  TipoEvento,
  Usuario,
} from "@/lib/types"

/** Prisma RequestStatus ↔ estado en la UI. */
export const ESTADO_A_DB = { pendiente: "pending", atendida: "attended", anulada: "cancelled" } as const
export const DB_A_ESTADO = { pending: "pendiente", attended: "atendida", cancelled: "anulada" } as const

/**
 * Carga todo el dominio de una vez.
 *
 * El volumen real es pequeño (decenas de registros por entidad) y las vistas
 * portadas del mockup resuelven relaciones cruzadas en memoria — entregas de un
 * evento, actividades de una acción, etc. Traer el conjunto completo mantiene
 * esos selectores intactos y evita una cascada de round-trips.
 */
export async function loadAppData(): Promise<AppData> {
  const [users, eventTypes, supplies, events, requests, deliveries, actions, activities] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.eventType.findMany({ orderBy: { name: "asc" } }),
    prisma.supply.findMany({ orderBy: { type: "asc" } }),
    prisma.event.findMany({ orderBy: { date: "desc" } }),
    prisma.request.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.delivery.findMany({ orderBy: { date: "desc" }, include: { items: true } }),
    prisma.strategicAction.findMany({ orderBy: [{ year: "desc" }, { number: "asc" }] }),
    prisma.activity.findMany({ orderBy: { date: "desc" }, include: { evidence: true } }),
  ])

  const usuarios: Usuario[] = users.map((u) => {
    const { nombre, apellido } = splitName(u.name, (u as { lastName?: string | null }).lastName)
    return {
      id: u.id,
      nombre,
      apellido,
      correo: u.email,
      rol: u.role === "admin" ? "admin" : "regular",
      estado: u.banned ? "inactivo" : "activo",
      creado: u.createdAt.toISOString(),
    }
  })

  const tiposEvento: TipoEvento[] = eventTypes.map((t) => ({ id: t.id, nombre: t.name }))

  const insumos: Insumo[] = supplies.map((s) => ({ id: s.id, tipo: s.type, unidad: s.unit }))

  const eventos: Evento[] = events.map((e) => ({
    id: e.id,
    folio: e.folio,
    tipoId: e.typeId,
    fecha: dateOnly(e.date),
    sector: e.sector,
    afectados: e.affectedCount ?? 0,
    instituciones: e.institutions,
    acciones: e.actions,
    creadoPor: e.createdBy,
    creado: e.createdAt.toISOString(),
  }))

  const solicitudes: Solicitud[] = requests.map((r) => ({
    id: r.id,
    folio: r.folio,
    medio: r.channel,
    descripcion: r.description ?? "",
    respuesta: r.response ?? "",
    estado: DB_A_ESTADO[r.status] as EstadoSolicitud,
    eventoId: r.eventId,
    creadoPor: r.createdBy,
    creado: r.createdAt.toISOString(),
  }))

  const entregas: Entrega[] = deliveries.map((d) => ({
    id: d.id,
    folio: d.folio,
    solicitudId: d.requestId,
    eventoId: d.eventId,
    fecha: dateOnly(d.date),
    direccion: d.address,
    beneficiario: d.beneficiary,
    contacto: d.contact,
    jv: d.jv,
    items: d.items.map((i) => ({ insumoId: i.supplyId, cantidad: i.quantity })),
    creadoPor: d.createdBy,
    creado: d.createdAt.toISOString(),
  }))

  const acciones: Accion[] = actions.map((a) => ({
    id: a.id,
    numero: a.number,
    anio: a.year,
    titulo: a.title,
    fechaInicio: dateOnly(a.startDate),
    fechaTermino: dateOnly(a.endDate),
    comoDesarrollar: a.implementation,
    temas: a.topics,
    creadoPor: a.createdBy,
    creado: a.createdAt.toISOString(),
  }))

  const actividades: Actividad[] = activities.map((a) => ({
    id: a.id,
    accionId: a.actionId,
    fecha: dateOnly(a.date),
    direccion: a.location,
    objetivo: a.objective,
    participantes: a.participants,
    evidencia: a.evidence.map((e) => ({
      id: e.id,
      nombre: e.name,
      tipo: e.type as TipoArchivo,
      size: e.size,
      url: `/api/evidencia/${e.id}`,
    })),
    creadoPor: a.createdBy,
    creado: a.createdAt.toISOString(),
  }))

  return { usuarios, tiposEvento, insumos, eventos, solicitudes, entregas, acciones, actividades }
}

/**
 * Siguiente folio para una entidad. Toma el máximo sufijo numérico existente,
 * igual que el mockup, en vez de contar filas (que se rompe al borrar).
 */
export function nextFolio(folios: string[], prefix: string, pad: number, year?: number): string {
  const nums = folios.map((f) => {
    const m = f.match(/(\d+)$/)
    return m ? parseInt(m[1], 10) : 0
  })
  const n = (nums.length ? Math.max(...nums) : 0) + 1
  return year ? `${prefix}-${year}-${String(n).padStart(pad, "0")}` : `${prefix}-${String(n).padStart(pad, "0")}`
}
