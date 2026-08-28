"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/server/session"
import { borrarEvidencia, guardarEvidencia } from "@/server/storage"
import { parseDayUTC, run } from "./_shared"

/* ============================================================ ACCIONES ESTRATÉGICAS */

export type AccionInput = {
  numero: number
  anio: number
  titulo: string
  fechaInicio: string
  fechaTermino: string
  comoDesarrollar: string
  temas: string
}

export async function crearAccion(input: AccionInput) {
  return run(async () => {
    const me = await requireSession()
    const dup = await prisma.strategicAction.findFirst({ where: { year: input.anio, number: input.numero } })
    if (dup) throw new Error(`Ya existe una acción N°${input.numero} en ${input.anio}.`)
    return prisma.strategicAction.create({
      data: {
        number: input.numero,
        year: input.anio,
        title: input.titulo.trim(),
        startDate: parseDayUTC(input.fechaInicio),
        endDate: parseDayUTC(input.fechaTermino),
        implementation: input.comoDesarrollar.trim(),
        topics: input.temas.trim(),
        createdBy: me.id,
      },
      select: { id: true },
    })
  })
}

export async function editarAccion(id: string, input: AccionInput) {
  return run(async () => {
    await requireSession()
    const dup = await prisma.strategicAction.findFirst({
      where: { year: input.anio, number: input.numero, NOT: { id } },
    })
    if (dup) throw new Error(`Ya existe una acción N°${input.numero} en ${input.anio}.`)
    await prisma.strategicAction.update({
      where: { id },
      data: {
        number: input.numero,
        year: input.anio,
        title: input.titulo.trim(),
        startDate: parseDayUTC(input.fechaInicio),
        endDate: parseDayUTC(input.fechaTermino),
        implementation: input.comoDesarrollar.trim(),
        topics: input.temas.trim(),
      },
    })
  })
}

/** Bloqueado si la acción tiene actividades vinculadas (onDelete: Restrict). */
export async function eliminarAccion(id: string) {
  return run(async () => {
    await requireSession()
    const n = await prisma.activity.count({ where: { actionId: id } })
    if (n > 0) throw new Error(`La acción tiene ${n} actividad${n === 1 ? "" : "es"} vinculada${n === 1 ? "" : "s"}.`)
    await prisma.strategicAction.delete({ where: { id } })
  })
}

/* ============================================================ ACTIVIDADES */

export type ActividadInput = {
  accionId: string
  fecha: string
  direccion: string
  objetivo: string
  participantes: string
}

/**
 * Crea la actividad y adjunta la evidencia que venga en el FormData.
 *
 * Va como FormData porque los archivos no se pueden serializar en el payload
 * normal de una server action. Campo "archivos" (múltiple) + "datos" (JSON).
 */
export async function crearActividad(form: FormData) {
  return run(async () => {
    const me = await requireSession()
    const input = JSON.parse(String(form.get("datos"))) as ActividadInput
    const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0)
    const guardados = []
    for (const f of archivos) guardados.push(await guardarEvidencia(f))

    try {
      return await prisma.activity.create({
        data: {
          actionId: input.accionId,
          date: parseDayUTC(input.fecha),
          location: input.direccion.trim(),
          objective: input.objetivo.trim(),
          participants: input.participantes.trim(),
          createdBy: me.id,
          evidence: {
            create: guardados.map((g) => ({
              name: g.nombre,
              type: g.tipo,
              size: g.size,
              key: g.key,
              createdBy: me.id,
            })),
          },
        },
        select: { id: true },
      })
    } catch (e) {
      // Si la fila no se pudo crear, no dejamos huérfanos en disco.
      for (const g of guardados) await borrarEvidencia(g.key)
      throw e
    }
  })
}

export async function editarActividad(id: string, input: ActividadInput) {
  return run(async () => {
    await requireSession()
    await prisma.activity.update({
      where: { id },
      data: {
        actionId: input.accionId,
        date: parseDayUTC(input.fecha),
        location: input.direccion.trim(),
        objective: input.objetivo.trim(),
        participants: input.participantes.trim(),
      },
    })
  })
}

/** Elimina la actividad y, en cascada, su evidencia (filas + archivos). */
export async function eliminarActividad(id: string) {
  return run(async () => {
    await requireSession()
    const evs = await prisma.evidence.findMany({ where: { activityId: id }, select: { key: true } })
    await prisma.activity.delete({ where: { id } })
    for (const e of evs) await borrarEvidencia(e.key)
  })
}

/* ============================================================ EVIDENCIA */

/** Adjunta archivos a una actividad existente. FormData: "actividadId" + "archivos". */
export async function adjuntarEvidencia(form: FormData) {
  return run(async () => {
    const me = await requireSession()
    const actividadId = String(form.get("actividadId"))
    const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0)
    if (archivos.length === 0) throw new Error("No se seleccionó ningún archivo.")

    const guardados = []
    for (const f of archivos) guardados.push(await guardarEvidencia(f))

    try {
      await prisma.evidence.createMany({
        data: guardados.map((g) => ({
          activityId: actividadId,
          name: g.nombre,
          type: g.tipo,
          size: g.size,
          key: g.key,
          createdBy: me.id,
        })),
      })
    } catch (e) {
      for (const g of guardados) await borrarEvidencia(g.key)
      throw e
    }
    return guardados.length
  })
}

export async function eliminarEvidencia(id: string) {
  return run(async () => {
    await requireSession()
    const ev = await prisma.evidence.delete({ where: { id }, select: { key: true } })
    await borrarEvidencia(ev.key)
  })
}
