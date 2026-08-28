"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/server/session"
import { ESTADO_A_DB, nextFolio } from "@/server/data"
import { nullIfEmpty, parseDayUTC, run } from "./_shared"
import type { EstadoSolicitud } from "@/lib/types"

/* ============================================================ SOLICITUDES */

export type SolicitudInput = {
  medio: string
  descripcion: string
  respuesta: string
  estado: EstadoSolicitud
  eventoId: string | null
}

export async function crearSolicitud(input: SolicitudInput) {
  return run(async () => {
    const me = await requireSession()
    const folios = await prisma.request.findMany({ select: { folio: true } })
    const created = await prisma.request.create({
      data: {
        folio: nextFolio(
          folios.map((f) => f.folio),
          "SOL",
          3,
          new Date().getFullYear(),
        ),
        channel: input.medio.trim(),
        description: nullIfEmpty(input.descripcion),
        response: nullIfEmpty(input.respuesta),
        status: ESTADO_A_DB[input.estado],
        eventId: input.eventoId,
        createdBy: me.id,
      },
      select: { id: true, folio: true },
    })
    return created
  })
}

export async function editarSolicitud(id: string, input: SolicitudInput) {
  return run(async () => {
    await requireSession()
    await prisma.$transaction(async (tx) => {
      await tx.request.update({
        where: { id },
        data: {
          channel: input.medio.trim(),
          description: nullIfEmpty(input.descripcion),
          response: nullIfEmpty(input.respuesta),
          status: ESTADO_A_DB[input.estado],
          eventId: input.eventoId,
        },
      })
      // La entrega hereda el evento de su solicitud: si la solicitud cambia de
      // evento, su entrega debe seguirla o queda apuntando al evento anterior.
      await tx.delivery.updateMany({ where: { requestId: id }, data: { eventId: input.eventoId } })
    })
  })
}

/** Elimina la solicitud y, en cascada, su entrega (una entrega no existe sin solicitud). */
export async function eliminarSolicitud(id: string) {
  return run(async () => {
    await requireSession()
    await prisma.request.delete({ where: { id } })
  })
}

/* ============================================================ EVENTOS */

export type EventoInput = {
  tipoId: string
  fecha: string
  sector: string
  afectados: number
  instituciones: string
  acciones: string
}

export async function crearEvento(input: EventoInput, asociarSolicitudId?: string | null) {
  return run(async () => {
    const me = await requireSession()
    const folios = await prisma.event.findMany({ select: { folio: true } })
    return prisma.$transaction(async (tx) => {
      const ev = await tx.event.create({
        data: {
          folio: nextFolio(
            folios.map((f) => f.folio),
            "EV",
            3,
            new Date().getFullYear(),
          ),
          typeId: input.tipoId,
          date: parseDayUTC(input.fecha),
          sector: input.sector.trim(),
          affectedCount: input.afectados,
          institutions: input.instituciones.trim(),
          actions: input.acciones.trim(),
          createdBy: me.id,
        },
        select: { id: true, folio: true },
      })
      if (asociarSolicitudId) {
        await tx.request.update({ where: { id: asociarSolicitudId }, data: { eventId: ev.id } })
        await tx.delivery.updateMany({ where: { requestId: asociarSolicitudId }, data: { eventId: ev.id } })
      }
      return ev
    })
  })
}

export async function editarEvento(id: string, input: EventoInput) {
  return run(async () => {
    await requireSession()
    await prisma.event.update({
      where: { id },
      data: {
        typeId: input.tipoId,
        date: parseDayUTC(input.fecha),
        sector: input.sector.trim(),
        affectedCount: input.afectados,
        institutions: input.instituciones.trim(),
        actions: input.acciones.trim(),
      },
    })
  })
}

/**
 * Elimina el evento sin borrar sus dependientes: solicitudes y entregas quedan
 * registradas de forma independiente (eventId → null), tal como especifica el
 * modelo de dependencias del mockup. Prisma ya lo hace vía onDelete: SetNull.
 */
