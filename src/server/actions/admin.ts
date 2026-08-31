"use server"

import { headers } from "next/headers"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/server/session"
import { run } from "./_shared"
import type { Rol } from "@/lib/types"

/* ============================================================ USUARIOS */

export type UsuarioInput = {
  nombre: string
  apellido: string
  correo: string
  rol: Rol
}

export async function crearUsuario(input: UsuarioInput & { password: string }) {
  return run(async () => {
    await requireAdmin()
    const res = await auth.api.createUser({
      body: {
        email: input.correo.trim().toLowerCase(),
        password: input.password,
        name: input.nombre.trim(),
        role: input.rol,
        data: { lastName: input.apellido.trim() },
      },
      headers: await headers(),
    })
    return { id: res.user.id }
  })
}

export async function editarUsuario(id: string, input: UsuarioInput) {
  return run(async () => {
    const me = await requireAdmin()
    // El nombre no pasa por el admin plugin; se escribe directo en la tabla.
    await prisma.user.update({
      where: { id },
      data: { name: input.nombre.trim(), lastName: input.apellido.trim() },
    })

    const actual = await prisma.user.findUniqueOrThrow({ where: { id }, select: { role: true } })
    const rolActual: Rol = actual.role === "admin" ? "admin" : "regular"
    if (rolActual !== input.rol) {
      if (id === me.id) throw new Error("No puedes cambiar tu propio rol.")
      await auth.api.setRole({ body: { userId: id, role: input.rol }, headers: await headers() })
    }
  })
}

/** Activar / desactivar la cuenta. Desactivar = ban del plugin admin. */
export async function cambiarEstadoUsuario(id: string, activo: boolean) {
  return run(async () => {
    const me = await requireAdmin()
    if (id === me.id && !activo) throw new Error("No puedes desactivar tu propia cuenta.")
    const h = await headers()
    if (activo) await auth.api.unbanUser({ body: { userId: id }, headers: h })
    else await auth.api.banUser({ body: { userId: id }, headers: h })
  })
}

/**
 * Elimina definitivamente una cuenta. Solo cuentas inactivas y sin historial:
 * las relaciones `creator` del schema son `onDelete: Restrict`, así que se cuenta
 * antes para devolver un mensaje claro en vez del P2003 genérico.
 */
export async function eliminarUsuario(id: string) {
  return run(async () => {
    const me = await requireAdmin()
    if (id === me.id) throw new Error("No puedes eliminar tu propia cuenta.")

    const u = await prisma.user.findUniqueOrThrow({ where: { id }, select: { banned: true } })
    if (!u.banned) throw new Error("Solo se pueden eliminar cuentas inactivas. Desactívala primero.")

    const counts = await Promise.all([
      prisma.eventType.count({ where: { createdBy: id } }),
      prisma.supply.count({ where: { createdBy: id } }),
      prisma.event.count({ where: { createdBy: id } }),
      prisma.request.count({ where: { createdBy: id } }),
      prisma.delivery.count({ where: { createdBy: id } }),
      prisma.strategicAction.count({ where: { createdBy: id } }),
      prisma.activity.count({ where: { createdBy: id } }),
      prisma.evidence.count({ where: { createdBy: id } }),
    ])
    const n = counts.reduce((a, b) => a + b, 0)
    if (n > 0)
      throw new Error(
        `La cuenta tiene ${n} registro${n === 1 ? "" : "s"} en el historial. Solo puede permanecer inactiva.`,
      )

    await auth.api.removeUser({ body: { userId: id }, headers: await headers() })
  })
}

export async function restablecerPassword(id: string, password: string) {
  return run(async () => {
    await requireAdmin()
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.")
    await auth.api.setUserPassword({
      body: { userId: id, newPassword: password },
      headers: await headers(),
    })
  })
}

/* ============================================================ TIPOS DE EVENTO */

export async function crearTipoEvento(nombre: string) {
  return run(async () => {
    const me = await requireAdmin()
    const n = nombre.trim()
    if (!n) throw new Error("Indica el nombre del tipo de evento.")
    const dup = await prisma.eventType.findFirst({ where: { name: { equals: n, mode: "insensitive" } } })
    if (dup) throw new Error("Ya existe un tipo de evento con ese nombre.")
    return prisma.eventType.create({ data: { name: n, createdBy: me.id }, select: { id: true } })
  })
}

export async function editarTipoEvento(id: string, nombre: string) {
  return run(async () => {
    await requireAdmin()
    const n = nombre.trim()
    if (!n) throw new Error("Indica el nombre del tipo de evento.")
    const dup = await prisma.eventType.findFirst({
      where: { name: { equals: n, mode: "insensitive" }, NOT: { id } },
    })
    if (dup) throw new Error("Ya existe un tipo de evento con ese nombre.")
    await prisma.eventType.update({ where: { id }, data: { name: n } })
  })
}

/** Bloqueado si el tipo está en uso por algún evento (onDelete: Restrict). */
export async function eliminarTipoEvento(id: string) {
  return run(async () => {
    await requireAdmin()
    const n = await prisma.event.count({ where: { typeId: id } })
    if (n > 0) throw new Error(`El tipo está en uso por ${n} evento${n === 1 ? "" : "s"}.`)
    await prisma.eventType.delete({ where: { id } })
  })
}