export async function eliminarEvento(id: string) {
  return run(async () => {
    await requireSession()
    await prisma.event.delete({ where: { id } })
  })
}

/* ============================================================ ENTREGAS */

export type EntregaInput = {
  solicitudId: string | null
  fecha: string
  direccion: string
  beneficiario: string
  contacto: string
  jv: string
  items: { insumoId: string; cantidad: number }[]
}

async function eventoDeSolicitud(solicitudId: string | null): Promise<string | null> {
  if (!solicitudId) return null
  const s = await prisma.request.findUnique({ where: { id: solicitudId }, select: { eventId: true } })
  return s?.eventId ?? null
}

export async function crearEntrega(input: EntregaInput) {
  return run(async () => {
    const me = await requireSession()
    if (input.items.length === 0) throw new Error("Agrega al menos un insumo con cantidad.")
    if (input.solicitudId) {
      const ocupada = await prisma.delivery.findUnique({ where: { requestId: input.solicitudId } })
      if (ocupada) throw new Error("Esa solicitud ya tiene una entrega registrada.")
    }
    const folios = await prisma.delivery.findMany({ select: { folio: true } })
    return prisma.delivery.create({
      data: {
        folio: nextFolio(
          folios.map((f) => f.folio),
          "ENT",
          4,
        ),
        requestId: input.solicitudId,
        eventId: await eventoDeSolicitud(input.solicitudId),
        date: parseDayUTC(input.fecha),
        address: input.direccion.trim(),
        beneficiary: input.beneficiario.trim(),
        contact: input.contacto.trim(),
        jv: input.jv.trim(),
        createdBy: me.id,
        items: { create: input.items.map((i) => ({ supplyId: i.insumoId, quantity: i.cantidad })) },
      },
      select: { id: true, folio: true },
    })
  })
}

export async function editarEntrega(id: string, input: EntregaInput) {
  return run(async () => {
    await requireSession()
    if (input.items.length === 0) throw new Error("Agrega al menos un insumo con cantidad.")
    if (input.solicitudId) {
      const ocupada = await prisma.delivery.findUnique({ where: { requestId: input.solicitudId } })
      if (ocupada && ocupada.id !== id) throw new Error("Esa solicitud ya tiene una entrega registrada.")
    }
    const eventId = await eventoDeSolicitud(input.solicitudId)
    await prisma.$transaction([
      prisma.deliveryItem.deleteMany({ where: { deliveryId: id } }),
      prisma.delivery.update({
        where: { id },
        data: {
          requestId: input.solicitudId,
          eventId,
          date: parseDayUTC(input.fecha),
          address: input.direccion.trim(),
          beneficiary: input.beneficiario.trim(),
          contact: input.contacto.trim(),
          jv: input.jv.trim(),
          items: { create: input.items.map((i) => ({ supplyId: i.insumoId, quantity: i.cantidad })) },
        },
      }),
    ])
  })
}

export async function eliminarEntrega(id: string) {
  return run(async () => {
    await requireSession()
    await prisma.delivery.delete({ where: { id } })
  })
}

/* ============================================================ INSUMOS */

export type InsumoInput = { tipo: string; unidad: string }

export async function crearInsumo(input: InsumoInput) {
  return run(async () => {
    const me = await requireSession()
    return prisma.supply.create({
      data: { type: input.tipo.trim(), unit: input.unidad, createdBy: me.id },
      select: { id: true },
    })
  })
}

export async function editarInsumo(id: string, input: InsumoInput) {
  return run(async () => {
    await requireSession()
    await prisma.supply.update({ where: { id }, data: { type: input.tipo.trim(), unit: input.unidad } })
  })
}

/** Bloqueado si el insumo está referenciado en alguna entrega. */
export async function eliminarInsumo(id: string) {
  return run(async () => {
    await requireSession()
    const usos = await prisma.deliveryItem.count({ where: { supplyId: id } })
    if (usos > 0) throw new Error(`El insumo está referenciado en ${usos} entrega${usos === 1 ? "" : "s"}.`)
    await prisma.supply.delete({ where: { id } })
  })
}
